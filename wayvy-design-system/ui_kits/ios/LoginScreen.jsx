// LoginScreen.jsx — Welcome / first run. Dark hero with map, light sheet with auth.

function LoginScreen({ dark = true, onContinue }) {
  // Always renders as dark hero — login is the same regardless of OS theme.
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0B0D11', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Hero — map background */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <MapBackground dark={true}>
          {/* a tangle of routes — own + 2 friends */}
          <MapPolyline d="M -20 280 C 80 180 160 320 240 240 S 380 200 440 280" color="#FF5A4E" width={5}/>
          <MapPolyline d="M -20 380 C 100 420 180 320 260 380 S 400 460 440 400" color="#14B8C7" width={4}/>
          <MapPolyline d="M -20 480 C 120 540 200 460 280 540 S 400 580 440 520" color="#14B8C7" width={3} dashed/>
        </MapBackground>

        <MapPin x={120} y={300} kind="own" pulsing/>
        <MapPin x={240} y={240} kind="friend"/>
        <MapPin x={320} y={400} kind="event"/>

        {/* gradient veil to keep type legible */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(11,13,17,0.0) 30%, rgba(11,13,17,0.7) 70%, rgba(11,13,17,1) 100%)',
        }}/>

        {/* brand block */}
        <div style={{ position: 'absolute', left: 24, right: 24, bottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="../../assets/wayvy-mark.svg" alt="" width="60" height="36"/>
            <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 36, color: '#F4F6FA', letterSpacing: '-0.04em', lineHeight: 1 }}>wayvy</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 30, color: '#F4F6FA', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Гуляй вместе.<br/>
            <span style={{ color: '#FF5A4E' }}>Запиши свой город.</span>
          </h1>
          <p style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 500, fontSize: 15, color: '#C5CBD6', lineHeight: 1.45, maxWidth: 320 }}>
            Записывай маршруты, отмечай любимые места, смотри куда сейчас идут друзья.
          </p>
        </div>
      </div>

      {/* Auth sheet */}
      <div style={{
        background: '#16191F',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '20px 20px 24px',
        boxShadow: '0 -16px 40px rgba(0,0,0,0.55)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <button onClick={onContinue} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px', borderRadius: 14, border: 'none',
          background: '#FFFFFF', color: '#0E1116',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 13.4c-.03-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.94-3.6-1.96-1.53-.16-3 .9-3.78.9-.78 0-1.98-.88-3.27-.86-1.68.02-3.24.98-4.1 2.48-1.76 3.04-.45 7.55 1.25 10.02.83 1.21 1.82 2.58 3.12 2.53 1.25-.05 1.72-.81 3.23-.81s1.94.81 3.27.78c1.35-.02 2.21-1.24 3.04-2.46.96-1.41 1.36-2.78 1.38-2.85-.03-.01-2.65-1.01-2.67-4.01zM14.92 5.94c.69-.84 1.16-2 1.03-3.16-1 .04-2.2.66-2.92 1.5-.64.74-1.21 1.92-1.06 3.06 1.11.09 2.25-.56 2.95-1.4z"/></svg>
          Продолжить с Apple
        </button>
        <button onClick={onContinue} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.16)',
          background: 'transparent', color: '#F4F6FA',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 7 10 6 10-6"/></svg>
          Email
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }}/>
          <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 11, color: '#8A93A4', letterSpacing: '0.06em', textTransform: 'uppercase' }}>или по номеру</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.10)' }}/>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '13px 12px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#F4F6FA', fontFamily: 'Manrope', fontWeight: 600, fontSize: 15,
          }}>
            🇷🇺 +7
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <input placeholder="(900) 000-00-00" style={{
            flex: 1, padding: '13px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: '#F4F6FA', fontFamily: 'Manrope', fontWeight: 500, fontSize: 15,
            outline: 'none',
          }}/>
        </div>

        <p style={{
          margin: '6px 4px 0', fontFamily: 'Manrope', fontWeight: 500, fontSize: 11, color: '#5B6577', lineHeight: 1.4,
        }}>
          Продолжая, ты соглашаешься с <span style={{ color: '#C5CBD6', textDecoration: 'underline' }}>условиями</span> и <span style={{ color: '#C5CBD6', textDecoration: 'underline' }}>политикой конфиденциальности</span>.
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen });
