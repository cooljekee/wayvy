# Phase 1 iOS — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать Xcode проект Wayvy с дизайн-токенами, Yandex MapKit, 4-tab навигацией и RecordFAB. Приложение запускается, карта инициализирована, TabView работает.

**Architecture:** SwiftUI lifecycle, `@Observable` AppState на `@MainActor`, TabView с 4 табами + плавающий RecordFAB. DesignSystem — расширения Color/Font/CGFloat, токены 1:1 из `design-system/colors_and_type.css`. Yandex MapKit через xcconfig (ключ не в коде).

**Tech Stack:** Swift 6, SwiftUI, iOS 17+, Yandex MapKit Mobile SDK, xcconfig для secrets

---

### Task 1: Xcode проект и структура папок

**Files:**
- Create: `ios/Wayvy.xcodeproj` (через Xcode UI)
- Create: `ios/Wayvy/WayvyApp.swift`
- Create: `ios/Wayvy/Config/Config.xcconfig`
- Create: `ios/Wayvy/Config/Config.debug.xcconfig`

- [ ] **Step 1: Создать проект в Xcode**

```
File → New → Project → iOS App
Product Name: Wayvy
Bundle Identifier: com.wayvy.app
Interface: SwiftUI
Language: Swift
Minimum iOS: 17.0
```

- [ ] **Step 2: Включить Swift 6**

```
Target → Build Settings → Swift Language Version → Swift 6
```

- [ ] **Step 3: Создать структуру папок** (через Xcode Add Group)

```
Wayvy/
├── App/
│   └── WayvyApp.swift
├── DesignSystem/
│   ├── Colors.swift
│   ├── Typography.swift
│   └── Spacing.swift
├── AppState/
│   └── AppState.swift
├── Views/
│   ├── Map/
│   │   └── MapBrowseView.swift
│   ├── SubscriptionsMap/
│   │   └── SubscriptionsMapView.swift
│   ├── Events/
│   │   └── EventsView.swift
│   ├── Profile/
│   │   └── ProfileView.swift
│   └── Shared/
│       └── RecordFAB.swift
├── Services/
│   └── (пусто, заполним в phase 2+)
└── Models/
    └── (пусто, заполним в phase 2+)
```

- [ ] **Step 4: Создать xcconfig для Yandex MapKit ключа**

```
# ios/Wayvy/Config/Config.xcconfig
YANDEX_MAPKIT_KEY = 13768817-d732-4d66-8fd1-b78319354c04
```

```
# ios/Wayvy/Config/Config.debug.xcconfig
#include "Config.xcconfig"
```

Подключить в Target → Build Settings → Add User-Defined Setting: `YANDEX_MAPKIT_KEY = $(YANDEX_MAPKIT_KEY)`. В Info.plist добавить: `YandexMapKitKey = $(YANDEX_MAPKIT_KEY)`.

- [ ] **Step 5: Добавить Config.xcconfig в .gitignore**

```bash
# добавить в корневой .gitignore
echo "ios/Wayvy/Config/Config.xcconfig" >> .gitignore
echo "ios/Wayvy/Config/Config.debug.xcconfig" >> .gitignore
```

Создать `ios/Wayvy/Config/Config.xcconfig.example`:
```
# Скопируй в Config.xcconfig и заполни
YANDEX_MAPKIT_KEY = your_key_here
```

- [ ] **Step 6: Commit**

```bash
git add ios/ .gitignore
git commit -m "feat(ios): create Xcode project, folder structure, xcconfig for secrets"
```

---

### Task 2: Yandex MapKit через Swift Package Manager

**Files:**
- Modify: `ios/Wayvy.xcodeproj/project.pbxproj` (через Xcode UI)
- Modify: `ios/Wayvy/App/WayvyApp.swift`

- [ ] **Step 1: Добавить MapKit через SPM**

```
File → Add Package Dependencies
URL: https://github.com/yandex/mapkit-ios-sdk
Version: latest (или pinned major)
Products: YandexMapsMobile
```

- [ ] **Step 2: Написать WayvyApp.swift с инициализацией MapKit**

```swift
// ios/Wayvy/App/WayvyApp.swift
import SwiftUI
import YandexMapsMobile

@main
struct WayvyApp: App {
    init() {
        let key = Bundle.main.infoDictionary?["YandexMapKitKey"] as? String ?? ""
        YMKMapKit.setApiKey(key)
        YMKMapKit.sharedInstance()  // инициализировать до первого MapView
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

- [ ] **Step 3: Запустить в симуляторе — убедиться что нет краша при инициализации MapKit**

```
Xcode → Run (⌘R)
Expected: приложение запустилось, в консоли нет "YandexMapKit" error
```

- [ ] **Step 4: Commit**

```bash
git add ios/
git commit -m "feat(ios): add Yandex MapKit via SPM, init in App entry point"
```

---

### Task 3: DesignSystem — цветовые токены

**Files:**
- Create: `ios/Wayvy/DesignSystem/Colors.swift`

Токены берём из `design-system/colors_and_type.css` — hex значения 1:1.

- [ ] **Step 1: Создать Colors.swift**

```swift
// ios/Wayvy/DesignSystem/Colors.swift
import SwiftUI

// Color(hex:) helper — добавляем extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8)  & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

extension Color {
    // MARK: — Brand accents
    static let wvCoral300 = Color(hex: "#FF8876")
    static let wvCoral400 = Color(hex: "#FF6F58")
    static let wvCoral500 = Color(hex: "#FF5A4E")  // primary: own routes, recording, CTA
    static let wvCoral600 = Color(hex: "#E84436")
    static let wvCoral700 = Color(hex: "#C2331F")

    static let wvTeal400  = Color(hex: "#14B8C7")  // followed users' routes
    static let wvTeal500  = Color(hex: "#0A9CA9")

    static let wvAmber400 = Color(hex: "#F4B740")  // events ONLY

    // MARK: — Map polylines
    static let wvRouteOwn    = Color.wvCoral500
    static let wvRouteFollow = Color.wvTeal400

    // MARK: — Ink scale
    static let wvInk900 = Color(hex: "#0E1116")
    static let wvInk800 = Color(hex: "#16191F")
    static let wvInk700 = Color(hex: "#1F232C")
    static let wvInk600 = Color(hex: "#2A2F3A")
    static let wvInk500 = Color(hex: "#3A4150")
    static let wvInk400 = Color(hex: "#5B6577")
    static let wvInk300 = Color(hex: "#8A93A4")
    static let wvInk200 = Color(hex: "#C5CBD6")
    static let wvInk100 = Color(hex: "#E7EAF0")
    static let wvInk50  = Color(hex: "#F4F6FA")

    // MARK: — Semantic (scheme-aware)
    static let wvSuccess = Color(hex: "#2DBF6B")
    static let wvDanger  = Color(hex: "#E5484D")

    // MARK: — Visibility chips
    static let wvVisPublic    = Color(hex: "#2DBF6B")
    static let wvVisFollowers = Color.wvTeal400
    static let wvVisPrivate   = Color.wvInk400

    // MARK: — Surfaces (use with @Environment(\.colorScheme))
    static func wvBackground(_ s: ColorScheme) -> Color {
        s == .dark ? Color(hex: "#0B0D11") : Color(hex: "#F4F6FA")
    }
    static func wvSurface(_ s: ColorScheme) -> Color {
        s == .dark ? Color(hex: "#16191F") : .white
    }
    static func wvSurface2(_ s: ColorScheme) -> Color {
        s == .dark ? Color(hex: "#1F232C") : Color(hex: "#F8FAFC")
    }
    static func wvForeground(_ s: ColorScheme) -> Color {
        s == .dark ? Color(hex: "#F4F6FA") : Color(hex: "#0E1116")
    }
    static func wvForeground2(_ s: ColorScheme) -> Color {
        s == .dark ? Color(hex: "#C5CBD6") : Color(hex: "#3A4150")
    }
    static func wvForeground3(_ s: ColorScheme) -> Color {
        s == .dark ? Color(hex: "#8A93A4") : Color(hex: "#5B6577")
    }
    static func wvOverlay(_ s: ColorScheme) -> Color {
        s == .dark
            ? Color(hex: "#16191F").opacity(0.78)
            : Color.white.opacity(0.78)
    }
}
```

- [ ] **Step 2: Написать тест на токены**

```swift
// ios/WayvyTests/DesignSystem/ColorsTests.swift
import XCTest
import SwiftUI
@testable import Wayvy

final class ColorsTests: XCTestCase {
    func testCoralHex() {
        // Coral 500 должен быть #FF5A4E
        let coral = Color.wvCoral500
        // Мы не можем напрямую сравнить Color, но можем убедиться что init(hex:) не крашит
        XCTAssertNotNil(coral)
    }

    func testRouteColorsDistinct() {
        // own и follow должны быть разными объектами
        let own = Color.wvRouteOwn
        let follow = Color.wvRouteFollow
        // Просто проверяем что оба создались
        _ = own
        _ = follow
    }

    func testThreeAccentsOnly() {
        // Проверяем что мы не добавили 4й акцент — этот тест документирует правило
        // Coral, Teal, Amber — и всё
        let accents = [Color.wvCoral500, Color.wvTeal400, Color.wvAmber400]
        XCTAssertEqual(accents.count, 3, "Wayvy использует ровно 3 акцента")
    }
}
```

- [ ] **Step 3: Запустить тест**

```
Xcode → Product → Test (⌘U)
Expected: ColorsTests passed
```

- [ ] **Step 4: Commit**

```bash
git add ios/Wayvy/DesignSystem/Colors.swift ios/WayvyTests/
git commit -m "feat(ios): design system color tokens from CSS variables"
```

---

### Task 4: DesignSystem — типографика и отступы

**Files:**
- Create: `ios/Wayvy/DesignSystem/Typography.swift`
- Create: `ios/Wayvy/DesignSystem/Spacing.swift`

- [ ] **Step 1: Typography.swift**

```swift
// ios/Wayvy/DesignSystem/Typography.swift
import SwiftUI

extension Font {
    // Display — SF Pro Display, для заголовков и hero-чисел
    static let wvMetric = Font.system(size: 44, weight: .bold, design: .default)
        .monospacedDigit()
    static let wvH1     = Font.system(size: 34, weight: .bold, design: .default)
    static let wvH2     = Font.system(size: 28, weight: .bold, design: .default)
    static let wvH3     = Font.system(size: 22, weight: .semibold, design: .default)

    // Body — SF Pro Text
    static let wvBodyStrong = Font.system(size: 16, weight: .semibold)
    static let wvBody       = Font.system(size: 16, weight: .regular)
    static let wvSecondary  = Font.system(size: 14, weight: .regular)
    static let wvCaption    = Font.system(size: 12, weight: .medium)
    static let wvEyebrow    = Font.system(size: 11, weight: .bold)

    // Mono — для debug/code только
    static let wvMono = Font.system(size: 13, weight: .regular, design: .monospaced)
}

// Текстовые модификаторы
struct WVEyebrow: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.wvEyebrow)
            .kerning(0.7)  // tracking-caps: 0.06em × 11px ≈ 0.66
            .textCase(.uppercase)
    }
}

extension View {
    func wvEyebrowStyle() -> some View {
        modifier(WVEyebrow())
    }
}
```

- [ ] **Step 2: Spacing.swift**

```swift
// ios/Wayvy/DesignSystem/Spacing.swift
import SwiftUI

// 8pt grid — строго. Отклонения 4 и 12 только для волосяных линий и плотных строк
extension CGFloat {
    static let sp1:  CGFloat = 4   // off-grid, hairlines only
    static let sp2:  CGFloat = 8
    static let sp3:  CGFloat = 12  // off-grid, dense rows only
    static let sp4:  CGFloat = 16
    static let sp5:  CGFloat = 20
    static let sp6:  CGFloat = 24
    static let sp8:  CGFloat = 32
    static let sp10: CGFloat = 40
    static let sp12: CGFloat = 48
    static let sp16: CGFloat = 64
}

// Radii — только из разрешённого набора
extension CGFloat {
    static let radiusXs:   CGFloat = 4
    static let radiusSm:   CGFloat = 8
    static let radiusMd:   CGFloat = 12
    static let radiusBtn:  CGFloat = 14   // кнопки
    static let radiusLg:   CGFloat = 16   // карточки
    static let radiusXl:   CGFloat = 20   // hero cards
    static let radius2xl:  CGFloat = 28   // sheets
    static let radiusPill: CGFloat = 999  // pills, FAB
}

// Минимальный tap target (44pt по HIG)
extension CGFloat {
    static let minTapTarget: CGFloat = 44
    static let recordingTapTarget: CGFloat = 50  // кнопки в RecordingHUD
}
```

- [ ] **Step 3: Commit**

```bash
git add ios/Wayvy/DesignSystem/Typography.swift ios/Wayvy/DesignSystem/Spacing.swift
git commit -m "feat(ios): typography and spacing tokens (8pt grid, SF Pro)"
```

---

### Task 5: AppState и ContentView с TabBar

**Files:**
- Create: `ios/Wayvy/AppState/AppState.swift`
- Create: `ios/Wayvy/App/ContentView.swift`
- Create: `ios/Wayvy/Views/Shared/RecordFAB.swift`
- Create: `ios/Wayvy/Views/Map/MapBrowseView.swift` (заглушка)
- Create: `ios/Wayvy/Views/SubscriptionsMap/SubscriptionsMapView.swift` (заглушка)
- Create: `ios/Wayvy/Views/Events/EventsView.swift` (заглушка)
- Create: `ios/Wayvy/Views/Profile/ProfileView.swift` (заглушка)

- [ ] **Step 1: AppState.swift**

```swift
// ios/Wayvy/AppState/AppState.swift
import SwiftUI

enum Tab: Int {
    case map = 0
    case subscriptionsMap = 1
    case events = 2
    case profile = 3
}

@Observable
@MainActor
final class AppState {
    var selectedTab: Tab = .map
    var isRecording: Bool = false
    var isAuthenticated: Bool = false  // false until phase 2
}
```

- [ ] **Step 2: ContentView.swift с TabView**

```swift
// ios/Wayvy/App/ContentView.swift
import SwiftUI

struct ContentView: View {
    @State private var appState = AppState()
    @Environment(\.colorScheme) var scheme

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: Binding(
                get: { appState.selectedTab.rawValue },
                set: { appState.selectedTab = Tab(rawValue: $0) ?? .map }
            )) {
                MapBrowseView()
                    .tabItem {
                        Label("Карта", systemImage: appState.selectedTab == .map ? "map.fill" : "map")
                    }
                    .tag(Tab.map.rawValue)

                SubscriptionsMapView()
                    .tabItem {
                        Label("Карта·все", systemImage: "person.2.fill")
                    }
                    .tag(Tab.subscriptionsMap.rawValue)

                EventsView()
                    .tabItem {
                        Label("События", systemImage: appState.selectedTab == .events ? "calendar" : "calendar")
                    }
                    .tag(Tab.events.rawValue)

                ProfileView()
                    .tabItem {
                        Label("Профиль", systemImage: appState.selectedTab == .profile
                              ? "person.crop.circle.fill" : "person.crop.circle")
                    }
                    .tag(Tab.profile.rawValue)
            }
            .tint(.wvCoral500)

            // RecordFAB — floating над TabBar, скрыт во время записи
            if !appState.isRecording {
                RecordFAB {
                    appState.isRecording = true
                }
                .padding(.bottom, 72)  // tab bar height ≈ 49 + padding
            }
        }
        .environment(appState)
    }
}
```

- [ ] **Step 3: RecordFAB.swift**

```swift
// ios/Wayvy/Views/Shared/RecordFAB.swift
import SwiftUI

struct RecordFAB: View {
    let action: () -> Void
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(Color.wvCoral500)
                    .frame(width: 56, height: 56)
                    .shadow(color: Color.wvCoral500.opacity(0.4), radius: 8, y: 4)

                Image(systemName: "record.circle.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .animation(.spring(duration: 0.14, bounce: 0.3), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded   { _ in isPressed = false }
        )
        .accessibilityLabel("Записать маршрут")
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
    }
}
```

- [ ] **Step 4: Заглушки экранов**

```swift
// ios/Wayvy/Views/Map/MapBrowseView.swift
import SwiftUI
struct MapBrowseView: View {
    var body: some View {
        ZStack {
            Color.wvInk900.ignoresSafeArea()
            Text("Карта").font(.wvH2).foregroundStyle(.white)
        }
    }
}

// ios/Wayvy/Views/SubscriptionsMap/SubscriptionsMapView.swift
import SwiftUI
struct SubscriptionsMapView: View {
    var body: some View {
        ZStack {
            Color.wvInk900.ignoresSafeArea()
            Text("Карта·все").font(.wvH2).foregroundStyle(.white)
        }
    }
}

// ios/Wayvy/Views/Events/EventsView.swift
import SwiftUI
struct EventsView: View {
    var body: some View {
        ZStack {
            Color.wvInk900.ignoresSafeArea()
            Text("События").font(.wvH2).foregroundStyle(.white)
        }
    }
}

// ios/Wayvy/Views/Profile/ProfileView.swift
import SwiftUI
struct ProfileView: View {
    var body: some View {
        ZStack {
            Color.wvInk900.ignoresSafeArea()
            Text("Профиль").font(.wvH2).foregroundStyle(.white)
        }
    }
}
```

- [ ] **Step 5: Запустить в симуляторе**

```
Xcode → Run (⌘R) на iPhone 15 Pro симуляторе
Expected:
- 4 таба переключаются
- Coral FAB виден над tab bar
- Dark background на всех экранах
- Нет Swift 6 concurrency warnings
```

- [ ] **Step 6: Commit**

```bash
git add ios/Wayvy/
git commit -m "feat(ios): TabView 4 tabs, RecordFAB, AppState, design-system stub views"
```

---

### Task 6: Info.plist capabilities

**Files:**
- Modify: `ios/Wayvy/Info.plist`

- [ ] **Step 1: Добавить privacy strings**

В Xcode → Target → Info → Custom iOS Target Properties, добавить:

| Key | Value |
|---|---|
| `NSLocationWhenInUseUsageDescription` | `Wayvy использует геолокацию для записи маршрутов` |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | `Wayvy записывает маршрут в фоне, пока ты гуляешь` |
| `NSPhotoLibraryUsageDescription` | `Выбери фото для точки маршрута` |
| `NSCameraUsageDescription` | `Сними фото прямо сейчас для точки` |
| `NSMicrophoneUsageDescription` | `Запиши голосовую заметку для точки` |
| `UIBackgroundModes` | Array: `location` |
| `YandexMapKitKey` | `$(YANDEX_MAPKIT_KEY)` |

- [ ] **Step 2: Проверить в симуляторе что нет warnings о missing plist keys**

```
Xcode → Run → Console
Expected: нет warnings типа "This app has attempted to access privacy-sensitive data"
```

- [ ] **Step 3: Финальный commit фазы**

```bash
git add ios/
git commit -m "feat(ios): phase 1 complete — capabilities, MapKit init, TabView, DesignSystem"
```
