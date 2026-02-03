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
    cache_key = get_cache_key(prefix, key)
    filepath = os.path.join(CACHE_DIR, cache_key)
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f)
    except Exception as e:
        print(f"Cache write error: {e}")

def clear_all_cache():
    count = 0
    if not os.path.exists(CACHE_DIR):
        return 0
    for filename in os.listdir(CACHE_DIR):
        file_path = os.path.join(CACHE_DIR, filename)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
                count += 1
        except Exception as e:
            print(f"Error deleting {file_path}: {e}")
    return count
