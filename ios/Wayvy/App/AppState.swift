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
}
