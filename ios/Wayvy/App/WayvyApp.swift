import SwiftUI
import YandexMapsMobile

@main
struct WayvyApp: App {
    init() {
        let key = Bundle.main.infoDictionary?["YandexMapKitKey"] as? String ?? ""
        YMKMapKit.setApiKey(key)
        YMKMapKit.sharedInstance()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(AppState())
        }
    }
}
