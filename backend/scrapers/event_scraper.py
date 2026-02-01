import requests
from bs4 import BeautifulSoup
import json
import datetime
import time

class EventScraper:
    def get_events(self, city):
        base_url = "https://www.iabilet.ro"
        is_global = (city == 'all')
        
        # Determine how many pages to scrape
        # Scrape 5 pages to cover ~2-3 months of events
        pages_to_scrape = 5 
        
        all_events = []

        for page in range(1, pages_to_scrape + 1):
            if is_global:
                url = f"{base_url}/bilete-stand-up-comedy/?page={page}"
                print(f"Scraping GLOBAL STAND-UP URL (Page {page}):", url)
            else:
                s_page = f"?page={page}" if page > 1 else ""
                url = f"{base_url}/bilete-in-{city}/{s_page}"

            try:
                headers = {'User-Agent': 'Mozilla/5.0'}
                start_time = time.time()
                print(f"[{city}] Requesting {url}...")
                response = requests.get(url, headers=headers)
                print(f"[{city}] Request took {time.time() - start_time:.2f}s")
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                script_tags = soup.find_all('script', type='application/ld+json')
                found_on_page = 0
                
                for script in script_tags:
                    try:
                        content = script.string
                        if not content: continue
                        content = content.replace('/*<![CDATA[*/', '').replace('/*]]>*/', '').strip()
                        data = json.loads(content)
                        
                        def process_event(item):
                            title = item.get('name', '')
                            is_standup = True if is_global else ('stand up' in title.lower() or 'stand-up' in title.lower() or 'comedy' in title.lower())
                            
                            # Image handling - robust extraction
                            img_raw = item.get('image')
                            image_url = None
                            if isinstance(img_raw, list):
                                if len(img_raw) > 0:
                                    image_url = img_raw[0] if isinstance(img_raw[0], str) else img_raw[0].get('url')
                            elif isinstance(img_raw, dict):
                                image_url = img_raw.get('url')
                            elif isinstance(img_raw, str):
                                image_url = img_raw
                            
                            if image_url:
                                print(f"DEBUG IMAGE for {title[:15]}...: {image_url}")

                            return {
                                'title': title,
                                'start_date': item.get('startDate'),
                                'end_date': item.get('endDate'),
                                'location': item.get('location', {}).get('name'),
                                'url': item.get('url'),
                                'image': image_url,
                                'is_standup': is_standup
                            }

                        if isinstance(data, dict) and data.get('@type') == 'Event':
                             all_events.append(process_event(data))
                             found_on_page += 1
                        elif isinstance(data, list):
                            for item in data:
                                if item.get('@type') == 'Event':
                                    all_events.append(process_event(item))
                                    found_on_page += 1
                    except Exception:
                        continue
                
                if found_on_page == 0:
                    print(f"No events found on page {page}, stopping.")
                    break
                    
            except Exception as e:
                print(f"Error scraping page {page}: {e}")
                continue
                
        return all_events
