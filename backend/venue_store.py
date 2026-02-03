import json
import os

VENUE_DB_FILE = os.path.join(os.path.dirname(__file__), 'venues_db.json')

class VenueStore:
    def __init__(self):
        self.db = self._load_db()

    def _load_db(self):
        if not os.path.exists(VENUE_DB_FILE):
            return {"_global": []} # Structure: {"city_slug": [{"name": "...", "url": "..."}]}
        try:
            with open(VENUE_DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {"_global": []}

    def _save_db(self):
        try:
            with open(VENUE_DB_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.db, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving venue DB: {e}")

    def add_venues_from_events(self, city_slug, events):
        """
        Extracts locations from event list and adds them to DB if not exists.
        For 'all' city, we might need heuristic or just skip city-specific storage?
        Actually, for 'all' we don't know the city of the venue easily unless parsed.
        But users typically select a city.
        """
        if city_slug == 'all':
            # We can't easily attribute to a city, but we can store in _global
            target_key = '_global'
        else:
            target_key = city_slug

        if target_key not in self.db:
            self.db[target_key] = []

        existing_names = {v['name'].lower() for v in self.db[target_key]}
        added = 0
        
        for e in events:
            loc_name = e.get('location')
            loc_url = e.get('location_url')
            
            if not loc_name: continue
            
            # Skip if exists
            if loc_name.lower() in existing_names:
                continue

            # Construct new venue entry
            # If no URL, generate search URL
            final_url = loc_url if loc_url else f"https://www.iabilet.ro/cauta/?q={loc_name}"

            new_venue = {
                "name": loc_name,
                "url": final_url,
                "is_derived": True
            }
            
            self.db[target_key].append(new_venue)
            existing_names.add(loc_name.lower())
            added += 1
            
        if added > 0:
            self.db[target_key].sort(key=lambda x: x['name'])
            self._save_db()
            print(f"[{city_slug}] Added {added} new venues to history.")

    def get_venues(self, city_slug):
        """Returns list of venues for city + any relevant global ones?"""
        # Return specific city venues
        return self.db.get(city_slug, [])

venue_store = VenueStore()
