// App.jsx — Wraps screens into a navigable iOS prototype.

function WayvyApp() {
  const [dark, setDark] = React.useState(true);   // dark mode first-class (per spec)
  const [tab, setTab] = React.useState('map');
  const [filter, setFilter] = React.useState('all');
  const [recording, setRecording] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [showWaypoint, setShowWaypoint] = React.useState(false);
  const [showFriends, setShowFriends] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 1800);
  };

  const goTab = (t) => {
    if (t === 'record') {
      setRecording(true);
      setTab('map');
    } else {
      setTab(t);
    }
  };

  return (
    <div data-theme={dark ? 'dark' : 'light'} data-screen-label={tab} style={{ position: 'relative', width: '100%', height: '100%', background: dark ? '#0B0D11' : '#F4F6FA' }}>
      {/* Screen */}
      {!recording && tab === 'map' && (
        <MapBrowseScreen dark={dark} filter={filter} setFilter={setFilter}
          onStartRecording={() => setRecording(true)}
          onTapPin={() => {}} onTapTab={goTab}/>
      )}
      {recording && (
        <RecordingScreen dark={dark} paused={paused} setPaused={setPaused}
          onStop={() => { setRecording(false); setPaused(false); showToast('Маршрут сохранён · 3,4 км'); }}
          onAddWaypoint={() => setShowWaypoint(true)}
          onTapTab={goTab}/>
      )}
      {tab === 'events' && !recording && <EventsScreen dark={dark} onTapTab={goTab}/>}
      {tab === 'profile' && !recording && <ProfileScreen dark={dark} onTapTab={goTab}/>}

      {/* friend list overlay */}
      {showFriends && <FriendsList dark={dark} onClose={() => setShowFriends(false)}/>}

      {/* waypoint sheet */}
      {showWaypoint && (
        <>
          <div onClick={() => setShowWaypoint(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(14,17,22,0.42)', zIndex: 40,
            animation: 'wv-fade-in 220ms ease-out',
          }}/>
          <div style={{ position: 'absolute', inset: 0, zIndex: 41, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <WaypointSheet dark={dark}
                onCancel={() => setShowWaypoint(false)}
                onSave={() => { setShowWaypoint(false); showToast('Точка добавлена'); }}/>
            </div>
          </div>
        </>
      )}

      {/* toast */}
      {toast && (
        <div style={{
          position: 'absolute', top: 110, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(14,17,22,0.92)', color: '#F4F6FA',
          padding: '10px 16px', borderRadius: 999,
          fontFamily: 'Manrope', fontWeight: 600, fontSize: 13,
          boxShadow: '0 8px 22px rgba(0,0,0,0.4)', zIndex: 50,
          animation: 'wv-toast 1800ms cubic-bezier(.16,1,.3,1)',
        }}>{toast}</div>
      )}

      {/* dark mode toggle (dev only) */}
      <button onClick={() => setDark(!dark)} title="Toggle theme" style={{
        position: 'absolute', top: 16, right: 90, zIndex: 60,
        width: 28, height: 28, borderRadius: 999, border: 'none',
        background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.06)',
        color: dark ? '#F4F6FA' : '#0E1116', cursor: 'pointer', fontSize: 14,
        display: 'none', // hidden by default — IOSDevice covers this corner
      }}>{dark ? '☼' : '☾'}</button>
    </div>
  );
}

Object.assign(window, { WayvyApp });
