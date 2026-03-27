import os
import json
import joblib
import datetime
import numpy as np
import pandas as pd
import pg8000.native
import lightgbm as lgb
import redis
from sklearn.metrics import roc_auc_score, accuracy_score
from dotenv import load_dotenv

load_dotenv()

# 1. Connect to DB
def get_db_connection():
    return pg8000.native.Connection(
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASS', '5432'),
        host=os.environ.get('DB_HOST', 'localhost'),
        port=int(os.environ.get('DB_PORT', 5432)),
        database=os.environ.get('DB_NAME', 'seams_db')
    )

# 2. Fetch Data
def fetch_data():
    conn = get_db_connection()
    
    # We need embeddings to calculate true semantic similarity
    events_query = "SELECT id, embedding, global_event_score, date FROM events WHERE status='approved'"
    events_rows = conn.run(events_query)
    
    embeddings = {}
    event_meta = {}
    for row in events_rows:
        ev_id, emb_json, pop, e_date = row
        pop = float(pop) if pop is not None else 0.5
        event_meta[ev_id] = {'pop': min(pop / 5.0, 1.0), 'date': e_date}
        if emb_json:
            try:
                vec = json.loads(emb_json) if isinstance(emb_json, str) else emb_json
                if len(vec) == 384:
                    embeddings[ev_id] = np.array(vec, dtype=np.float32)
            except: pass

    # Fetch user activity to build user embeddings dynamically
    ua_query = "SELECT user_id, event_id FROM user_activity"
    ua_rows = conn.run(ua_query)
    user_interacted = {}
    for uid, eid in ua_rows:
        if uid not in user_interacted:
            user_interacted[uid] = []
        user_interacted[uid].append(eid)
        
    user_embeddings = {}
    for uid, eids in user_interacted.items():
        vecs = [embeddings[eid] for eid in eids if eid in embeddings]
        if vecs:
            user_embeddings[uid] = np.mean(vecs, axis=0)
            user_embeddings[uid] /= np.linalg.norm(user_embeddings[uid])

    # Fetch logs
    query = """
    SELECT user_id, event_id, MAX(CASE WHEN action = 'clicked' THEN 1 ELSE 0 END) as clicked, MAX(timestamp) as interaction_time
    FROM recommendation_logs
    GROUP BY user_id, event_id
    """
    logs = conn.run(query)
    conn.close()
    
    return logs, embeddings, user_embeddings, event_meta

def compute_recency(event_date):
    if not event_date: return 0.0
    now = datetime.datetime.now(datetime.timezone.utc)
    if event_date.tzinfo is None:
        event_date = event_date.replace(tzinfo=datetime.timezone.utc)
    age_days = (now - event_date).total_seconds() / (86400)
    if age_days < 0: age_days = 0
    return 1.0 / (1.0 + age_days)

def train():
    print("Fetching training data for Meta-Ranker from Postgres...")
    try:
        logs, embeddings, user_embeddings, event_meta = fetch_data()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return

    base_dir = os.path.dirname(__file__)
    model_path = os.path.join(base_dir, 'meta_ranker.pkl')
    
    features = []
    labels = []
    
    base_model_path = os.path.join(base_dir, 'ranking_model.pkl')
    base_model = None
    if os.path.exists(base_model_path):
        base_model = joblib.load(base_model_path)
    else:
        print("Warning: Base Model ranking_model.pkl not found! Will default ml_score to 0.")
        
    from redis_client import get_redis_client
    redis_client = get_redis_client(decode_responses=True)
    
    for log in logs:
        uid, eid, clicked, _ = log
        if eid not in event_meta: continue
        
        # Pull Feature Store values transparently instead of complex joins
        u_feat = redis_client.hgetall(f"user:features:{uid}") or {}
        e_feat = redis_client.hgetall(f"event:features:{eid}") or {}
        
        # 1. Semantic Sim
        sem_sim = 0.0
        if uid in user_embeddings and eid in embeddings:
            u_vec = user_embeddings[uid]
            e_vec = embeddings[eid]
            sem_sim = float(np.dot(u_vec, e_vec) / (np.linalg.norm(u_vec) * np.linalg.norm(e_vec)))
            
        # 2. ML Score
        ml_score = 0.5
        if base_model:
            # Reconstruct dummy input matching required historical base inputs
            pop_score = float(e_feat.get('popularity', event_meta[eid]['pop']))
            try:
                X_dummy = pd.DataFrame([[sem_sim, 0.5, pop_score, 1, 12, 3, 1, 5, 24.0]], 
                            columns=['tag_sim', 'tag_weight', 'popularity', 'segment', 'time_of_day', 'day_of_week', 'freshness_bucket', 'user_freq', 'session_recency'])
                preds = base_model.predict_proba(X_dummy)[0]
                if len(preds) > 1:
                    ml_score = float(preds[1])
                else: 
                    ml_score = float(preds[0]) # single class fallback
            except: pass
            
        # 3. Popularity
        pop = float(e_feat.get('popularity', event_meta[eid]['pop']))
        
        # 4. Recency
        recency = compute_recency(event_meta[eid]['date'])
        
        features.append([sem_sim, ml_score, pop, recency])
        labels.append(clicked)

    feature_cols = ['semantic_sim', 'ml_score', 'popularity', 'recency']
    X = pd.DataFrame(features, columns=feature_cols)
    y = np.array(labels)
    
    if len(X) < 50:
        print(f"Not enough data ({len(X)} logs). Creating dummy meta model fallback.")
        model = lgb.LGBMClassifier()
        X_dummy = pd.DataFrame([[0]*4, [1]*4], columns=feature_cols)
        model.fit(X_dummy, [0, 1])
        joblib.dump(model, model_path)
        return
        
    print(f"Training Meta-Ranker LightGBM on {len(X)} rows...")
    model = lgb.LGBMClassifier(n_estimators=100, learning_rate=0.05, class_weight='balanced')
    model.fit(X, y)
    joblib.dump(model, model_path)
    
    try:
        y_pred = model.predict_proba(X)[:, 1]
        auc = roc_auc_score(y, y_pred)
        print(f"Meta-Ranker Training Complete! ROC-AUC Score: {auc:.4f}")
    except:
        print("Meta-Ranker Training Complete! (single class variance fallback)")

if __name__ == '__main__':
    train()
