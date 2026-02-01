import requests
from bs4 import BeautifulSoup
import json

class LocationScraper:
    def get_locations(self, city):
        # Allow 'all' but return empty or top venues?
        if city == 'all':
            # Optionally we could scrape the homepage for top venues, 
            # but for now let's just return empty to avoid noise
            return []

        url = f"https://www.iabilet.ro/bilete-in-{city}/"
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            locations = []
            seen = set()

            # Strategy: Look for "div.card > a[href*='venue']" but EXCLUDE header/menu
            # The header menu usually has class "menu-header-venues" or acts as a dropdown.
            # We want venues listed in the page body (if any) or sidebars.
            
            # Better selector: exclude nav/header
            # Try to find a specific container for content? 
            # Or just filter out cards that are inside a .dropdown-menu
            
            cards = soup.select('div.card a[href*="venue"]')
            for card in cards:
                # Check if this card is inside the header menu
                if card.find_parent('li', class_='menu-header-venues') or card.find_parent('div', class_='dropdown-menu'):
                    continue

                href = card.get('href')
                name = card.get('title')
                
                # Fallback if title is missing
                if not name:
                    v_div = card.find('div', class_='venue')
                    if v_div:
                        name = v_div.get_text(strip=True)
                
                if name and href and name not in seen:
                    full_url = "https://www.iabilet.ro" + href if href.startswith('/') else href
                    locations.append({'name': name, 'url': full_url})
                    seen.add(name)
            
            return locations
        except Exception as e:
            print(f"Error scraping locations: {e}")
            return []
