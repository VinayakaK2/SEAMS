import os
import faiss
import json
import numpy as np
import threading
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, jsonify
from flask_cors import CORS
import pg8000.native
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

N_SHARDS = 4
DIMENSIONS = 384
INDICES_DIR = os.path.join(os.path.dirname(__file__), 'indices')
os.makedirs(INDICES_DIR, exist_ok=True)

shards = [None] * N_SHARDS
loaded_ids = set()
indices_lock = threading.Lock()

def get_shard_index(event_id: int) -> int:
    return hash(event_id) % N_SHARDS

def load_indices():
    global shards, loaded_ids
    
    # 1. Load loaded_ids state
    state_file = os.path.join(INDICES_DIR, 'loaded_ids.json')
    if os.path.exists(state_file):
        try:
            with open(state_file, 'r') as f:
                loaded_ids = set(json.load(f))
            print(f"[VECTOR] Loaded {len(loaded_ids)} tracked IDs from disk state.")
        except Exception as e:
            print(f"[VECTOR] Warning: Failed to load state file: {e}")

    # 2. Load or Build FAISS shards
    for i in range(N_SHARDS):
        index_path = os.path.join(INDICES_DIR, f'shard_{i}.index')
        if os.path.exists(index_path):
            try:
                shards[i] = faiss.read_index(index_path)
                print(f"[VECTOR] Shard {i}: Loaded from disk. (size: {shards[i].ntotal})")
            except Exception as e:
                print(f"[VECTOR] Shard {i}: Error loading. Creating new. {e}")
                shards[i] = faiss.IndexIDMap(faiss.IndexFlatIP(DIMENSIONS))
        else:
            print(f"[VECTOR] Shard {i}: Created new empty shard.")
            shards[i] = faiss.IndexIDMap(faiss.IndexFlatIP(DIMENSIONS))

    # 3. Incremental DB Fetching
    print("[VECTOR] Fetching missing embeddings from DB...")
    missing_count = 0
    try:
        conn = pg8000.native.Connection(
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASS', '5432'),
            host=os.environ.get('DB_HOST', 'localhost'),
            port=int(os.environ.get('DB_PORT', 5432)),
            database=os.environ.get('DB_NAME', 'seams_db')
        )
        # Fetch all approved event IDs
        rows = conn.run("SELECT id, embedding FROM events WHERE embedding IS NOT NULL AND status='approved'")
        
        # Group new embeddings by shard to do batch appending
        new_by_shard = {i: {"mats": [], "ids": []} for i in range(N_SHARDS)}
        
        for row in rows:
            ev_id, emb_json = row
            if ev_id in loaded_ids: continue
            
            try:
                vec = json.loads(emb_json) if isinstance(emb_json, str) else emb_json
                if len(vec) == DIMENSIONS:
                    s_idx = get_shard_index(ev_id)
                    new_by_shard[s_idx]["mats"].append(vec)
                    new_by_shard[s_idx]["ids"].append(ev_id)
                    loaded_ids.add(ev_id)
                    missing_count += 1
            except: pass
            
        conn.close()
        
        # 4. Integrate into shards natively
        if missing_count > 0:
            for i in range(N_SHARDS):
                if new_by_shard[i]["ids"]:
                    m = np.array(new_by_shard[i]["mats"], dtype=np.float32)
                    faiss.normalize_L2(m)
                    ids_arr = np.array(new_by_shard[i]["ids"], dtype=np.int64)
                    shards[i].add_with_ids(m, ids_arr)
            save_state_to_disk()
            print(f"[VECTOR] Incrementally added {missing_count} newly missing vectors to RAM & Disk!")
        else:
            print("[VECTOR] Index is fully up to date with the Database.")

    except Exception as e:
        print(f"[VECTOR] Failed incremental DB synchronization: {e}")

def save_state_to_disk():
    with indices_lock:
        try:
            for i in range(N_SHARDS):
                index_path = os.path.join(INDICES_DIR, f'shard_{i}.index')
                faiss.write_index(shards[i], index_path)
            
            state_file = os.path.join(INDICES_DIR, 'loaded_ids.json')
            with open(state_file, 'w') as f:
                json.dump(list(loaded_ids), f)
        except Exception as e:
            print(f"[VECTOR] Error writing to disk: {e}")


@app.route('/vector/search', methods=['POST'])
def search_vectors():
    data = request.json
    if not data or 'user_embedding' not in data:
        return jsonify({"status": "error", "message": "Missing user_embedding"}), 400

    top_n = int(data.get('top_n', 100))
    user_vec = np.array([data['user_embedding']], dtype=np.float32)
    faiss.normalize_L2(user_vec)

    results = []

    def search_shard(shard):
        with indices_lock: # thread-safe if required, though faiss searches are mostly read-safe
            return shard.search(user_vec, top_n)

    # Parallel execute across all active shards
    try:
        futures = []
        with ThreadPoolExecutor(max_workers=N_SHARDS) as executor:
            for i in range(N_SHARDS):
                futures.append(executor.submit(search_shard, shards[i]))
                
        # Aggregate logic
        for f in futures:
            scores, ids = f.result()
            for k in range(len(ids[0])):
                if ids[0][k] != -1:
                    results.append({"id": int(ids[0][k]), "score": float(scores[0][k])})
                    
        # Sort universally desc
        results.sort(key=lambda x: x['score'], reverse=True)
        return jsonify({"status": "success", "candidates": results[:top_n]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/vector/add', methods=['POST'])
def add_vector():
    data = request.json
    if not data or 'id' not in data or 'embedding' not in data:
        return jsonify({"status": "error", "message": "Missing id/embedding"}), 400

    ev_id = int(data['id'])
    vec = np.array([data['embedding']], dtype=np.float32)
    faiss.normalize_L2(vec)

    s_idx = get_shard_index(ev_id)
    with indices_lock:
        if ev_id in loaded_ids:
            shards[s_idx].remove_ids(np.array([ev_id], dtype=np.int64))
        
        shards[s_idx].add_with_ids(vec, np.array([ev_id], dtype=np.int64))
        loaded_ids.add(ev_id)
        
    # Lazy save 10% of time to prevent severe IO bottleneck on spam arrays, or just let DB sync safely
    import random
    if random.random() < 0.1:
        threading.Thread(target=save_state_to_disk).start()

    return jsonify({"status": "success", "shard": s_idx})


@app.route('/vector/remove', methods=['POST'])
def remove_vector():
    data = request.json
    if not data or 'id' not in data:
        return jsonify({"status": "error", "message": "Missing id"}), 400

    ev_id = int(data['id'])
    s_idx = get_shard_index(ev_id)
    
    with indices_lock:
        if ev_id in loaded_ids:
            try:
                shards[s_idx].remove_ids(np.array([ev_id], dtype=np.int64))
                loaded_ids.remove(ev_id)
                threading.Thread(target=save_state_to_disk).start() # ensure delete is reflected
                return jsonify({"status": "success", "message": f"Removed from shard {s_idx}"})
            except Exception as e:
                return jsonify({"status": "error", "message": str(e)}), 500
        else:
            return jsonify({"status": "success", "message": "Already removed/not-present"})
            

if __name__ == '__main__':
    load_indices()
    port = int(os.environ.get('VECTOR_PORT', 5002))
    print(f"[VECTOR_SERVICE] Booting Scalable Vector Shard Engine on Port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
