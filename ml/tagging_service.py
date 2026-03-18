import os
import re
import math
import string
import json
import joblib
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Load V6 Ranking Model into memory at startup (if exists)
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

if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"[ML Service] Starting Stateless V3 Semantic Tagging Engine on Port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
