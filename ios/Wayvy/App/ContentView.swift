import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        if appState.isAuthenticated {
            mainView
        } else {
            NavigationStack {
                PhoneInputView()
            }
        }
    }

    // MARK: - Main tab view

    @ViewBuilder
    private var mainView: some View {
        @Bindable var appState = appState
        ZStack(alignment: .bottomTrailing) {
            TabView(selection: $appState.selectedTab) {
                MapBrowseView()
                    .tag(AppState.Tab.map)
                    .tabItem { Label("Карта", systemImage: "map") }

                SubscriptionsMapView()
                    .tag(AppState.Tab.subscriptions)
                    .tabItem { Label("Карта·все", systemImage: "person.2") }

                EventsView()
                    .tag(AppState.Tab.events)
                    .tabItem { Label("События", systemImage: "calendar") }

                ProfileView(subject: .own)
                    .tag(AppState.Tab.profile)
                    .tabItem { Label("Профиль", systemImage: "person.crop.circle") }
            }

            if !appState.isRecording {
                RecordFAB()
            }
        }
        .fullScreenCover(isPresented: $appState.isShowingRecording) {
            RecordingView()
        }
    }

    private func tab(_ title: String) -> some View {
        ZStack {
            Color.wvInk900.ignoresSafeArea()
            Text(title).foregroundStyle(.white)
        }
    }
}

// MARK: - RecordFAB

private struct RecordFAB: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Button(action: { appState.isShowingRecording = true }) {
            Circle()
                .fill(Color.wvCoral500)
                .frame(width: 56, height: 56)
                .overlay {
                    Image(systemName: "record.circle.fill")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(.white)
                }
        }
        .buttonStyle(_SpringPress())
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
        .padding(.trailing, .sp4)
        .padding(.bottom, 72)
        .accessibilityLabel("Начать запись")
    }
}

private struct _SpringPress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
