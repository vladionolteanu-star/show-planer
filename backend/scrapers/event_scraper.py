import requests
from bs4 import BeautifulSoup
import json
import datetime
import time

class EventScraper:
    def get_events(self, city):
        base_url = "https://www.iabilet.ro"
        is_global = (city == 'all')
        
        # Parallel Scraping Configuration
        # Scrape 30 pages to reach March/April (approx 720 events)
        pages_to_scrape = 30 
        max_workers = 10 
        
        all_events = []
        import concurrent.futures
        import time

        def scrape_page(page):
            events_on_page = []
            if is_global:
                url = f"{base_url}/bilete-stand-up-comedy/?page={page}"
            else:
                s_page = f"?page={page}" if page > 1 else ""
                url = f"{base_url}/bilete-in-{city}/{s_page}"
            
            try:
                headers = {'User-Agent': 'Mozilla/5.0'}
                response = requests.get(url, headers=headers, timeout=10)
                
                if response.status_code != 200:
                    return []

                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Check for empty result
                if "nu am gasit evenimente" in soup.get_text().lower():
                    return []

                script_tags = soup.find_all('script', type='application/ld+json')
                
                for script in script_tags:
                    try:
                        content = script.string
                        if not content: continue
                        content = content.replace('/*<![CDATA[*/', '').replace('/*]]>*/', '').strip()
                        data = json.loads(content)
                        
                        def process_event(item):
                            title = item.get('name', '')
                            # Stand-up detection
                            t_lower = title.lower()
                            is_std = True if is_global else ('stand up' in t_lower or 'stand-up' in t_lower or 'comedy' in t_lower)

                            # Image handling
                            img_raw = item.get('image')
                            image_url = None
                            if isinstance(img_raw, list) and img_raw:
                                image_url = img_raw[0] if isinstance(img_raw[0], str) else img_raw[0].get('url')
                            elif isinstance(img_raw, dict):
                                image_url = img_raw.get('url')
                            elif isinstance(img_raw, str):
                                image_url = img_raw
                            
                            # Price handling
                            price = None
                            offers = item.get('offers')
                            if isinstance(offers, dict):
                                price = offers.get('price') or offers.get('lowPrice')
                            elif isinstance(offers, list) and offers:
                                price = offers[0].get('price') or offers[0].get('lowPrice')
                            
                            # Clean price (sometimes it's "50.00", make it "50")
                            if price:
                                try:
                                    price = f"{float(price):.0f}"
                                except:
                                    pass

                            # Location Handling
                            loc_obj = item.get('location', {})
                            loc_name = loc_obj.get('name')
                            # Try to find URL in location object (address? sameAs? url?)
                            # iabilet JSON-LD typically only has 'name' and 'address'.
                            # If no URL, we will derive it in the frontend or use a search query.
                            loc_url = loc_obj.get('url') or loc_obj.get('sameAs')

                            return {
                                'title': title,
                                'start_date': item.get('startDate'),
                                'end_date': item.get('endDate'),
                                'location': loc_name,
                                'location_url': loc_url, 
                                'url': item.get('url'),
                                'image': image_url,
                                'price': price,
                                'currency': 'RON', # Assuming RON for iabilet
                                'is_standup': is_std
                            }

                        if isinstance(data, dict) and data.get('@type') == 'Event':
                             events_on_page.append(process_event(data))
                        elif isinstance(data, list):
                            for item in data:
                                if item.get('@type') == 'Event':
                                    events_on_page.append(process_event(item))
                    except:
                        continue
                
                return events_on_page

            except Exception:
                return []

        # Execute in parallel
        start_total = time.time()
        print(f"[{city}] Scraping {pages_to_scrape} pages with {max_workers} threads...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_page = {executor.submit(scrape_page, p): p for p in range(1, pages_to_scrape + 1)}
            for future in concurrent.futures.as_completed(future_to_page):
                page_events = future.result()
                all_events.extend(page_events)
        
        print(f"[{city}] Scraped {len(all_events)} events in {time.time() - start_total:.2f}s")
        return all_events
