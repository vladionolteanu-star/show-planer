import json
import os
import time
import hashlib

CACHE_DIR = "backend/cache_data"
CACHE_DURATION = 3600  # 1 hour

def get_cache_key(prefix, key):
    m = hashlib.md5()
    m.update(key.encode('utf-8'))
    return f"{prefix}_{m.hexdigest()}.json"

def get_cached_data(prefix, key):
    if not os.path.exists(CACHE_DIR):
        return None
    
    filename = get_cache_key(prefix, key)
    filepath = os.path.join(CACHE_DIR, filename)
    
    if not os.path.exists(filepath):
        return None
        
    # Check if expired
    if time.time() - os.path.getmtime(filepath) > CACHE_DURATION:
        return None
        
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def save_to_cache(prefix, key, data):
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
        
    filename = get_cache_key(prefix, key)
    filepath = os.path.join(CACHE_DIR, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
