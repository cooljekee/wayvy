// FriendRouteSteps.jsx — Step through a friend's route, waypoint by waypoint.
// Top half: map with route, numbered pins (past/current/future states).
// Bottom half: photo-first card with description and step navigation.
// Bottom CTA: "Пройти маршрут" — start a new recording guided by this route.

const FRIEND_ROUTE = {
  title: 'Покровка → Чистые пруды',
  friend: { name: 'Аня Соколова', handle: '@anya', avatar: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)' },
  when: '2 часа назад',
  distance: '3,4', duration: '42:18', city: 'Москва',
  poly: 'M 90 380 C 140 350 170 340 180 310 S 240 270 260 240 S 320 200 350 170',
  waypoints: [
    {
      x: 90, y: 380,
      title: 'Самокатная кофейня',
      cat: 'Кофейня', addr: 'Покровка, 27',
      photos: [
        'linear-gradient(135deg, #FFB1A4 0%, #FF5A4E 60%, #C2331F 100%)',
        'linear-gradient(155deg, #FFD9D2 0%, #FF8876 60%, #C2331F 100%)',
        'linear-gradient(175deg, #FCE3A8 0%, #FF8876 100%)',
      ],
      voice: { duration: 18 },
      video: { duration: 9 },
      desc:  'Лучший флэт уайт в районе. Берите столик у окна — оттуда виден Покровский бульвар. Зерно жарят сами, есть овсяное молоко.',
    },
    {
      x: 180, y: 310,
      title: 'Книжная лавка «Фаланстер»',
      cat: 'Магазин', addr: 'Тверская, 17',
      photos: [
        'linear-gradient(160deg, #FCE3A8 0%, #F4B740 60%, #C97500 100%)',
        'linear-gradient(180deg, #FFE7BA 0%, #F4B740 100%)',
      ],
      voice: { duration: 12 },
      video: null,
      desc:  'Маленький, но плотный книжный — нон-фикшн, поэзия, философия. Берёт мало бестселлеров. Можно сидеть и читать.',
    },
    {
      x: 260, y: 240,
      title: 'Бар «Чайка»',
      cat: 'Бар', addr: 'Чистопрудный бульвар, 5',
      photos: [
        'linear-gradient(155deg, #B9ECF0 0%, #14B8C7 55%, #0A7F8A 100%)',
        'linear-gradient(175deg, #7ADBE2 0%, #14B8C7 100%)',
        'linear-gradient(195deg, #C5CBD6 0%, #14B8C7 100%)',
      ],
      voice: null,
      video: { duration: 14 },
      desc:  'Терраса прямо над прудом. Закаты — отдельный жанр. Берите наливку или Сазерак. Дорого, но один раз можно.',
    },
    {
      x: 350, y: 170,
      title: 'Смотровая на крыше',
      cat: 'Точка', addr: 'Чистопрудный, 12',
      photos: [
        'linear-gradient(180deg, #2A2F3A 0%, #5B6577 50%, #FF8876 100%)',
        'linear-gradient(160deg, #0E1116 0%, #5B6577 60%, #FFB1A4 100%)',
      ],
      voice: { duration: 22 },
      video: { duration: 12 },
      desc:  'Вход через двор, лифт на 8-й этаж и потом по лестнице. С неё видно полгорода. Закрыто в дождь.',
    },
  ],
};

function FriendRouteSteps({ dark = true, route = FRIEND_ROUTE, onClose, onRepeat }) {
  const [step, setStep] = React.useState(0);
  const [showSummary, setShowSummary] = React.useState(false);
  const total = route.waypoints.length;
  const w = route.waypoints[step];
  const isLast = step === total - 1;

  const goPrev = () => setStep(s => Math.max(0, s - 1));
  const goNext = () => {
    if (isLast) { setShowSummary(true); return; }
    setStep(s => Math.min(total - 1, s + 1));
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <MapBackground dark={dark}>
        {/* full route polyline — dim future, bright past */}
        <RouteWithProgress poly={route.poly} progress={(step + 1) / total} dark={dark}/>
      </MapBackground>

      {/* numbered pins */}
      {route.waypoints.map((wp, i) => (
        <StepPin key={i}
          x={wp.x} y={wp.y}
          index={i + 1}
          state={i < step ? 'past' : (i === step ? 'current' : 'future')}
          onTap={() => { setStep(i); setShowSummary(false); }}
        />
      ))}

      {/* top floating bar — friend identity + close */}
      <div style={{ position: 'absolute', top: 62, left: 12, right: 12, display: 'flex', gap: 8, zIndex: 12 }}>
        <button onClick={onClose} style={{
          width: 44, height: 44, borderRadius: 999, border: 'none',
          background: dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          color: dark ? '#F4F6FA' : '#0E1116', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(14,17,22,.18)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px 6px 6px',
          background: dark ? 'rgba(22,25,31,0.78)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderRadius: 999, height: 44, boxSizing: 'border-box',
          boxShadow: '0 4px 12px rgba(14,17,22,.18)',
          color: dark ? '#F4F6FA' : '#0E1116', minWidth: 0,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: route.friend.avatar, flexShrink: 0 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, lineHeight: 1.1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{route.friend.name}</div>
            <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 11,
                          color: dark ? '#8A93A4' : '#5B6577',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {route.title} · {route.when}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom content */}
      {showSummary
        ? <RouteSummaryCard route={route} dark={dark} onBack={() => { setShowSummary(false); setStep(total - 1); }} onRepeat={onRepeat}/>
        : <StepCard step={step} total={total} waypoint={w} dark={dark}
                    onPrev={goPrev} onNext={goNext} canPrev={step > 0} isLast={isLast}
                    onRepeat={onRepeat}/>}
    </div>
  );
}

// Step card — photo, copy, navigation, sticky CTA.
function StepCard({ step, total, waypoint, dark, onPrev, onNext, canPrev, isLast, onRepeat }) {
  const [photoIdx, setPhotoIdx] = React.useState(0);
  React.useEffect(() => { setPhotoIdx(0); }, [waypoint]);

  const photos = waypoint.photos || [waypoint.photo].filter(Boolean);
  const heroPhoto = photos[photoIdx] || photos[0];
  const hasMultiPhoto = photos.length > 1;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: dark ? '#16191F' : '#FFFFFF',
      color: dark ? '#F4F6FA' : '#0E1116',
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: '8px 0 0',
      boxShadow: dark ? '0 -16px 40px rgba(0,0,0,0.55)' : '0 -8px 28px rgba(14,17,22,0.12)',
      zIndex: 11, maxHeight: '70%', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ width: 36, height: 5, borderRadius: 999,
                     background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.18)',
                     margin: '6px auto 12px' }}/>

      {/* progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 0 12px' }}>
        {[...Array(total)].map((_, i) => (
          <div key={i} style={{
            width: i === step ? 22 : 6,
            height: 6, borderRadius: 999,
            background: i <= step ? '#FF5A4E' : (dark ? 'rgba(255,255,255,0.16)' : 'rgba(14,17,22,0.12)'),
            transition: 'width 220ms cubic-bezier(.16,1,.3,1), background 220ms ease',
          }}/>
        ))}
      </div>

      {/* photo with overlay nav */}
      <div style={{ position: 'relative', margin: '0 16px', borderRadius: 18, overflow: 'hidden', height: 200, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: heroPhoto, transition: 'background 220ms cubic-bezier(.16,1,.3,1)' }}/>
        {/* photo bottom shade for label legibility */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80,
                       background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)' }}/>
        {/* step counter top-left */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          padding: '5px 10px', borderRadius: 999,
          background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(8px)',
          color: '#fff', fontFamily: 'Manrope', fontWeight: 700, fontSize: 12, letterSpacing: '0.02em',
        }}>Точка {step + 1} из {total}</div>
        {/* photo counter top-right */}
        {hasMultiPhoto && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            padding: '4px 9px', borderRadius: 999,
            background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', fontFamily: 'Manrope', fontWeight: 700, fontSize: 11, fontVariantNumeric: 'tabular-nums',
          }}>{photoIdx + 1} / {photos.length}</div>
        )}
        {/* dots indicator bottom-center if multi photo */}
        {hasMultiPhoto && (
          <div style={{
            position: 'absolute', bottom: 10, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5,
          }}>
            {photos.map((_, i) => (
              <span key={i} style={{
                width: i === photoIdx ? 16 : 5, height: 5, borderRadius: 999,
                background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'all 220ms cubic-bezier(.16,1,.3,1)',
              }}/>
            ))}
          </div>
        )}
        {/* tap zones for prev/next step (only on extreme edges, leaving room for photo carousel) */}
        <button aria-label="previous step" disabled={!canPrev} onClick={onPrev} style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '18%',
          background: 'transparent', border: 'none', cursor: canPrev ? 'pointer' : 'default', opacity: canPrev ? 1 : 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 0 0 8px',
        }}>
          {canPrev && <span style={{
            width: 32, height: 32, borderRadius: 999, background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M15 6l-6 6 6 6"/></svg>
          </span>}
        </button>
        <button aria-label="next step" onClick={onNext} style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '18%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px 0 0',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 999, background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M9 6l6 6-6 6"/></svg>
          </span>
        </button>
        {/* center tap zone to advance photo carousel within the waypoint */}
        {hasMultiPhoto && (
          <button aria-label="next photo"
            onClick={() => setPhotoIdx((photoIdx + 1) % photos.length)}
            style={{
              position: 'absolute', left: '18%', right: '18%', top: 0, bottom: 0,
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}/>
        )}
      </div>

      {/* body */}
      <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 999,
            background: dark ? 'rgba(20,184,199,0.16)' : 'rgba(20,184,199,0.14)',
            color: dark ? '#7ADBE2' : '#0A7F8A',
            fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>
            {waypoint.cat}
          </span>
          <span style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 12, color: dark ? '#8A93A4' : '#5B6577',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {waypoint.addr}
          </span>
        </div>
        <h2 style={{ margin: '2px 0 0', fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
          {waypoint.title}
        </h2>
        <p style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 500, fontSize: 14, lineHeight: 1.5,
                    color: dark ? '#C5CBD6' : '#3A4150' }}>
          {waypoint.desc}
        </p>

        {/* MEDIA STRIP — photo thumbs + voice + video */}
        {(hasMultiPhoto || waypoint.voice || waypoint.video) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'stretch' }}>
            {/* photo thumbs (excluding current) */}
            {hasMultiPhoto && photos.map((bg, i) => (
              <button key={i} onClick={() => setPhotoIdx(i)} style={{
                width: 52, height: 52, borderRadius: 12, padding: 0, flexShrink: 0,
                background: bg, border: 'none', cursor: 'pointer',
                outline: i === photoIdx ? '2px solid #FF5A4E' : 'none',
                outlineOffset: 2,
                opacity: i === photoIdx ? 1 : 0.85,
              }}/>
            ))}
            {waypoint.voice && <StepVoiceTile dark={dark} duration={waypoint.voice.duration}/>}
            {waypoint.video && <StepVideoTile dark={dark} duration={waypoint.video.duration}/>}
          </div>
        )}
      </div>

      {/* sticky bottom action */}
      <div style={{
        padding: '12px 16px 16px',
        background: dark ? '#16191F' : '#FFFFFF',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(14,17,22,0.04)'}`,
      }}>
        <button onClick={onRepeat} style={{
          width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px', borderRadius: 14, border: 'none',
          background: '#FF5A4E', color: '#fff',
          boxShadow: '0 6px 16px rgba(255,90,78,0.40), 0 1px 0 rgba(255,255,255,.18) inset',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/></svg>
          Пройти этот маршрут
        </button>
      </div>
    </div>
  );
}

// Summary shown after reading the last step.
function RouteSummaryCard({ route, dark, onBack, onRepeat }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: dark ? '#16191F' : '#FFFFFF',
      color: dark ? '#F4F6FA' : '#0E1116',
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: '8px 20px 22px',
      boxShadow: dark ? '0 -16px 40px rgba(0,0,0,0.55)' : '0 -8px 28px rgba(14,17,22,0.12)',
      zIndex: 11,
    }}>
      <div style={{ width: 36, height: 5, borderRadius: 999,
                     background: dark ? 'rgba(255,255,255,0.22)' : 'rgba(14,17,22,0.18)',
                     margin: '6px auto 14px' }}/>
      <h2 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 24, letterSpacing: '-0.01em' }}>
        Готово — ты прошёл маршрут глазами.
      </h2>
      <p style={{ margin: '6px 0 14px', fontFamily: 'Manrope', fontWeight: 500, fontSize: 14, color: dark ? '#8A93A4' : '#5B6577', lineHeight: 1.45 }}>
        Можешь пройти его сам — мы сохраним сравнение с маршрутом {route.friend.name.split(' ')[0]}.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(14,17,22,0.06)',
        borderRadius: 16, overflow: 'hidden', marginBottom: 14,
      }}>
        <MetricCell value={route.distance} unit="км"  label="дистанция" dark={dark}/>
        <MetricCell value={route.duration} unit=""    label="у автора"  dark={dark}/>
        <MetricCell value={route.waypoints.length + ''} unit="" label="точки" dark={dark}/>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onRepeat} style={{
          padding: '14px', borderRadius: 14, border: 'none',
          background: '#FF5A4E', color: '#fff',
          boxShadow: '0 6px 16px rgba(255,90,78,0.40), 0 1px 0 rgba(255,255,255,.18) inset',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>Пройти этот маршрут</button>
        <button onClick={onBack} style={{
          padding: '14px', borderRadius: 14, border: 'none',
          background: dark ? 'rgba(255,255,255,0.06)' : '#F4F6FA',
          color: dark ? '#F4F6FA' : '#0E1116',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>Назад к точкам</button>
      </div>
    </div>
  );
}

// Numbered pin variant with three states.
function StepPin({ x, y, index, state, onTap }) {
  const palette = {
    past:    { fill: '#14B8C7', ring: '#FFFFFF', text: '#FFFFFF', size: 32, opacity: 0.78 },
    current: { fill: '#FF5A4E', ring: '#FFFFFF', text: '#FFFFFF', size: 44, opacity: 1 },
    future:  { fill: '#16191F', ring: '#14B8C7', text: '#14B8C7', size: 32, opacity: 0.85 },
  };
  const p = palette[state];
  return (
    <button onClick={onTap} aria-label={`step ${index}`} style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)',
      width: p.size, height: p.size,
      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
      filter: `drop-shadow(0 4px 6px rgba(14,17,22,${state === 'current' ? .35 : .25}))`,
      zIndex: state === 'current' ? 6 : 5,
    }}>
      {state === 'current' && (
        <span style={{
          position: 'absolute', inset: -8, borderRadius: 999,
          background: 'rgba(255,90,78,0.22)',
          animation: 'wv-pin-pulse 1.8s ease-out infinite',
        }}/>
      )}
      <div style={{
        position: 'relative',
        width: p.size, height: p.size, borderRadius: 999,
        background: p.fill, opacity: p.opacity,
        border: `${state === 'current' ? 3 : 2.5}px solid ${p.ring}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        {state === 'past' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.text} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11"/></svg>
        ) : (
          <span style={{
            fontFamily: 'Manrope', fontWeight: 800, fontSize: state === 'current' ? 16 : 13,
            color: p.text, letterSpacing: '-0.01em',
          }}>{index}</span>
        )}
      </div>
    </button>
  );
}

// Polyline with bright "past" portion and dim "future" portion.
function RouteWithProgress({ poly, progress = 0.5, dark }) {
  // Two stacked SVG paths — clip by stroke-dasharray.
  return (
    <svg viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice" width="100%" height="100%"
         style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <defs>
        <filter id="glowfuture" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5"/>
        </filter>
      </defs>
      {/* future (full) — dim */}
      <path d={poly} stroke="#14B8C7" strokeOpacity="0.18" strokeWidth="10" fill="none" strokeLinecap="round"/>
      <path d={poly} stroke="#14B8C7" strokeOpacity="0.55" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeDasharray="2 6"/>
      {/* past (clipped by pathLength + dasharray) — bright */}
      <path d={poly} pathLength="100"
            stroke="#14B8C7" strokeOpacity="0.32" strokeWidth="12" fill="none" strokeLinecap="round"
            strokeDasharray={`${progress * 100} 100`}/>
      <path d={poly} pathLength="100"
            stroke="#14B8C7" strokeWidth="4.5" fill="none" strokeLinecap="round"
            strokeDasharray={`${progress * 100} 100`}/>
    </svg>
  );
}

// ─── STEP MEDIA TILES (read-only playback) ──────────────────────────────────

function StepVoiceTile({ dark, duration }) {
  const fg = dark ? '#F4F6FA' : '#0E1116';
  const bars = [4, 8, 14, 22, 28, 22, 14, 20, 28, 20, 10, 16, 22, 16, 8, 12, 18, 14, 8, 4];
  return (
    <div style={{
      flex: 1, minWidth: 130, padding: '8px 10px', borderRadius: 12,
      background: 'rgba(255,90,78,0.10)',
      border: '1px solid rgba(255,90,78,0.32)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <button aria-label="play voice" style={{
        width: 30, height: 30, borderRadius: 999, border: 'none',
        background: '#FF5A4E', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 3px 8px rgba(255,90,78,0.40)',
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l12 7-12 7V5z"/></svg>
      </button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, height: 26, minWidth: 0 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 2, height: h, borderRadius: 999, flexShrink: 0,
            background: dark ? 'rgba(255,255,255,0.30)' : 'rgba(14,17,22,0.30)',
          }}/>
        ))}
      </div>
      <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 11, color: fg,
        fontVariantNumeric: 'tabular-nums',
      }}>0:{String(duration).padStart(2,'0')}</span>
    </div>
  );
}

// Square video preview — 1:1 to slot next to photo thumbs in the media strip.
function StepVideoTile({ dark, duration }) {
  return (
    <button aria-label="play video" style={{
      width: 52, height: 52, borderRadius: 12, padding: 0, flexShrink: 0,
      background: 'linear-gradient(135deg,#FFB1A4,#FF5A4E)',
      border: 'none', cursor: 'pointer', position: 'relative', overflow: 'hidden',
      boxShadow: '0 3px 10px rgba(14,17,22,0.28)',
    }}>
      {/* subtle inset to read as a video frame, not a photo */}
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 12,
        boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.22)',
        pointerEvents: 'none',
      }}/>
      {/* play glyph centered */}
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 999,
          background: 'rgba(11,13,17,0.55)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><path d="M8 5l12 7-12 7V5z"/></svg>
        </span>
      </span>
      {/* video-marker corner — distinguishes from a photo thumb */}
      <span style={{
        position: 'absolute', top: 4, left: 4,
        display: 'inline-flex', alignItems: 'center',
        padding: '2px 4px', borderRadius: 6,
        background: 'rgba(11,13,17,0.55)', color: '#fff',
      }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM21 8l-3 2v4l3 2V8z"/></svg>
      </span>
      {/* duration badge bottom-right */}
      <span style={{
        position: 'absolute', bottom: 4, right: 4,
        padding: '1px 5px', borderRadius: 4,
        background: 'rgba(11,13,17,0.65)', color: '#fff',
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 9,
        fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', lineHeight: 1.4,
      }}>0:{String(duration).padStart(2,'0')}</span>
    </button>
  );
}

Object.assign(window, { FriendRouteSteps, StepCard, StepPin, RouteSummaryCard, RouteWithProgress, FRIEND_ROUTE, StepVoiceTile, StepVideoTile });