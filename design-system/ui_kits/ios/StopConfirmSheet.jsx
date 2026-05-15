// StopConfirmSheet.jsx — Confirmation when finishing a recording.

function StopConfirmSheet({ dark, distance = '3,42', duration = '42:18', pace = '4,9', points = 7, onSave, onDiscard, onResume }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: dark ? '#16191F' : '#FFFFFF',
      color: dark ? '#F4F6FA' : '#0E1116',
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: '8px 20px 22px',
      boxShadow: dark ? '0 -16px 40px rgba(0,0,0,0.65)' : '0 -8px 32px rgba(14,17,22,0.18)',
      zIndex: 41,
    }}>
      <div style={{ width: 36, height: 5, borderRadius: 999,
                     background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.18)',
                     margin: '6px auto 14px' }}/>

      <h2 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em' }}>
        Завершить маршрут?
      </h2>
      <p style={{ margin: '4px 0 16px', fontFamily: 'Manrope', fontWeight: 500, fontSize: 14, color: dark ? '#8A93A4' : '#5B6577' }}>
        Ты прошёл {distance} км за {duration}. Точек: {points}.
      </p>

      {/* Stats strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(14,17,22,0.06)',
        borderRadius: 16, overflow: 'hidden', marginBottom: 18,
      }}>
        <MetricCell value={distance} unit="км" label="дистанция" dark={dark}/>
        <MetricCell value={duration} unit=""   label="время"     dark={dark}/>
        <MetricCell value={pace}     unit="км/ч" label="темп"    dark={dark}/>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onSave} style={{
          padding: '14px', borderRadius: 14, border: 'none',
          background: '#FF5A4E', color: '#fff',
          boxShadow: '0 4px 14px rgba(255,90,78,0.40), 0 1px 0 rgba(255,255,255,.18) inset',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>Сохранить маршрут</button>
        <button onClick={onResume} style={{
          padding: '14px', borderRadius: 14, border: 'none',
          background: dark ? 'rgba(255,255,255,0.06)' : '#F4F6FA',
          color: dark ? '#F4F6FA' : '#0E1116',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>Продолжить запись</button>
        <button onClick={onDiscard} style={{
          padding: '14px', borderRadius: 14,
          background: 'transparent', color: '#E5484D',
          border: `1px solid ${dark ? 'rgba(229,72,77,0.28)' : 'rgba(229,72,77,0.32)'}`,
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>Удалить запись</button>
      </div>
    </div>
  );
}

Object.assign(window, { StopConfirmSheet });
