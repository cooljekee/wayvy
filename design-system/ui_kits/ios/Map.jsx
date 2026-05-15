// Map.jsx — Map background tile, pins, polylines (used by all map screens)
// Inline SVG faux map; in production this is Yandex MapKit.

function MapBackground({ dark = false, children, style = {} }) {
  const bg = dark
    ? 'linear-gradient(180deg, #1A1D24 0%, #11141A 100%)'
    : 'linear-gradient(180deg, #ECEEF2 0%, #DFE4EB 100%)';
  const road    = dark ? '#2A2F3A' : '#FFFFFF';
  const roadEdge= dark ? '#1F232C' : '#E0E5EC';
  const park    = dark ? '#1B2620' : '#D4E7D5';
  const water   = dark ? '#1A2A3A' : '#C8DDEE';
  const label   = dark ? '#5B6577' : '#8A93A4';
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden', ...style }}>
      <svg viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }}>
        {/* park */}
        <path d="M-30,420 Q60,360 180,400 T420,380 L420,560 Q300,540 180,580 T-30,560 Z" fill={park} opacity={dark ? 0.7 : 1} />
        {/* water */}
        <path d="M-20,720 Q120,690 220,710 T420,690 L420,920 L-20,920 Z" fill={water} opacity={dark ? 0.75 : 1} />
        {/* roads — main */}
        <path d="M-40,180 Q120,200 250,150 T440,170" stroke={roadEdge} strokeWidth="14" fill="none"/>
        <path d="M-40,180 Q120,200 250,150 T440,170" stroke={road} strokeWidth="10" fill="none"/>
        <path d="M60,-40 Q90,200 140,420 T210,860" stroke={roadEdge} strokeWidth="12" fill="none"/>
        <path d="M60,-40 Q90,200 140,420 T210,860" stroke={road} strokeWidth="8" fill="none"/>
        <path d="M340,-40 Q330,260 280,460 T260,860" stroke={roadEdge} strokeWidth="12" fill="none"/>
        <path d="M340,-40 Q330,260 280,460 T260,860" stroke={road} strokeWidth="8" fill="none"/>
        <path d="M-40,640 Q120,620 280,650 T440,620" stroke={roadEdge} strokeWidth="12" fill="none"/>
        <path d="M-40,640 Q120,620 280,650 T440,620" stroke={road} strokeWidth="8" fill="none"/>
        {/* roads — thin */}
        <path d="M-20,320 Q200,310 420,300" stroke={road} strokeWidth="4" fill="none" opacity={dark ? 0.6 : 1}/>
        <path d="M200,-20 Q200,300 200,860" stroke={road} strokeWidth="4" fill="none" opacity={dark ? 0.6 : 1}/>
        {/* faux labels */}
        <text x="48" y="270" fontFamily="Manrope, sans-serif" fontSize="11" fontWeight="600" fill={label} opacity="0.7">УЛ. ПОКРОВКА</text>
        <text x="220" y="510" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="600" fill={label} opacity="0.6">ЧИСТЫЕ ПРУДЫ</text>
        <text x="50" y="510" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="600" fill={label} opacity="0.55">МИЛЮТИНСКИЙ САД</text>
        <text x="240" y="780" fontFamily="Manrope, sans-serif" fontSize="10" fontWeight="600" fill={label} opacity="0.6">НАБЕРЕЖНАЯ</text>
      </svg>
      {children}
    </div>
  );
}

// Polyline overlay
function MapPolyline({ d, color = '#FF5A4E', width = 4, glow = true, dashed = false }) {
  return (
    <svg viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"
         style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {glow && <path d={d} stroke={color} strokeOpacity="0.28" strokeWidth={width + 6} fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
      <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={dashed ? '2 8' : undefined}/>
    </svg>
  );
}

// Pin variants ----------------------------------------------------------------
function MapPin({ x, y, kind = 'own', label, pulsing = false }) {
  const colors = {
    own:    '#FF5A4E',
    friend: '#14B8C7',
    event:  '#F4B740',
  };
  const fill = colors[kind] || colors.own;
  const isEvent = kind === 'event';
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)',
      filter: 'drop-shadow(0 4px 6px rgba(14,17,22,.25))',
    }}>
      {pulsing && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 6, width: 36, height: 36,
          marginLeft: -18, borderRadius: 999, background: fill, opacity: .35,
          animation: 'wv-pin-pulse 2s ease-out infinite',
        }}/>
      )}
      {isEvent ? (
        <svg width="42" height="42" viewBox="0 0 48 48" style={{ display: 'block' }}>
          <rect x="3" y="3" width="42" height="42" rx="13" fill={fill} stroke="#fff" strokeWidth="2.5"/>
          {/* clean inset "ticket": white capsule with single thin bar */}
          <rect x="13" y="14" width="22" height="20" rx="3" fill="#FFFFFF"/>
          <rect x="13" y="14" width="22" height="5" rx="2" fill={fill} opacity="0.85"/>
          <circle cx="24" cy="26" r="2.4" fill={fill}/>
        </svg>
      ) : (
        <svg width="38" height="48" viewBox="0 0 44 54" style={{ display: 'block' }}>
          <path d="M22 53 C30 38, 42 32, 42 21 A20 20 0 1 0 2 21 C2 32, 14 38, 22 53Z" fill={fill} stroke="#fff" strokeWidth="2.5"/>
          {kind === 'friend'
            ? <g fill="#fff">
                <circle cx="22" cy="18" r="4.5"/>
                <path d="M13.5 30 C13.5 25, 17.5 23.5, 22 23.5 C26.5 23.5, 30.5 25, 30.5 30 Z"/>
              </g>
            : <circle cx="22" cy="21" r="5.5" fill="#fff"/>}
        </svg>
      )}
      {label && (
        <div style={{
          position: 'absolute', left: '50%', top: -28, transform: 'translateX(-50%)',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 11, color: '#0E1116',
          background: 'rgba(255,255,255,.92)', padding: '3px 8px', borderRadius: 999,
          whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(14,17,22,.18)',
        }}>{label}</div>
      )}
    </div>
  );
}

// Cluster pin (count)
function MapCluster({ x, y, count, kind = 'own' }) {
  const fill = { own: '#FF5A4E', friend: '#14B8C7', event: '#F4B740' }[kind] || '#FF5A4E';
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)',
      width: 48, height: 48, borderRadius: 999, background: fill, border: '3px solid #fff',
      boxShadow: '0 2px 6px rgba(14,17,22,.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Manrope', fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.01em',
    }}>{count}</div>
  );
}

// "Me" location dot
function MeDot({ x, y }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)',
      width: 18, height: 18, borderRadius: 999, background: '#3B82F6',
      border: '3px solid #fff', boxShadow: '0 0 0 6px rgba(59,130,246,.16), 0 2px 6px rgba(0,0,0,.2)',
    }}/>
  );
}

Object.assign(window, { MapBackground, MapPolyline, MapPin, MapCluster, MeDot });
