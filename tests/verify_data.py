import requests
import datetime

def test_backend_events():
    print("🧪 Testing Backend Data Quality...")
    try:
        # Clear Cache First
        print("🧹 Clearing Cache via API...")
        try:
            requests.delete("http://127.0.0.1:5000/api/cache", timeout=5)
            print("   Cache cleared.")
        except Exception as e:
            print(f"   Warning: Could not clear cache: {e}")

        # Request Bucharest (high volume)
        city = "bucuresti"
        # Force fresh scrape? No, current app logic scrapes if cache invalid.
        # We just cleared cache, so this request will TRIGGER the 15-page scrape.
        # It might timeout via default requests, so we set a long timeout.
        print(f"   Requesting events for {city}... (This triggers scraping, please wait ~10-15s)")
        
        url = f"http://127.0.0.1:5000/api/events?city={city}"
        t0 = datetime.datetime.now()
        r = requests.get(url, timeout=30)
        dt = datetime.datetime.now() - t0
        
        if r.status_code != 200:
            print(f"❌ Failed to get events: {r.status_code}")
            return

        events = r.json()
        print(f"✅ Received {len(events)} events in {dt.total_seconds():.1f}s")
        
        # Check for March 2026 events
        march_count = 0
        for e in events:
            date_str = e.get('start_date', '')
            if '2026-03' in date_str:
                march_count += 1
        
        if march_count > 0:
            print(f"✅ SUCCESS: Found {march_count} events in March 2026!")
        else:
            print("⚠️ WARNING: No events found for March 2026.")

        # Check for Stand-up vs standard
        standup = [e for e in events if e.get('is_standup')]
        print(f"📊 Stats: {len(standup)} Stand-up events found.")
        
        # Check for Prices
        with_price = [e for e in events if e.get('price')]
        print(f"💰 Stats: {len(with_price)} events have Price info.")
        if len(with_price) > 0:
             print(f"   Example Price: {with_price[0]['price']} {with_price[0].get('currency', '')}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_backend_events()
