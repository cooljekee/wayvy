// RecordingHUD.jsx — Active recording floating bar + add-waypoint sheet trigger

function RecordingHUD({ dark = true, distance = '1,24', time = '18:42', pace = '4,9', onAddPoint, onStop, onPause, paused = false }) {
  return (
    <div style={{
      background: dark ? 'rgba(22, 25, 31, 0.82)' : 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      border: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(14,17,22,0.06)',
      borderRadius: 26,
      padding: 12,
      color: dark ? '#F4F6FA' : '#0E1116',
      boxShadow: dark
        ? '0 16px 36px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.35)'
        : '0 12px 28px rgba(14,17,22,0.14)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
        {/* recording indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px 5px 7px',
                     background: 'rgba(255, 90, 78, 0.18)', borderRadius: 999 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#FF5A4E',
                         animation: paused ? 'none' : 'wv-rec-pulse 1.6s ease-in-out infinite' }}/>
          <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 10, color: '#FFD9D2',
                         letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {paused ? 'Пауза' : 'Запись'}
          </span>
        </div>
        <div style={{ flex: 1, fontFamily: 'Manrope', fontWeight: 600, fontSize: 12,
                      color: dark ? '#8A93A4' : '#5B6577' }}>
          Москва · 7 точек
        </div>
      </div>

      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end', padding: '2px 6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 32, lineHeight: 1,
                         fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em',
                         color: dark ? '#F4F6FA' : '#0E1116' }}>{distance}</span>
          <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 10,
                         color: dark ? '#8A93A4' : '#5B6577', letterSpacing: '0.06em', textTransform: 'uppercase' }}>км</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 32, lineHeight: 1,
                         fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em',
                         color: dark ? '#F4F6FA' : '#0E1116' }}>{time}</span>
          <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 10,
                         color: dark ? '#8A93A4' : '#5B6577', letterSpacing: '0.06em', textTransform: 'uppercase' }}>время</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: 0.78 }}>
          <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, lineHeight: 1,
                         fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                         color: dark ? '#F4F6FA' : '#0E1116' }}>{pace}</span>
          <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 10,
                         color: dark ? '#8A93A4' : '#5B6577', letterSpacing: '0.06em', textTransform: 'uppercase' }}>км/ч</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onAddPoint} style={{
          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px', borderRadius: 16, border: 'none',
          background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.06)',
          color: dark ? '#F4F6FA' : '#0E1116',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          Добавить точку
        </button>
        <button onClick={onPause} aria-label="pause" style={{
          width: 50, height: 50, borderRadius: 16, border: 'none',
          background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,17,22,0.06)',
          color: dark ? '#F4F6FA' : '#0E1116', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {paused
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16l14-8z"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="5" height="14" rx="1.5"/><rect x="14" y="5" width="5" height="14" rx="1.5"/></svg>}
        </button>
        <button onClick={onStop} aria-label="stop" style={{
          width: 50, height: 50, borderRadius: 16, border: 'none',
          background: '#FF5A4E', color: '#fff',
          boxShadow: '0 4px 14px rgba(255,90,78,.45)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { RecordingHUD });
