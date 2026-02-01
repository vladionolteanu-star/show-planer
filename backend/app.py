from flask import Flask, jsonify, request
from flask_cors import CORS
from scrapers.event_scraper import EventScraper
from scrapers.location_scraper import LocationScraper
import json
import os
import cache

app = Flask(__name__)
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

@app.route('/api/locations', methods=['GET'])
def get_locations():
    city = request.args.get('city', 'sibiu')
    
    # Check cache
    cached = cache.get_cached_data("loc", city)
    if cached:
        print(f"Serving locations for {city} from CACHE")
        return jsonify(cached)

    print(f"Scraping locations for {city}...")
    scraper = LocationScraper()
    locations = scraper.get_locations(city)
    
    # Cache result
    if locations:
        cache.save_to_cache("loc", city, locations)
        
    return jsonify(locations)

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
    
    # Cache result
    if events:
        cache.save_to_cache("evt", city, events)
        
    return jsonify(events)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
