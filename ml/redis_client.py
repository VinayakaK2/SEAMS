import os
import redis
from redis.sentinel import Sentinel

def get_redis_client(decode_responses=False):
    """
    Returns a connected Redis client.
    If REDIS_SENTINELS is detected, it securely connects via a Master-Replica Sentinel pool.
    Example REDIS_SENTINELS: '127.0.0.1:26379,127.0.0.1:26380'
    """
    sentinels_env = os.environ.get('REDIS_SENTINELS')
    if sentinels_env:
        sentinel_list = []
        try:
            for s in sentinels_env.split(','):
                h, p = s.split(':')
                sentinel_list.append((h.strip(), int(p.strip())))
            
            sentinel = Sentinel(sentinel_list, socket_timeout=2.0)
            master_name = os.environ.get('REDIS_MASTER_NAME', 'mymaster')
            return sentinel.master_for(master_name, decode_responses=decode_responses)
        except Exception as e:
            print(f"[REDIS] Failed to initialize Sentinel Pool: {e}")
            raise e
    else:
        url = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379')
        return redis.Redis.from_url(url, decode_responses=decode_responses)
