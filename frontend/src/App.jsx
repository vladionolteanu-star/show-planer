import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import './index.css';

function App() {
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [city, setCity] = useState({ name: 'Sibiu', slug: 'sibiu' });
  const [loading, setLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // All Cities for Selector
  const [allCities, setAllCities] = useState([]);

  // Load all cities for selector on mount
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await axios.get('http://127.0.0.1:5000/api/search_cities?q=all');
        setAllCities(res.data);
      } catch (e) {
        console.error("Could not load cities list");
      }
    }
    loadCities();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 0) {
        setSearchLoading(true);
        try {
          const res = await axios.get(`http://127.0.0.1:5000/api/search_cities?q=${searchQuery}`);
          setSearchResults(res.data);
          setShowDropdown(true);
        } catch (e) {
          console.error(e);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data when city changes (Race Condition Safe)
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setEvents([]);
      setLocations([]);

      try {
        const [eventRes, locRes] = await Promise.all([
          axios.get(`http://127.0.0.1:5000/api/events?city=${city.slug}`),
          axios.get(`http://127.0.0.1:5000/api/locations?city=${city.slug}`)
        ]);

        if (active) {
          const calendarEvents = eventRes.data.map(event => ({
            title: event.title,
            start: event.start_date,
            end: event.end_date,
            url: event.url,
            backgroundColor: event.is_standup ? '#ff2a6d' : '#222',
            borderColor: event.is_standup ? '#ff2a6d' : '#333',
            textColor: '#fff',
            extendedProps: {
              location: event.location || 'Unknown', // Fixed key
              is_standup: event.is_standup,
              image: event.image
            }
          }));

          // ENHANCEMENT: Derive venues from actual events
          const derivedLocations = [];
          const existingNames = new Set(locRes.data.map(l => l.name.toLowerCase()));

          calendarEvents.forEach(ev => {
            if (ev.extendedProps.is_standup && ev.extendedProps.location && ev.extendedProps.location !== 'Unknown') {
              const locName = ev.extendedProps.location;
              if (!existingNames.has(locName.toLowerCase())) {
                existingNames.add(locName.toLowerCase());
                derivedLocations.push({
                  name: locName,
                  // Fallback URL: Search for the venue on iabilet
                  url: `https://www.iabilet.ro/cauta/?q=${encodeURIComponent(locName)}`
                });
              }
            }
          });

          // Merge scraped venues (high quality) with derived venues (comprehensive)
          // Sort alphabetically for niceness
          const allLocs = [...locRes.data, ...derivedLocations].sort((a, b) => a.name.localeCompare(b.name));

          setLocations(allLocs);
          setEvents(calendarEvents);
        }
      } catch (error) {
        if (active) console.error("Error fetching data", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [city]);

  const handleCitySelect = (selectedCity) => {
    setCity(selectedCity);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleDropdownChange = (e) => {
    const slug = e.target.value;
    if (slug === 'all') {
      setCity({ name: 'TOATA ROMANIA (Stand-Up)', slug: 'all' });
      return;
    }
    const found = allCities.find(c => c.slug === slug);
    if (found) {
      setCity(found);
    }
  };

  return (
    <div className="app-container">
      {loading && (
        <div className="loader-overlay">
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <div style={{ color: 'white', fontWeight: '600', fontSize: '18px' }}>
              SCANNING EVENTS FOR: {city.name.toUpperCase()}
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', color: '#aaa' }}>
              Fetching venues, parsing dates, organizing chaos...
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--accent-red)' }}>SHOW</span>PLANNER
        </h1>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {/* SEARCH BAR */}
          <div className="omnibar-container">
            <input
              type="text"
              className="omnibar-input"
              placeholder="Search city..."
              value={searchQuery}
              onFocus={() => { if (searchQuery) setShowDropdown(true); }}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchLoading && (
              <div style={{ position: 'absolute', right: '10px', top: '12px' }}>
                <div className="spinner-small"></div>
              </div>
            )}
            {showDropdown && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((res) => (
                  <div
                    key={res.slug}
                    className="search-result-item"
                    onClick={() => handleCitySelect(res)}
                  >
                    {res.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OR SEPARATOR */}
          <div style={{ color: '#555', fontSize: '12px', fontWeight: '600' }}>OR</div>

          {/* SELECTOR */}
          <select
            value={city.slug}
            onChange={handleDropdownChange}
            className="city-selector"
          >
            <option value="all" style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>
              TOATA ROMANIA (Doar Stand-Up)
            </option>
            <option disabled>──────────</option>
            {allCities.map(c => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ color: '#666', fontSize: '14px', minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            className="toggle-sidebar-btn"
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              // Force calendar resize after transition
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 350);
            }}
            title="Toggle Sidebar"
          >
            {sidebarOpen ? 'Hide Venues' : 'Show Venues'}
          </button>
        </div>
      </header>

      <div className="main-content">
        <aside className={`sidebar ${!sidebarOpen ? 'closed' : ''}`}>
          <div className="sidebar-header">
            VENUES ({locations.length})
          </div>
          <div className="venue-list">
            {locations.length === 0 && !loading && (
              <div style={{ padding: '20px', color: '#555', textAlign: 'center' }}>
                {city.slug === 'all'
                  ? "Global view doesn't show specific venues yet."
                  : "No venues found."}
              </div>
            )}
            {locations.map((loc, idx) => (
              <a
                key={idx}
                href={loc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="venue-card has-standup clickable"
              >
                <div style={{ fontWeight: '600', color: 'white' }}>{loc.name}</div>
                <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>
                  {(loc.url && loc.url.includes('http')) ? 'View on iabilet ↗' : 'View Venue'}
                </div>
              </a>
            ))}
          </div>
        </aside>

        <main className="calendar-view">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            height="100%"
            // dayMaxEvents={false} // Allow unlimited height per day
            contentHeight="auto"
            eventDisplay="block"
            // Rich Event Content with Image
            eventContent={(arg) => {
              const { is_standup, image, location } = arg.event.extendedProps;
              // Clean title: Remove City prefix if present (e.g. "Sibiu: Show...")
              let title = arg.event.title.replace(/^[^:]+:\s*/, '');

              return (
                <div className={`fc-event-content ${is_standup ? 'standup-event' : ''}`} title={`${title} @ ${location}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Thumbnail Image - ONLY FOR STAND-UP */}
                    {is_standup && (
                      <img
                        src={image || 'https://static.iabilet.ro/img/auto_resized/db/event/00/00/00/000000000-0000-0000-0000-000000000000/260/360/0.jpg'}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://static.iabilet.ro/img/auto_resized/db/event/00/00/00/000000000-0000-0000-0000-000000000000/260/360/0.jpg';
                        }}
                        alt=""
                        style={{
                          width: '45px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          flexShrink: 0,
                          background: '#333',
                          border: '1px solid #ff2a6d' // Neon border
                        }}
                      />
                    )}

                    <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {/* Focus layout for Stand up */}
                      <div style={{
                        fontWeight: is_standup ? '800' : '500',
                        fontSize: is_standup ? '12px' : '10px',
                        color: is_standup ? '#fff' : '#ccc',
                        lineHeight: '1.2',
                        whiteSpace: 'normal',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: is_standup ? 3 : 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {title}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
