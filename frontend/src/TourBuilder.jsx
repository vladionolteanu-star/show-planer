import React, { useState } from 'react';

// Simple mock for cities coordinates/distances
const MOCK_DISTANCES = {
    'default': { km: 150, time: '2h 30m' },
    'bucuresti-cluj-napoca': { km: 450, time: '6h 30m' },
    'bucuresti-constanta': { km: 225, time: '2h 30m' },
    'bucuresti-brasov': { km: 170, time: '2h 45m' },
    'cluj-napoca-timisoara': { km: 320, time: '4h 15m' },
};

function getRouteInfo(cityA, cityB) {
    if (!cityA || !cityB) return null;
    const key = `${cityA.slug}-${cityB.slug}`;
    const reverseKey = `${cityB.slug}-${cityA.slug}`;
    return MOCK_DISTANCES[key] || MOCK_DISTANCES[reverseKey] || MOCK_DISTANCES['default'];
}

export default function TourBuilder({ allCities, globalArtists }) {
    // Current Tour Plan
    // Type: { id: string, date: string, city: object, artists: string[] }
    const [tourStops, setTourStops] = useState([
        { id: 'stop-1', date: '2026-03-01', city: null, artists: [] },
        { id: 'stop-2', date: '2026-03-02', city: null, artists: [] },
        { id: 'stop-3', date: '2026-03-03', city: null, artists: [] },
    ]);

    // Drag State: { type: 'CITY' | 'ARTIST', data: any }
    const [dragItem, setDragItem] = useState(null);
    const [activeTab, setActiveTab] = useState('cities'); // 'cities' | 'artists'

    // -- Handlers --

    const handleDragStart = (e, type, data) => {
        setDragItem({ type, data });
        e.dataTransfer.effectAllowed = 'copy';
        // e.dataTransfer.setData('text/plain', JSON.stringify({ type, data })); // Fallback
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, stopId) => {
        e.preventDefault();
        if (!dragItem) return;

        setTourStops(stops => stops.map(stop => {
            if (stop.id === stopId) {
                if (dragItem.type === 'CITY') {
                    return { ...stop, city: dragItem.data };
                } else if (dragItem.type === 'ARTIST') {
                    // Avoid duplicates
                    if (stop.artists.includes(dragItem.data)) return stop;
                    return { ...stop, artists: [...stop.artists, dragItem.data] };
                }
            }
            return stop;
        }));
        setDragItem(null);
    };

    const updateDate = (stopId, newDate) => {
        setTourStops(stops => stops.map(stop => {
            if (stop.id === stopId) return { ...stop, date: newDate };
            return stop;
        }));
    };

    const removeCity = (stopId) => {
        setTourStops(stops => stops.map(stop => {
            if (stop.id === stopId) return { ...stop, city: null };
            return stop;
        }));
    };

    const removeArtist = (stopId, artistName) => {
        setTourStops(stops => stops.map(stop => {
            if (stop.id === stopId) {
                return { ...stop, artists: stop.artists.filter(a => a !== artistName) };
            }
            return stop;
        }));
    };

    const addDay = () => {
        const lastDate = new Date(tourStops[tourStops.length - 1].date);
        lastDate.setDate(lastDate.getDate() + 1);
        const newDateStr = lastDate.toISOString().split('T')[0];

        setTourStops([...tourStops, {
            id: `stop-${Date.now()}`,
            date: newDateStr,
            city: null,
            artists: []
        }]);
    };

    const handleExport = () => {
        const payload = {
            created_at: new Date().toISOString(),
            tour: tourStops.filter(s => s.city || s.artists.length > 0).map(s => ({
                date: s.date,
                city: s.city ? s.city.name : 'TBD',
                lineup: s.artists
            }))
        };

        const text = JSON.stringify(payload, null, 2);
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `booking_plan_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    };

    // -- Calculations --
    const renderRoute = (index) => {
        if (index === 0) return null;
        const prevStop = tourStops[index - 1];
        const currentStop = tourStops[index];
        if (!prevStop.city || !currentStop.city) return null;
        const info = getRouteInfo(prevStop.city, currentStop.city);
        return (
            <div className="route-connector">
                <div className="route-line"></div>
                <div className="route-badge">
                    🚗 {info.km} km <br />
                    ⏱️ {info.time}
                </div>
            </div>
        );
    };

    return (
        <div className="tour-builder-container">
            {/* Sidebar: Source Cities & Artists */}
            <div className="tb-sidebar">
                <div className="tb-sidebar-tabs">
                    <button
                        className={`tb-tab ${activeTab === 'cities' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cities')}
                    >
                        Cities
                    </button>
                    <button
                        className={`tb-tab ${activeTab === 'artists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('artists')}
                    >
                        Artists
                    </button>
                </div>

                <div className="tb-sidebar-content">
                    {activeTab === 'cities' && (
                        <div className="tb-list">
                            {allCities.slice(0, 100).map(city => (
                                <div
                                    key={city.slug}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'CITY', city)}
                                    className="tb-draggable item-city"
                                >
                                    🏢 {city.name}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'artists' && (
                        <div className="tb-list">
                            {globalArtists.map(artist => (
                                <div
                                    key={artist}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, 'ARTIST', artist)}
                                    className="tb-draggable item-artist"
                                >
                                    🎤 {artist}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main: Timeline */}
            <div className="tb-timeline-area">
                <div className="tb-header">
                    <div>
                        <h2 style={{ margin: 0, color: 'white' }}>Booking Manager</h2>
                        <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Drag Cities AND Artists to build your lineups.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={addDay} className="tb-btn-add">+ Add Show</button>
                        <button onClick={handleExport} className="tb-btn-export" style={{ background: 'var(--accent-blue)', border: 'none', padding: '8px 16px', borderRadius: '6px', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>
                            💾 Export Plan
                        </button>
                    </div>
                </div>

                <div className="tb-timeline">
                    {tourStops.map((stop, index) => (
                        <React.Fragment key={stop.id}>
                            {renderRoute(index)}

                            <div
                                className={`tb-stop-card ${stop.city ? 'filled' : 'empty'}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stop.id)}
                            >
                                <div className="tb-card-header">
                                    <input
                                        type="date"
                                        defaultValue={stop.date}
                                        onChange={(e) => updateDate(stop.id, e.target.value)}
                                        className="tb-date-input"
                                    />
                                    {stop.city ? (
                                        <div className="tb-city-badge">
                                            {stop.city.name}
                                            <span onClick={() => removeCity(stop.id)} className="remove-x">×</span>
                                        </div>
                                    ) : (
                                        <div className="tb-placeholder-text">Drop City...</div>
                                    )}
                                </div>

                                <div className="tb-lineup-area">
                                    {stop.artists.length === 0 && (
                                        <div className="tb-artist-placeholder">Drop Artists Here...</div>
                                    )}
                                    {stop.artists.map(artist => (
                                        <div key={artist} className="tb-artist-chip">
                                            {artist}
                                            <span onClick={() => removeArtist(stop.id, artist)} className="remove-x">×</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
