// Screens.jsx — Five core screens for Wayvy iOS, switched by App.jsx

// 1. MapBrowse — passive: see friends' routes & events on map ─────────────────
function MapBrowseScreen({ dark, filter, setFilter, onStartRecording, onTapPin, onTapTab, onTapSearch }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapBackground dark={dark}>
        {/* My route (yesterday) */}
        <MapPolyline d="M 60 760 Q 90 600 140 480 T 200 280 T 320 180" color="#FF5A4E" width={4.5} glow/>
        {/* Friend's route */}
        <MapPolyline d="M -10 360 Q 80 380 160 320 T 280 360 T 380 320" color="#14B8C7" width={3.5} glow/>
      </MapBackground>

      {/* Status bar safe area — taken by IOSStatusBar in the device frame */}

      {/* top — search */}
      <div style={{ position: 'absolute', top: 64, left: 16, right: 16, zIndex: 10 }}>
        <SearchPill dark={dark} onClick={onTapSearch}/>
      </div>

      {/* filter chips */}
      <div style={{ position: 'absolute', top: 120, left: 16, right: 16, zIndex: 10, overflowX: 'auto', display: 'flex' }}>
        <FilterChips dark={dark} value={filter} onChange={setFilter}/>
      </div>

      {/* right-side controls */}
      <div style={{ position: 'absolute', top: 180, right: 16, zIndex: 10 }}>
        <ControlStack dark={dark}/>
      </div>

      {/* pins — labels only on "own" active recording for context, rest unlabelled (label on tap in production) */}
      <MapPin x={140} y={520} kind="own"    label="Моя прогулка" pulsing/>
      <MapPin x={250} y={310} kind="friend"/>
      <MapPin x={310} y={550} kind="event"/>
      <MapPin x={80}  y={680} kind="friend"/>
      <MapPin x={340} y={210} kind="own"/>
      <MapCluster x={210} y={420} count={12} kind="friend"/>
      <MeDot x={180} y={580}/>

      {/* bottom — record FAB + tab bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 90, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <RecordFAB onClick={onStartRecording}/>
      </div>
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 24, zIndex: 10 }}>
        <TabBar active="map" dark={dark} onChange={onTapTab}/>
      </div>
    </div>
  );
}

// 2. Recording — active GPS, minimal HUD ─────────────────────────────────────
function RecordingScreen({ dark, paused, setPaused, onStop, onAddWaypoint, onTapTab }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapBackground dark={dark}>
        {/* live route accumulating */}
        <MapPolyline d="M 200 600 Q 220 540 200 460 T 150 320 T 100 200" color="#FF5A4E" width={5} glow/>
      </MapBackground>

      {/* corner control stack only — no orphan clock */}
      <div style={{ position: 'absolute', top: 62, right: 16, zIndex: 10 }}>
        <ControlStack dark={dark}/>
      </div>

      {/* live position dot — sits ABOVE the HUD so user sees themselves */}
      <MeDot x={200} y={600}/>
      <MapPin x={150} y={320} kind="own"/>
      <MapPin x={100} y={200} kind="own"/>

      {/* bottom HUD */}
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 24, zIndex: 10 }}>
        <RecordingHUD
          dark={dark} paused={paused}
          onPause={() => setPaused(!paused)}
          onAddPoint={onAddWaypoint}
          onStop={onStop}
        />
      </div>
    </div>
  );
}

// 3. Events list (split: map+list)  ──────────────────────────────────────────
function EventsScreen({ dark, onTapTab }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: dark ? '#0B0D11' : '#F4F6FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '62px 20px 8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: dark ? '#F4F6FA' : '#0E1116' }}>События</h1>
          <p style={{ margin: '4px 0 0', fontFamily: 'Manrope', fontSize: 14, color: dark ? '#8A93A4' : '#5B6577' }}>В Москве на этой неделе</p>
        </div>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 14px 10px 12px', borderRadius: 999, border: 'none',
          background: '#FF5A4E', color: '#fff',
          boxShadow: '0 4px 14px rgba(255,90,78,0.36), 0 1px 0 rgba(255,255,255,.18) inset',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          marginBottom: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M12 5v14M5 12h14"/></svg>
          Создать
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader dark={dark}>Сегодня</SectionHeader>
        <EventCard dark={dark}
          month="Май" day="15" title="Закат на Воробьёвых" time="20:42" place="Смотровая"
          visibility="public" going
          attendees={['linear-gradient(135deg,#FFB1A4,#FF5A4E)', 'linear-gradient(135deg,#7ADBE2,#14B8C7)', 'linear-gradient(135deg,#FCE3A8,#F4B740)']}
          extra={14}
        />

        <SectionHeader dark={dark}>На неделе</SectionHeader>
        <EventCard dark={dark}
          month="Май" day="18" title="Пикник в Парке Горького" time="18:00" place="Главный вход"
          visibility="followers"
          attendees={['linear-gradient(135deg,#FFB1A4,#FF5A4E)', 'linear-gradient(135deg,#7ADBE2,#14B8C7)', 'linear-gradient(135deg,#FCE3A8,#F4B740)']}
          extra={5}
        />
        <EventCard dark={dark}
          month="Май" day="19" title="Велозаезд по набережной" time="07:30" place="Якиманка"
          visibility="public"
          attendees={['linear-gradient(135deg,#B9ECF0,#0A9CA9)', 'linear-gradient(135deg,#FFB1A4,#FF5A4E)']}
          extra={9}
        />
        <EventCard dark={dark}
          month="Май" day="21" title="Кофе и Хохловка" time="11:00" place="м. Китай-город"
          visibility="followers"
          attendees={['linear-gradient(135deg,#FCE3A8,#F4B740)']}
          extra={3}
        />
      </div>

      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 24, zIndex: 10 }}>
        <TabBar active="events" dark={dark} onChange={onTapTab}/>
      </div>
    </div>
  );
}

function SectionHeader({ children, dark }) {
  return (
    <div style={{
      fontFamily: 'Manrope', fontWeight: 700, fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: dark ? '#8A93A4' : '#5B6577', padding: '8px 4px 0',
    }}>{children}</div>
  );
}

// 4. Profile  ─────────────────────────────────────────────────────────────
function ProfileScreen({ dark, onTapTab }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: dark ? '#0B0D11' : '#F4F6FA', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* coral cover with subtle topo lines */}
      <div style={{ height: 168, background: 'linear-gradient(150deg, #FF8876 0%, #FF5A4E 60%, #C2331F 100%)', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 402 168" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: .18 }}>
          <path d="M-20 80 C 100 70, 160 110, 240 100 S 380 60, 440 78" stroke="#fff" strokeWidth="1.2" fill="none"/>
          <path d="M-20 100 C 100 90, 160 130, 240 120 S 380 80, 440 98" stroke="#fff" strokeWidth="1.2" fill="none"/>
          <path d="M-20 120 C 100 110, 160 150, 240 140 S 380 100, 440 118" stroke="#fff" strokeWidth="1.2" fill="none"/>
          <path d="M-20 140 C 100 130, 160 170, 240 160 S 380 120, 440 138" stroke="#fff" strokeWidth="1.2" fill="none"/>
        </svg>
        {/* settings cog top-right */}
        <button style={{
          position: 'absolute', top: 62, right: 16,
          width: 38, height: 38, borderRadius: 999,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(12px) saturate(140%)',
          WebkitBackdropFilter: 'blur(12px) saturate(140%)',
          border: '1px solid rgba(255,255,255,0.20)',
          color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '0 20px 100px', flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -44 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 999,
            background: 'linear-gradient(135deg,#FFB1A4 0%, #FF5A4E 100%)',
            border: `4px solid ${dark ? '#0B0D11' : '#F4F6FA'}`,
            boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 32, color: '#fff', letterSpacing: '-0.02em',
          }}>А</div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <h1 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', color: dark ? '#F4F6FA' : '#0E1116' }}>Аня Соколова</h1>
            <div style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 13, color: dark ? '#8A93A4' : '#5B6577' }}>@anya · Москва</div>
          </div>
        </div>

        {/* stats row — sentence-case labels, no wrap */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: '16px 0 8px' }}>
          <Stat value="42"  label="маршрутов" dark={dark}/>
          <Stat value="186" label="подписок"  dark={dark}/>
          <Stat value="91"  label="на тебя"   dark={dark}/>
          <Stat value="312" label="км пройдено" dark={dark}/>
        </div>

        <button style={{
          width: '100%', padding: '11px', borderRadius: 12, border: 'none',
          background: dark ? '#1F232C' : '#FFFFFF',
          color: dark ? '#F4F6FA' : '#0E1116',
          border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(14,17,22,0.06)',
          fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          marginTop: 8,
        }}>Редактировать профиль</button>

        <SectionHeader dark={dark}>Последние маршруты</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <RouteCard dark={dark} mine
            author="Я" when="вчера"
            avatar="linear-gradient(135deg,#FFB1A4,#FF5A4E)"
            title="Покровка → Чистые пруды"
            city="Москва · 3 точки" visibility="public"
            distance="3,4" duration="42:18" pace="4,9"
            poly="M10,110 C30,90 60,80 70,55 S100,40 118,18"
          />
          <RouteCard dark={dark} mine
            author="Я" when="суббота"
            avatar="linear-gradient(135deg,#FFB1A4,#FF5A4E)"
            title="Парк Горького утром"
            city="Москва · 5 точек" visibility="followers"
            distance="6,1" duration="1:18" pace="4,6"
            poly="M10,40 C30,55 50,100 70,80 S100,100 118,60"
          />
          <RouteCard dark={dark} mine
            author="Я" when="11 мая"
            avatar="linear-gradient(135deg,#FFB1A4,#FF5A4E)"
            title="Бульварное кольцо" city="Москва · 8 точек"
            visibility="private"
            distance="4,7" duration="58:02" pace="4,8"
            poly="M14,70 C30,30 60,100 75,60 S100,30 118,80"
          />
        </div>
      </div>

      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 24, zIndex: 10 }}>
        <TabBar active="profile" dark={dark} onChange={onTapTab}/>
      </div>
    </div>
  );
}

function Stat({ value, label, dark }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 20,
                     fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
                     color: dark ? '#F4F6FA' : '#0E1116' }}>{value}</span>
      <span style={{ fontFamily: 'Manrope', fontWeight: 500, fontSize: 11, lineHeight: 1.2,
                     color: dark ? '#8A93A4' : '#5B6577' }}>{label}</span>
    </div>
  );
}

// 5. Friends list (overlay sheet)  ──────────────────────────────────────────
function FriendsList({ dark, onClose }) {
  const [states, setStates] = React.useState({});
  const set = (k, v) => setStates({ ...states, [k]: v });
  return (
    <div style={{ position: 'absolute', inset: 0, background: dark ? '#0B0D11' : '#F4F6FA', zIndex: 30, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '62px 20px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: dark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
          color: dark ? '#F4F6FA' : '#0E1116', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(14,17,22,.08)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <h1 style={{ margin: 0, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 22, letterSpacing: '-0.01em', color: dark ? '#F4F6FA' : '#0E1116' }}>Подписки</h1>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 40px' }}>
        <FollowRow dark={dark}
          name="Аня Соколова" handle="@anya" meta="@anya · 42 маршрута"
          avatar="linear-gradient(135deg,#FFB1A4,#FF5A4E)"
          state={states.anya || 'following'} onClick={() => set('anya', states.anya === 'following' ? 'default' : 'following')}/>
        <FollowRow dark={dark}
          name="Дима К." handle="@dima_k" meta="@dima_k · Москва"
          avatar="linear-gradient(135deg,#7ADBE2,#14B8C7)"
          state={states.dima || 'following'} onClick={() => set('dima', states.dima === 'following' ? 'default' : 'following')}/>
        <FollowRow dark={dark}
          name="Лиза Бар" handle="@liza" meta="@liza · приватный профиль"
          avatar="linear-gradient(135deg,#FCE3A8,#F4B740)"
          state={states.liza || 'requested'} onClick={() => set('liza', states.liza === 'requested' ? 'default' : 'requested')}/>
        <FollowRow dark={dark}
          name="Костя" handle="@kostya" meta="подписан на тебя · 12 маршрутов"
          avatar="linear-gradient(135deg,#B9ECF0,#0A9CA9)"
          state={states.kostya || 'back'} onClick={() => set('kostya', states.kostya === 'back' ? 'following' : 'back')}/>
        <FollowRow dark={dark}
          name="Маша Кутья" handle="@mash" meta="@mash · 8 маршрутов"
          avatar="linear-gradient(135deg,#C5CBD6,#5B6577)"
          state={states.mash || 'default'} onClick={() => set('mash', states.mash === 'default' ? 'following' : 'default')}/>
      </div>
    </div>
  );
}

Object.assign(window, { MapBrowseScreen, RecordingScreen, EventsScreen, ProfileScreen, FriendsList, SectionHeader, Stat });
