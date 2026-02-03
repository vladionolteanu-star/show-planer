import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import './index.css';
import TourBuilder from './TourBuilder';

function App() {
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [city, setCity] = useState({ name: 'Sibiu', slug: 'sibiu' });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('calendar');



  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // All Cities for Selector
  const [allCities, setAllCities] = useState([]);

  // Load all cities for selector on mount
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await axios.get('https://show-backend-vhwo.onrender.com/api/search_cities?q=all');
        setAllCities(res.data);
      } catch {
        console.error("Could not load cities list");
      }
    }
    loadCities();
  }, []);



  // Fetch data when city changes (Race Condition Safe)
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setEvents([]);
      setLocations([]);

      try {
        const [eventRes, locRes] = await Promise.all([
          axios.get(`https://show-backend-vhwo.onrender.com/api/events?city=${city.slug}`),
          axios.get(`https://show-backend-vhwo.onrender.com/api/locations?city=${city.slug}`)
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

  // Artist Filtering State
  // Artist Filtering State
  const [selectedArtist, setSelectedArtist] = useState('');
  const [globalArtists, setGlobalArtists] = useState([]);

  // Load Global Artists (Background Fetch)
  useEffect(() => {
    async function loadGlobalArtists() {
      try {
        // Fetch global stand-up events to populate the master artist list
        // We use a separate request so it doesn't block the initial city load
        const res = await axios.get('https://show-backend-vhwo.onrender.com/api/events?city=all');

        const extracted = new Set();
        res.data.forEach(e => {
          // Use the same regex logic
          // We rely on the scraper's 'is_standup' implicit flag for city=all
          const title = e.title;
          let match = title.match(/(?:cu|show|featuring|starring)\s+([A-ZĂÂÎȘȚ][a-zA-Zăâîșț\s&-]+)/i);

          if (match && match[1]) {
            let name = match[1].trim();
            if (name.length < 25) extracted.add(name);
          }
        });
        setGlobalArtists(Array.from(extracted).sort());
      } catch (e) {
        console.error("Error loading global artists", e);
      }
    }
    loadGlobalArtists();
  }, []);

  const filteredEvents = React.useMemo(() => {
    if (!selectedArtist) return events;
    return events.filter(e => e.title.toLowerCase().includes(selectedArtist.toLowerCase()));
  }, [events, selectedArtist]);





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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* CITY SELECTOR */}
          <select
            value={city.slug}
            onChange={handleDropdownChange}
            className="city-selector"
            style={{ minWidth: '200px' }}
          >
            <option value="all" style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>
              TOATA ROMANIA (Doar Stand-Up)
            </option>
            <option disabled>──────────</option>
            {allCities.map(c => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <div style={{ color: '#666', fontWeight: 'bold' }}>/</div>

          <div style={{ color: '#666', fontWeight: 'bold' }}>/</div>

          {/* SMART ARTIST SEARCH */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Caută artist (ex: Micu)..."
              value={selectedArtist}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedArtist(val);
                setShowDropdown(val.length > 0);

                // If user clears input, maybe reset to local city? 
                // For now, keep as is.
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // Delay to allow click
              className="city-selector"
              style={{
                minWidth: '220px',
                borderColor: selectedArtist ? 'var(--accent-red)' : '#333',
                paddingLeft: '34px', // Space for icon
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23666\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z\' /%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: '10px center',
                backgroundSize: '16px'
              }}
            />

            {/* AUTO-COMPLETE DROPDOWN */}
            {showDropdown && (
              <div className="search-results">
                {globalArtists
                  .filter(a => a.toLowerCase().includes(selectedArtist.toLowerCase()))
                  .slice(0, 10) // Limit to 10 suggestions
                  .map(artist => (
                    <div
                      key={artist}
                      className="search-result-item"
                      onMouseDown={() => {
                        setSelectedArtist(artist);
                        // SMART LOGIC: Switch to ALL cities to show full tour
                        if (city.slug !== 'all') {
                          setCity({ name: 'TOATA ROMANIA (Stand-Up)', slug: 'all' });
                        }
                        setShowDropdown(false);
                      }}
                    >
                      🎤 {artist}
                      <span style={{ float: 'right', fontSize: '10px', color: '#666', marginTop: '4px' }}>VEZI TOUR</span>
                    </div>
                  ))}

                {globalArtists.filter(a => a.toLowerCase().includes(selectedArtist.toLowerCase())).length === 0 && (
                  <div style={{ padding: '10px', color: '#666', fontStyle: 'italic', fontSize: '13px' }}>
                    Niciun artist găsit...
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="view-toggle" style={{ display: 'flex', gap: '5px', marginRight: '10px' }}>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              background: viewMode === 'calendar' ? 'var(--accent-red)' : '#333',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setViewMode('builder')}
            style={{
              background: viewMode === 'builder' ? 'var(--accent-blue)' : '#333',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🛠️ Tour Builder
          </button>
        </div>

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
      </header>

      <div className="main-content">
        {viewMode === 'builder' ? (
          <TourBuilder allCities={allCities} globalArtists={globalArtists} />
        ) : (
          <>
            <aside className={`sidebar ${!sidebarOpen ? 'closed' : ''}`}>
              <div className="sidebar-header">
                VENUES ({locations.length})
              </div>
              <div className="venue-list">
                {locations.length === 0 && !loading && (
                  <div style={{ padding: '20px', color: '#555', textAlign: 'center' }}>
                    {city.slug === 'all'
                      ? "Select a specific city to see venues."
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
                events={filteredEvents}
                firstDay={1} /* Start on Monday */
                locale="ro"  /* Romanian Locale */
                buttonText={{
                  today: 'Azi',
                  month: 'Luna',
                  week: 'Săptămâna',
                  day: 'Zi',
                  list: 'Listă'
                }}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek'
                }}
                height="100%"
                eventDisplay="block"
                eventContent={(arg) => {
                  const { is_standup, image, location, price } = arg.event.extendedProps;
                  let title = arg.event.title.replace(/^[^:]+:\s*/, '');

                  return (
                    <div className={`fc-event-content ${is_standup ? 'standup-event' : 'standard-event'}`} title={`${title} @ ${location}`}>
                      {!is_standup && (
                        <div style={{ padding: '2px 4px', opacity: 0.7, fontSize: '10px', fontWeight: '500', color: '#ccc' }}>
                          {title}
                        </div>
                      )}

                      {is_standup && (
                        <div style={{ display: 'flex', alignItems: 'start', gap: '8px', padding: '4px' }}>
                          <img
                            src={image || 'https://static.iabilet.ro/img/auto_resized/db/event/00/00/00/000000000-0000-0000-0000-000000000000/260/360/0.jpg'}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://static.iabilet.ro/img/auto_resized/db/event/00/00/00/000000000-0000-0000-0000-000000000000/260/360/0.jpg';
                            }}
                            alt=""
                            style={{
                              width: '50px',
                              height: '70px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              flexShrink: 0,
                              background: '#222',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                              border: '1px solid #ff2a6d'
                            }}
                          />

                          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '60px', width: '100%' }}>
                            <div style={{
                              fontWeight: '800',
                              fontSize: '13px',
                              color: '#fff',
                              lineHeight: '1.2',
                              marginBottom: '4px',
                              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                              whiteSpace: 'normal',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {title}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                              <div style={{ fontSize: '10px', color: '#ff2a6d', fontWeight: '700', textTransform: 'uppercase' }}>
                                📍 {location}
                              </div>

                              {price && (
                                <div className="price-tag">
                                  {price} LEI
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            </main>
          </>
        )}
      </div>
    </div>
  );
}
export default App;
