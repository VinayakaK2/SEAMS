"""
generate_event_embeddings.py
============================
Batch script: generate 384-dim sentence-transformer embeddings
for all approved events that currently have a NULL embedding,
then write them back to the DB.

Usage:
    cd H:/SEAMS/ml
    python generate_event_embeddings.py

Run this once to backfill existing events.
New events are embedded on-the-fly via tagging_service.py.
"""

import os
import sys
import json
import time
import pg8000.native
import numpy as np
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()

# ── Model ──────────────────────────────────────────────────────────────────────
MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'
print(f"[EMBED] Loading model: {MODEL_NAME} …")
model = SentenceTransformer(MODEL_NAME)
print("[EMBED] Model loaded.")

# ── DB connection ──────────────────────────────────────────────────────────────
def get_conn():
    return pg8000.native.Connection(
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASS', 'postgres'),
        host=os.environ.get('DB_HOST', 'localhost'),
        port=int(os.environ.get('DB_PORT', 5432)),
        database=os.environ.get('DB_NAME', 'seams_db'),
    )


def build_event_text(title: str, description: str, tags) -> str:
    """Combine event text fields into a single string for embedding."""
    tag_str = ''
    if tags:
        try:
            tag_list = tags if isinstance(tags, list) else json.loads(tags)
            tag_str = ' '.join(tag_list)
        except Exception:
            tag_str = str(tags)
    parts = [
        (title or '').strip(),
        (description or '').strip(),
        tag_str.strip(),
    ]
    return ' '.join(p for p in parts if p)


def generate_embedding(text: str) -> list:
    """Generate a 384-dim embedding vector."""
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def main():
    conn = get_conn()

    # Fetch all approved events whose embedding column is NULL
    rows = conn.run(
        "SELECT id, title, description, tags "
        "FROM events "
        "WHERE status = 'approved' AND embedding IS NULL "
        "ORDER BY id ASC"
    )
    columns = [col['name'] for col in conn.columns]
    events = [dict(zip(columns, row)) for row in rows]
    conn.close()

    total = len(events)
    print(f"[EMBED] Found {total} approved events without embeddings.")
    if total == 0:
        print("[EMBED] Nothing to do. Exiting.")
        return

    BATCH_SIZE = 16
    success = 0
    failed  = 0

    for i in range(0, total, BATCH_SIZE):
        batch = events[i : i + BATCH_SIZE]
        texts = [build_event_text(e['title'], e['description'], e['tags']) for e in batch]

        # Batch inference (much faster than one-by-one)
        try:
            vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        except Exception as ex:
            print(f"[EMBED] Batch encode failed for indices {i}-{i+len(batch)}: {ex}")
            failed += len(batch)
            continue

        # Write each embedding back to DB
        conn = get_conn()
        for event, vec in zip(batch, vectors):
            try:
                conn.run(
                    "UPDATE events SET embedding = :emb WHERE id = :eid",
                    emb=json.dumps(vec.tolist()),
                    eid=event['id'],
                )
                success += 1
            except Exception as ex:
                print(f"[EMBED] Failed to write embedding for event {event['id']}: {ex}")
                failed += 1
        conn.close()

        pct = round((i + len(batch)) / total * 100)
        print(f"[EMBED] Progress: {i + len(batch)}/{total} ({pct}%) | ok={success} fail={failed}")
        time.sleep(0.05)  # Be polite to the DB

    print(f"\n[EMBED] Done! success={success}, failed={failed}, total={total}")


if __name__ == '__main__':
    main()
