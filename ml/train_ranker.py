import os
import json
import joblib
import pandas as pd
import pg8000.native
import lightgbm as lgb
from sklearn.metrics import roc_auc_score, accuracy_score
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    return pg8000.native.Connection(
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASS', '5432'),
        host=os.environ.get('DB_HOST', 'localhost'),
        port=int(os.environ.get('DB_PORT', 5432)),
        database=os.environ.get('DB_NAME', 'seams_db')
    )

def fetch_data():
    conn = get_db_connection()
    
    query = """
    WITH log_labels AS (
        SELECT 
            user_id, 
            event_id, 
            MAX(CASE WHEN action = 'clicked' THEN 1 ELSE 0 END) as clicked,
            MAX(timestamp) as interaction_time
        FROM recommendation_logs
        GROUP BY user_id, event_id
    )
    SELECT 
        l.user_id,
        l.event_id,
        l.clicked as label,
        l.interaction_time,
        u.tag_profile,
        u.interests,
        e.tags,
        e.global_event_score,
        e.total_impressions,
        e.date as event_date,
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.user_id = l.user_id) as interaction_count,
        (SELECT EXTRACT(EPOCH FROM (l.interaction_time - MAX(ua.timestamp)))/3600 FROM user_activity ua WHERE ua.user_id = l.user_id AND ua.timestamp < l.interaction_time) as hours_since_last_activity
    FROM log_labels l
    JOIN users u ON l.user_id = u.id
    JOIN events e ON l.event_id = e.id
    """
    rows = conn.run(query)
    columns = [
        col['name'] for col in conn.columns
    ]
    conn.close()
    
    df = pd.DataFrame(rows, columns=columns)
    return df

import datetime

def compute_recency(event_date):
    if not event_date: return 0.0
    now = datetime.datetime.now(datetime.timezone.utc)
    if event_date.tzinfo is None:
        event_date = event_date.replace(tzinfo=datetime.timezone.utc)
    age_in_days = (now - event_date).total_seconds() / (60 * 60 * 24)
    if age_in_days < 0: age_in_days = 0
    return 1.0 / (1.0 + age_in_days)

def compute_tag_scores(user_profile_json, event_tags):
    if not event_tags: return 0.0, 0.0
    try:
        if isinstance(user_profile_json, str):
            profile = json.loads(user_profile_json)
        else:
            profile = user_profile_json or {}
    except:
        profile = {}

    similarity_score = 0.0
    total_tag_weight = 0.0
    
    for tag in (event_tags or []):
        lower_tag = tag.lower()
        if isinstance(profile, dict) and lower_tag in profile:
            similarity_score += 1
            total_tag_weight += float(profile[lower_tag])
            
    # Normalize similarity (Jaccard-ish or just ratio)
    sim = similarity_score / len(event_tags) if len(event_tags) > 0 else 0
    
    # Normalize weight (cap at some reasonable max, e.g. 10.0) -> sigmoid or min/max
    weight = min(total_tag_weight / 10.0, 1.0)
    
    return sim, weight

def build_features(df):
    features = []
    labels = []
    
    for _, row in df.iterrows():
        sim_score, weight_score = compute_tag_scores(row['tag_profile'], row['tags'])
        
        pop = row['global_event_score'] if pd.notnull(row['global_event_score']) else 0.5
        pop = min(float(pop) / 5.0, 1.0)
        
        interactions = row['interaction_count']
        if interactions < 5: segment = 0
        elif interactions <= 20: segment = 1
        else: segment = 2
        
        recency = compute_recency(row['event_date'])
def compute_temporal_features(interaction_time, event_date):
    if not interaction_time:
        interaction_time = datetime.datetime.now(datetime.timezone.utc)
    if interaction_time.tzinfo is None:
        interaction_time = interaction_time.replace(tzinfo=datetime.timezone.utc)
        
    time_of_day = interaction_time.hour
    day_of_week = interaction_time.weekday()
    
    # Freshness Bucket
    if not event_date:
        event_date = interaction_time
    if event_date.tzinfo is None:
        event_date = event_date.replace(tzinfo=datetime.timezone.utc)
        
    age_days = (interaction_time - event_date).total_seconds() / (60 * 60 * 24)
    if age_days < 1: freshness = 0 # <1 day
    elif age_days <= 3: freshness = 1 # 1-3 days
    elif age_days <= 7: freshness = 2 # 3-7 days
    else: freshness = 3 # >7 days
    
    return time_of_day, day_of_week, freshness

def build_features(df):
    features = []
    
    for _, row in df.iterrows():
        sim_score, weight_score = compute_tag_scores(row['tag_profile'], row['tags'])
        
        pop = float(row['global_event_score']) if pd.notnull(row['global_event_score']) else 0.5
        pop = min(pop / 5.0, 1.0)
        
        interactions = row['interaction_count'] or 0
        if interactions < 5: segment = 0
        elif interactions <= 20: segment = 1
        else: segment = 2
        
        time_of_day, day_of_week, freshness = compute_temporal_features(row['interaction_time'], row['event_date'])
        
        # Session recency (hours since last activity)
        sess_recency = float(row['hours_since_last_activity']) if pd.notnull(row['hours_since_last_activity']) else 100.0
        # cap at 100
        sess_recency = min(sess_recency, 100.0)
        
        f_vec = [
            sim_score, 
            weight_score, 
            pop, 
            segment,
            time_of_day,
            day_of_week,
            freshness,
            interactions,
            sess_recency
        ]
        features.append(f_vec)
        
    feature_cols = ['tag_sim', 'tag_weight', 'popularity', 'segment', 'time_of_day', 'day_of_week', 'freshness_bucket', 'user_freq', 'session_recency']
    return pd.DataFrame(features, columns=feature_cols), df['label']

def train():
    print("Fetching training data from Postgres...")
    try:
        df = fetch_data()
    except Exception as e:
        print(f"Error connecting to Postgres or fetching data: {e}")
        df = pd.DataFrame()

    base_dir = os.path.dirname(__file__)
    model_path = os.path.join(base_dir, 'ranking_model.pkl')
    
    feature_cols = ['tag_sim', 'tag_weight', 'popularity', 'segment', 'time_of_day', 'day_of_week', 'freshness_bucket', 'user_freq', 'session_recency']

    if len(df) < 50:
        print(f"Not enough data to train model yet ({len(df)} logs). Need >= 50.")
        model = lgb.LGBMClassifier()
        # Create dummy data with exactly 9 columns as matched in feature_cols
        X_dummy = pd.DataFrame([[0]*9, [1]*9], columns=feature_cols)
        y_dummy = [0, 1]
        model.fit(X_dummy, y_dummy)
        joblib.dump(model, model_path)
        
        metrics = {
            "auc": 0.5,
            "accuracy": 0.5,
            "training_samples": 0,
            "test_samples": 0,
            "last_trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "version": "dummy_fallback",
            "algorithm": "LightGBM"
        }
        with open(os.path.join(base_dir, 'ml_metrics.json'), 'w') as f:
            json.dump(metrics, f)
            
        print("Created dummy LightGBM model fallback and metrics.")
        return

    print(f"Loaded {len(df)} interaction logs.")
    
    # STRICT TIME-BASED SPLIT
    df = df.sort_values('interaction_time')
    split_idx = int(len(df) * 0.8)
    
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    X_train, y_train = build_features(train_df)
    X_test, y_test = build_features(test_df)
    
    if len(y_train.unique()) < 2:
        print("Training dataset only contains one class (all clicks or all skips). Cannot train LGBM.")
        return
        
    print(f"Training LightGBM on {len(X_train)} rows, validating on {len(X_test)} rows...")
    model = lgb.LGBMClassifier(
        n_estimators=100,
        learning_rate=0.05,
        class_weight='balanced',
        random_state=42
    )
    model.fit(X_train, y_train)
    
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    try:
        auc = roc_auc_score(y_test, y_pred_proba)
    except ValueError:
        auc = 0.5 # if test set has 1 class
    acc = accuracy_score(y_test, y_pred)
    
    print(f"Model Training Complete!")
    print(f"ROC-AUC Score: {auc:.4f}")
    print(f"Accuracy: {acc:.4f}")
    
    # Versioned Model Saving
    version_id = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
    versioned_model_path = os.path.join(base_dir, f'ranking_model_v{version_id}.pkl')
    
    joblib.dump(model, versioned_model_path)
    # Overwrite the active model link/file
    joblib.dump(model, model_path)
    
    print(f"Saved versioned model to {versioned_model_path}")

    # Output metrics for Admin Dashboard
    metrics = {
        "auc": float(auc),
        "accuracy": float(acc),
        "training_samples": len(train_df),
        "test_samples": len(test_df),
        "last_trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "version": version_id,
        "algorithm": "LightGBM"
    }
    metrics_path = os.path.join(base_dir, 'ml_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f)
    print(f"Saved metrics to {metrics_path}")

if __name__ == "__main__":
    train()
