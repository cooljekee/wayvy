import SwiftUI

@Observable
@MainActor
final class AppState {
    enum Tab: String, CaseIterable {
        case map
        case subscriptions
        case events
        case profile
    }

    var selectedTab: Tab = .map
    var isAuthenticated: Bool = false
    var isRecording: Bool = false
    var isShowingRecording: Bool = false
    var currentUserPhone: String?
    var jwtToken: String?

    init() {
        if let saved = Keychain.load(forKey: "jwt") {
            jwtToken = saved
            isAuthenticated = true
        }
    }
}
