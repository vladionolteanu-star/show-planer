from flask import Flask, jsonify, request
from flask_cors import CORS
from scrapers.event_scraper import EventScraper
from scrapers.location_scraper import LocationScraper
import json
import os
import cache
from venue_store import venue_store

app = Flask(__name__)
# ...

@app.route('/api/locations', methods=['GET'])
def get_locations():
    city = request.args.get('city', 'sibiu')
    
    # 1. Get Persistent Venues (History)
    persistent_venues = venue_store.get_venues(city) if city != 'all' else venue_store.get_venues('_global')

    # 2. Check cache for Scraped Venues
    cached = cache.get_cached_data("loc", city)
    scraped_venues = []
    
    if cached:
        print(f"Serving locations for {city} from CACHE")
        scraped_venues = cached
    else:
        print(f"Scraping locations for {city}...")
        scraper = LocationScraper()
        scraped_venues = scraper.get_locations(city)
        if scraped_venues:
            cache.save_to_cache("loc", city, scraped_venues)

    # 3. Merge Unique
    # Convert persistent to dict by name for easy merge
    merged_map = {v['name'].lower(): v for v in persistent_venues}
    # Update with scraped (usually fresher URLs) or keep persistent? 
    # Let's trust persistent but allow scraped to add new ones.
    for v in scraped_venues:
        if v['name'].lower() not in merged_map:
            merged_map[v['name'].lower()] = v
    
    final_locations = sorted(merged_map.values(), key=lambda x: x['name'])
    return jsonify(final_locations)

@app.route('/api/events', methods=['GET'])
def get_events():
    city = request.args.get('city', 'sibiu')

    # Check cache
    cached = cache.get_cached_data("evt", city)
    if cached:
        print(f"Serving events for {city} from CACHE")
        return jsonify(cached)

    print(f"Scraping events for {city}...")
    scraper = EventScraper()
    events = scraper.get_events(city)
    
    # Update Venue History
    venue_store.add_venues_from_events(city, events)
    
    # Cache result
    if events:
        cache.save_to_cache("evt", city, events)
        
    return jsonify(events)
CORS(app)

# Load cities
CITIES_FILE = os.path.join(os.path.dirname(__file__), 'cities.json')
ALL_CITIES = []
if os.path.exists(CITIES_FILE):
    with open(CITIES_FILE, 'r', encoding='utf-8') as f:
        ALL_CITIES = json.load(f)

@app.route('/api/search_cities', methods=['GET'])
def search_cities():
    query = request.args.get('q', '').lower().strip()
    if not query or query == 'all':
        return jsonify(ALL_CITIES)
    
    matches = [c for c in ALL_CITIES if query in c['name'].lower()]
    return jsonify(matches)

@app.route('/api/cache', methods=['DELETE'])
def clear_cache_endpoint():
    try:
        count = cache.clear_all_cache()
        return jsonify({"status": "success", "deleted_files": count})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
