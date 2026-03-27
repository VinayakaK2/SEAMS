import os
import re
import math
import string
import json
import joblib
import numpy as np
import pandas as pd
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

import time
from prometheus_client import Counter, Histogram, generate_latest

REQUEST_TIME = Histogram('ml_request_processing_seconds', 'Time spent processing request natively', ['endpoint'])
ML_FALLBACKS = Counter('ml_fallbacks_total_python', 'Fallbacks forced inside ML script intrinsically', ['reason'])

@app.before_request
def before_request_metric_start():
    request.start_time = time.time()

@app.after_request
def after_request_metric_end(response):
    req_time = time.time() - getattr(request, 'start_time', time.time())
    REQUEST_TIME.labels(endpoint=request.path).observe(req_time)
    return response

@app.route('/metrics')
def expose_metrics():
    return generate_latest(), 200, {'Content-Type': 'text/plain; version=0.0.4'}

# ── V6 LightGBM Ranking Model ──────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'ranking_model.pkl')
ranker_model = None
if os.path.exists(MODEL_PATH):
    try:
        ranker_model = joblib.load(MODEL_PATH)
        print("V6 Ranking Model loaded successfully.")
    except Exception as e:
        print(f"Failed to load V6 Ranking Model: {e}")
else:
    print("V6 Ranking Model not found. /ml/rank will fallback.")

# ── V10 Meta Ranker Model ──────────────────────────────────────────────────────
META_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'meta_ranker.pkl')
meta_ranker_model = None
if os.path.exists(META_MODEL_PATH):
    try:
        meta_ranker_model = joblib.load(META_MODEL_PATH)
        print("V10 Meta-Ranker Model loaded successfully.")
    except Exception as e:
        print(f"Failed to load V10 Meta-Ranker Model: {e}")
else:
    print("V10 Meta-Ranker Model not found. /ml/meta-rank will return errors.")

# ── Sentence-Transformer Embedding Model ──────────────────────────────────────
# Loaded once at startup, shared by all embedding endpoints.
EMBEDDING_MODEL_NAME = os.environ.get('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
embedding_model = None
try:
    from sentence_transformers import SentenceTransformer
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    print(f"[EMBED] Sentence-Transformer loaded: {EMBEDDING_MODEL_NAME}")
except Exception as _embed_load_err:
    print("[EMBED] Semantic endpoints will return 503. Ranking endpoints unaffected.")


# Constants
VECTOR_SERVICE_URL = os.environ.get('VECTOR_SERVICE_URL', 'http://127.0.0.1:5002')


def _build_event_text(title: str, description: str, tags) -> str:
    """Combine event fields into a single embedding input string."""
    tag_str = ''
    if tags:
        try:
            tag_list = tags if isinstance(tags, list) else json.loads(tags)
            tag_str = ' '.join(tag_list)
        except Exception:
            tag_str = str(tags)
    return ' '.join(p.strip() for p in [title or '', description or '', tag_str] if p.strip())


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two normalized (or unnormalized) vectors."""
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))

# Aggressively Expanded Dictionary for Tag Mapping (Semantic Option B fallback)
TAG_DICTIONARY = {
    # Core Tech & AI
    "ai": ["AI", "Machine Learning", "Deep Learning", "Artificial Intelligence", "Neural Networks"],
    "ml": ["AI", "Machine Learning", "Data Science", "Algorithm"],
    "dl": ["AI", "Deep Learning", "Neural Networks", "NLP", "Computer Vision"],
    "machine": ["AI", "Machine Learning"],
    "learning": ["AI", "Machine Learning"],
    "deep": ["AI", "Deep Learning"],
    "nlp": ["AI", "Data Science", "NLP", "Natural Language Processing"],
    "vision": ["AI", "Computer Vision", "Deep Learning"],
    "generative": ["AI", "Machine Learning", "Generative AI", "LLM"],
    "llm": ["AI", "Machine Learning", "Generative AI", "LLM", "NLP"],
    
    # Programming Languages
    "python": ["Python", "Programming", "Data Science", "Backend"],
    "java": ["Java", "Programming", "Backend"],
    "cpp": ["C++", "Programming", "Systems"],
    "c++": ["C++", "Programming", "Systems"],
    "c": ["C", "Programming", "Systems"],
    "r": ["Data Science", "R", "Analytics"],
    "javascript": ["Web Development", "JavaScript", "Frontend"],
    "js": ["Web Development", "JavaScript", "Frontend"],
    "typescript": ["Web Development", "TypeScript", "Frontend"],
    "ts": ["Web Development", "TypeScript", "Frontend"],
    "golang": ["Go", "Programming", "Backend", "Systems"],
    "go": ["Go", "Programming", "Backend", "Systems"],
    "rust": ["Rust", "Programming", "Systems"],
    "swift": ["Swift", "App Development", "iOS", "Mobile"],
    "kotlin": ["Kotlin", "App Development", "Android", "Mobile"],

    # Database & Data
    "sql": ["Database", "SQL", "Data Engineering"],
    "db": ["Database", "Infrastructure"],
    "nosql": ["Database", "NoSQL", "Big Data"],
    "mongodb": ["Database", "NoSQL", "MongoDB"],
    "postgres": ["Database", "SQL", "PostgreSQL"],
    "mysql": ["Database", "SQL", "MySQL"],
    "redis": ["Database", "Caching", "Redis", "NoSQL"],
    "data": ["Data Science", "Data Engineering", "Analytics"],
    "analytics": ["Data Science", "Analytics", "Business Intelligence"],
    "bigdata": ["Data Engineering", "Big Data", "Analytics", "Hadoop", "Spark"],
    
    # Web & App Frameworks
    "web": ["Web Development", "Frontend", "Backend"],
    "frontend": ["Web Development", "Frontend", "UI/UX Design"],
    "backend": ["Web Development", "Backend", "API", "Database"],
    "fullstack": ["Web Development", "Full Stack", "Frontend", "Backend"],
    "react": ["Web Development", "React", "Frontend", "JavaScript"],
    "node": ["Web Development", "Node.js", "Backend", "JavaScript"],
    "express": ["Web Development", "Backend", "Node.js", "API"],
    "angular": ["Web Development", "Frontend", "Angular", "TypeScript"],
    "vue": ["Web Development", "Frontend", "Vue.js", "JavaScript"],
    "html": ["Web Development", "Frontend", "HTML"],
    "css": ["Web Development", "Frontend", "CSS", "UI/UX Design"],
    "app": ["App Development", "Mobile"],
    "mobile": ["App Development", "Mobile", "UI/UX Design"],
    "flutter": ["App Development", "Flutter", "Mobile", "Cross-Platform"],
    "android": ["App Development", "Android", "Mobile", "Java", "Kotlin"],
    "ios": ["App Development", "iOS", "Mobile", "Swift"],
    "reactnative": ["App Development", "Mobile", "Cross-Platform", "React"],

    # Infrastructure, Devops, & Cloud
    "cloud": ["Cloud Computing", "AWS", "Azure", "GCP", "Infrastructure"],
    "aws": ["Cloud Computing", "AWS", "Infrastructure", "Amazon Web Services"],
    "azure": ["Cloud Computing", "Azure", "Infrastructure", "Microsoft"],
    "gcp": ["Cloud Computing", "GCP", "Infrastructure", "Google Cloud"],
    "devops": ["DevOps", "Infrastructure", "CI/CD", "Automation"],
    "docker": ["DevOps", "Docker", "Containers", "Infrastructure"],
    "kubernetes": ["DevOps", "Kubernetes", "K8s", "Containers", "Infrastructure"],
    "k8s": ["DevOps", "Kubernetes", "K8s", "Containers", "Infrastructure"],
    "linux": ["Systems", "Linux", "OS", "Infrastructure"],
    "serverless": ["Cloud Computing", "AWS", "Serverless", "Architecture"],
    "api": ["Web Development", "Backend", "API", "Architecture"],
    "microservices": ["Architecture", "Backend", "Cloud Computing", "Microservices"],

    # Security
    "security": ["Cybersecurity", "Security", "Infosec"],
    "cybersec": ["Cybersecurity", "Security", "Infosec"],
    "cybersecurity": ["Cybersecurity", "Security", "Infosec"],
    "hacking": ["Cybersecurity", "Ethical Hacking", "Security"],
    "crypto": ["Cryptography", "Security", "Blockchain", "Web3"],
    "blockchain": ["Web3", "Blockchain", "Crypto", "Decentralization"],
    "web3": ["Web3", "Blockchain", "Crypto", "Decentralization"],

    # Domains & Activities
    "design": ["UI/UX Design", "Design", "Product"],
    "ui": ["UI/UX Design", "Design", "Frontend"],
    "ux": ["UI/UX Design", "Design", "Product", "Frontend"],
    "figma": ["UI/UX Design", "Design", "Figma", "Tools"],
    "coding": ["Programming", "Coding", "Software Engineering"],
    "programming": ["Programming", "Coding", "Software Engineering"],
    "hackathon": ["Hackathon", "Competition", "Coding", "Event"],
    "competition": ["Competition", "Tournament", "Event"],
    "trading": ["Finance", "Trading", "Stocks", "Fintech"],
    "stocks": ["Finance", "Trading", "Stocks", "Fintech"],
    "finance": ["Finance", "Fintech", "Business"],
    "marketing": ["Business", "Marketing", "Growth", "Sales"],
    "sales": ["Business", "Sales", "Marketing"],
    "entrepreneurship": ["Business", "Entrepreneurship", "Startup", "Leadership"],
    "startup": ["Business", "Entrepreneurship", "Startup", "Venture", "Innovation"],
    "business": ["Business", "Management", "Strategy"],
    "management": ["Business", "Management", "Leadership"],
    "leadership": ["Leadership", "Business", "Management"],
    "workshop": ["Workshop", "Education", "Hands-on", "Training"],
    "seminar": ["Seminar", "Education", "Talk", "Lecture"],
    "talk": ["Seminar", "Education", "Tech Talk", "Presentation"],
    "webinar": ["Webinar", "Education", "Online Event"],
    "networking": ["Networking", "Event", "Community", "Meetup"],
    "meetup": ["Networking", "Event", "Community", "Meetup"],
    "open": ["Open Source", "Community"],
    "source": ["Open Source", "Community"],
    "opensource": ["Open Source", "Community", "GitHub"],
}

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at", 
    "from", "by", "for", "with", "about", "against", "between", "into", "through", 
    "during", "before", "after", "above", "below", "to", "up", "down", "in", "out", 
    "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", 
    "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", 
    "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", 
    "will", "just", "don", "should", "now", "is", "are", "was", "were", "be", "been", 
    "being", "have", "has", "had", "having", "do", "does", "did", "doing", "this", "that", 
    "these", "those", "am", "it", "they", "them", "their", "theirs", "themselves", "what", 
    "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", 
    "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing"
}

def preprocess_text(text):
    if not text:
        return ""
    # Lowercase
    text = text.lower()
    # Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    # Remove stopwords
    words = text.split()
    words = [w for w in words if w not in STOPWORDS and len(w) > 1]
    return " ".join(words)

def extract_keywords(title, description, top_n=8):
    """
    Stateless Semantic Keyword Extraction via TF analysis
    """
    combined_text = f"{title} {title} {description}" # Weight title heavier
    clean_text = preprocess_text(combined_text)
    
    if not clean_text:
        return []
        
    words = clean_text.split()
    word_freq = {}
    
    # Count Bi-grams and Uni-grams for better context
    for i in range(len(words) - 1):
        bigram = f"{words[i]}{words[i+1]}" # No space to match keys like "machinelearning"
        if bigram in TAG_DICTIONARY:
            word_freq[bigram] = word_freq.get(bigram, 0) + 3 # Heavily weight known bi-grams
            
    for w in words:
        word_freq[w] = word_freq.get(w, 0) + 1
        # Give a boost if word is in our semantic dictionary
        if w in TAG_DICTIONARY:
            word_freq[w] += 1
            
    sorted_words = sorted(list(word_freq.items()), key=lambda x: x[1], reverse=True)
    return [w[0] for w in sorted_words[:top_n]]

def map_to_tags(keywords, title, description):
    generated_tags = set()
    
    # 1. Dictionary Mapping based on extracted keywords
    for kw in keywords:
        if kw in TAG_DICTIONARY:
            generated_tags.update(TAG_DICTIONARY[kw])
            
    # 2. Rule-based exact matches on full text (for missing edge cases)
    # E.g., if bi-grams weren't caught as keywords but exist in text
    full_text = preprocess_text(f"{title} {description}").lower()
    full_text_no_space = full_text.replace(" ", "")
    
    for key, tags in list(TAG_DICTIONARY.items()):
        # Check standard word boundary match
        if re.search(r'\b' + re.escape(key) + r'\b', full_text):
            generated_tags.update(tags)
        # Check without spaces (e.g., "machine learning" matching "machinelearning" key)
        elif len(key) > 4 and key in full_text_no_space:
             generated_tags.update(tags)
             
    result = sorted(list(generated_tags))
    
    # Ensure reasonable tag limit while allowing more semantic depth than V2
    return list(result)[:8] 

@app.route('/ml/generate-tags', methods=['POST'])
def generate_tags_api():
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({"error": "Missing title"}), 400
    
    title = data.get('title', '')
    description = data.get('description', '')
    
    keywords = extract_keywords(title, description)
    tags = map_to_tags(keywords, title, description)
    
    # Guaranteed tags if none found
    if not tags:
        tags = ["General", "Event"]
        
    return jsonify({
        "keywords": keywords,
        "tags": tags
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "seams-ml-v3", "mode": "stateless"})

# ======================================================================
# V7: LightGBM Ranking Endpoint
# ======================================================================

def _compute_v7_features(user_segment, candidate):
    # This must match train_ranker.py feature order:
    # 'tag_sim', 'tag_weight', 'popularity', 'segment', 'time_of_day', 'day_of_week', 'freshness_bucket', 'user_freq', 'session_recency'
    
    sim_score = float(candidate.get('tag_sim', 0.0))
    weight_score = float(candidate.get('tag_weight', 0.0))
    pop = float(candidate.get('global_event_score', 0.5))
    pop = min(pop / 5.0, 1.0)
    
    time_of_day = int(candidate.get('time_of_day', 12))
    day_of_week = int(candidate.get('day_of_week', 0))
    freshness = int(candidate.get('freshness_bucket', 1))
    user_freq = int(candidate.get('user_freq', 0))
    session_recency = float(candidate.get('session_recency', 100.0))
    
    return [sim_score, weight_score, pop, user_segment, time_of_day, day_of_week, freshness, user_freq, session_recency]

@app.route('/ml/rank', methods=['POST'])
def rank_candidates():
    if not ranker_model:
        return jsonify({"status": "error", "message": "Model not loaded"}), 503
        
    data = request.json
    if not data or 'candidates' not in data or 'segment' not in data:
        return jsonify({"status": "error", "message": "Missing candidates or segment"}), 400
        
    segment_str = data['segment']
    user_segment = 0
    if segment_str == 'casual': user_segment = 1
    elif segment_str == 'power': user_segment = 2
    
    candidates = data['candidates']
    if not candidates:
        return jsonify({"status": "success", "ranked": []})
        
    # Build feature matrix
    X_pred = []
    for cand in candidates:
        features = _compute_v7_features(user_segment, cand)
        X_pred.append(features)
        
    cols = ['tag_sim', 'tag_weight', 'popularity', 'segment', 'time_of_day', 'day_of_week', 'freshness_bucket', 'user_freq', 'session_recency']
    X_df = pd.DataFrame(X_pred, columns=cols)
    try:
        # P(click=1)
        probs = ranker_model.predict_proba(X_df)[:, 1]
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
        
    # Attach scores and sort
    results = []
    for i, prob in enumerate(probs):
        cand = candidates[i]
        results.append({
            "event_id": cand['event_id'],
            "v7_score": float(prob)
        })
        
    results.sort(key=lambda x: x['v7_score'], reverse=True)
    
    return jsonify({
        "status": "success",
        "ranked": results
    })


@app.route('/ml/meta-rank', methods=['POST'])
def meta_rank():
    """
    V10 Adaptive Weight Meta-Ranker.
    Body:
    {
      "candidates": [
         { "event_id": 1, "semantic_sim": 0.82, "ml_score": 0.77, "popularity": 0.5, "recency": 0.9 },
         ...
      ]
    }
    """
    if not meta_ranker_model:
        return jsonify({"status": "error", "message": "Meta-Ranker model not loaded"}), 503

    data = request.json
    if not data or 'candidates' not in data:
        return jsonify({"status": "error", "message": "Missing candidates"}), 400

    candidates = data['candidates']
    if not candidates:
        return jsonify({"status": "success", "ranked": []})

    X_pred = []
    for cand in candidates:
        sem_sim = float(cand.get('semantic_sim', 0.0))
        ml_score = float(cand.get('ml_score', 0.5))
        pop = float(cand.get('popularity', 0.5))
        rec = float(cand.get('recency', 0.0))
        X_pred.append([sem_sim, ml_score, pop, rec])

    cols = ['semantic_sim', 'ml_score', 'popularity', 'recency']
    X_df = pd.DataFrame(X_pred, columns=cols)

    try:
        probs = meta_ranker_model.predict_proba(X_df)[:, 1]
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

    results = []
    for i, prob in enumerate(probs):
        results.append({
            "event_id": candidates[i]['event_id'],
            "meta_score": float(prob)
        })

    results.sort(key=lambda x: x['meta_score'], reverse=True)

    return jsonify({
        "status": "success",
        "ranked": results
    })


# ======================================================================
# V9 Hybrid Semantic: Embedding Endpoints
# ======================================================================

@app.route('/ml/embed/event', methods=['POST'])
def embed_event():
    """
    Generate a 384-dim embedding for a single event.
    Body: { "title": str, "description": str, "tags": list|str }
    Returns: { "embedding": float[384] }
    """
    if not embedding_model:
        return jsonify({"status": "error", "message": "Embedding model not available"}), 503

    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Missing request body"}), 400

    title       = data.get('title', '')
    description = data.get('description', '')
    tags        = data.get('tags', [])
    event_text  = _build_event_text(title, description, tags)

    if not event_text.strip():
        return jsonify({"status": "error", "message": "No text content to embed"}), 400

    try:
        vec = embedding_model.encode(event_text, normalize_embeddings=True)
        # V11 Distribute: Push vector directly to Vector Service DB
        event_id = data.get('id')
        if event_id:
            try:
                requests.post(f"{VECTOR_SERVICE_URL}/vector/add", json={
                    "id": event_id,
                    "embedding": vec.tolist()
                }, timeout=2)
                print(f"[VECTOR] Pushed {event_id} embedding to Sharded Vector Service.")
            except Exception as ve:
                print(f"[VECTOR] Failed to sync {event_id} to Vector Service: {ve}")

        return jsonify({"status": "success", "embedding": vec.tolist()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/ml/embed/user', methods=['POST'])
def embed_user():
    """
    Build a user embedding by averaging a list of event embeddings.
    Body: { "embeddings": float[N][384] }
    Returns: { "embedding": float[384] }
    """
    if not embedding_model:
        return jsonify({"status": "error", "message": "Embedding model not available"}), 503

    data = request.get_json()
    if not data or 'embeddings' not in data:
        return jsonify({"status": "error", "message": "Missing embeddings array"}), 400

    raw = data['embeddings']
    if not raw or len(raw) == 0:
        return jsonify({"status": "error", "message": "Empty embeddings list"}), 400

    try:
        matrix = np.array(raw, dtype=np.float32)  # (N, 384)
        user_vec = matrix.mean(axis=0)
        # Re-normalize so cosine similarity comparisons remain valid
        norm = np.linalg.norm(user_vec)
        if norm > 0:
            user_vec = user_vec / norm
        return jsonify({"status": "success", "embedding": user_vec.tolist()})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/ml/embed/update-user', methods=['POST'])
def update_user_embedding():
    """
    Real-time Exponential Moving Average (EMA) Update.
    Body: { "userId": 1, "eventId": 50, "action": "click" }
    """
    data = request.get_json()
    if not data or 'userId' not in data or 'eventId' not in data:
        return jsonify({"status": "error", "message": "Missing user or event ID"}), 400

    u_id = data['userId']
    e_id = data['eventId']
    action = data.get('action', 'view')
    timestamp = data.get('timestamp', int(time.time() * 1000))

    try:
        import pg8000.native
        from redis_client import get_redis_client
        r = get_redis_client(decode_responses=False)
        
        # 1. Get Event Embedding explicitly
        conn = pg8000.native.Connection(
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASS', '5432'),
            host=os.environ.get('DB_HOST', 'localhost'),
            port=int(os.environ.get('DB_PORT', 5432)),
            database=os.environ.get('DB_NAME', 'seams_db')
        )
        row = conn.run("SELECT embedding FROM events WHERE id=:id", id=e_id)
        conn.close()
        
        if not row or not row[0][0]:
            return jsonify({"status": "ignored", "message": "No event embedding exists to derive from"}), 200
            
        e_emb_str = row[0][0]
        e_vec = np.array(json.loads(e_emb_str) if isinstance(e_emb_str, str) else e_emb_str, dtype=np.float32)

        # 2. Assign action weights dynamically
        if action in ['like', 'register']:
            weight = 0.2
            direction = 1
        elif action in ['skip', 'dislike']:
            weight = 0.15
            direction = -1
        else:
            weight = 0.05
            direction = 1

        # 3. Get current underlying User Embedding state passively
        u_key = f"user:embedding:{u_id}"
        u_emb_str = r.get(u_key)
        
        if u_emb_str:
            u_vec = np.array(json.loads(u_emb_str.decode('utf-8') if isinstance(u_emb_str, bytes) else u_emb_str), dtype=np.float32)
            
            # Time Decay: Fetch last active date from Feature Store
            u_feat = r.hgetall(f"user:features:{u_id}")
            last_ts = 0
            if u_feat and b'last_active_date' in u_feat:
                try: 
                    last_ts = int(u_feat[b'last_active_date'].decode('utf-8'))
                except ValueError:
                    pass
            
            decay = 1.0
            if last_ts > 0:
                hours_passed = (timestamp - last_ts) / (1000 * 60 * 60)
                if hours_passed > 24:
                    # Decay mathematical momentum linearly by 5% every day dormant, floored at 0.4 
                    decay = max(0.4, 1.0 - (hours_passed / 480.0)) 
            
            u_vec_decayed = u_vec * decay
            
            # V12 -> Advanced Matrix Blending with action polarity
            new_vec = u_vec_decayed + (direction * weight * e_vec)
        else:
            # First interaction
            new_vec = direction * e_vec if direction > 0 else -1 * e_vec

        # Normalize projection organically
        norm = np.linalg.norm(new_vec)
        if norm > 0:
            new_vec = new_vec / norm

        # Save back to Redis cache continuously
        r.setex(u_key, 1200, json.dumps(new_vec.tolist()))
        
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/ml/semantic-candidates', methods=['POST'])
def semantic_candidates():
    """
    Rank candidate events by cosine similarity to a user embedding.
    Body: {
        "user_embedding": float[384],
        "candidates": [ { "id": int, "embedding": float[384] }, ... ],
        "top_n": int  (default 100)
    }
    Returns: {
        "status": "success",
        "candidates": [ { "id": int, "score": float }, ... ]  (sorted desc)
    }
    """
    if not embedding_model:
        return jsonify({"status": "error", "message": "Embedding model not available"}), 503

    data = request.get_json()
    if not data or 'user_embedding' not in data or 'candidates' not in data:
        return jsonify({"status": "error", "message": "Missing user_embedding or candidates"}), 400

    top_n      = int(data.get('top_n', 100))
    candidates = data['candidates']
    if not candidates:
        return jsonify({"status": "success", "candidates": []})

    try:
        user_vec = np.array(data['user_embedding'], dtype=np.float32)

        results = []
        for cand in candidates:
            emb = cand.get('embedding')
            if not emb:
                continue
            ev_vec = np.array(emb, dtype=np.float32)
            score  = _cosine_similarity(user_vec, ev_vec)
            results.append({"id": cand['id'], "score": float(score)})

        results.sort(key=lambda x: x['score'], reverse=True)
        return jsonify({"status": "success", "candidates": results[:top_n]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"[ML Service] Starting V11 Distributed ML Engine on Port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
