import SwiftUI
import CoreLocation

struct MapBrowseView: View {
    @Environment(AppState.self) private var appState
    @State private var userLocation: CLLocationCoordinate2D?
    @State private var showSearch = false

    var body: some View {
        ZStack {
            YandexMapView(
                userLocation: userLocation,
                ownPolylines: [],
                followPolylines: []
            )
            .ignoresSafeArea()

            // Search pill — top center
            VStack(spacing: 0) {
                MapSearchPill { showSearch = true }
                    .padding(.horizontal, .sp4)
                    .padding(.top, .sp2)
                Spacer()
            }

            // Control stack — right edge
            VStack(spacing: 0) {
                Spacer().frame(height: 104) // clear search pill
                HStack(spacing: 0) {
                    Spacer()
                    VStack(spacing: .sp2) {
                        MapControlButton(icon: "location.fill", action: centerOnMe)
                        MapControlButton(icon: "square.3.layers.3d", action: {})
                    }
                    .padding(.trailing, .sp3)
                }
                Spacer()
            }
        }
        .sheet(isPresented: $showSearch) {
            // SearchOverlay — Phase 4
            VStack(spacing: .sp4) {
                Text("Поиск")
                    .font(.wvH3)
                    .foregroundStyle(Color.wvInk50)
                Text("Скоро будет")
                    .font(.wvBody)
                    .foregroundStyle(Color.wvInk400)
                Spacer()
            }
            .padding(.top, .sp8)
            .frame(maxWidth: .infinity)
            .background(Color.wvInk900)
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(.radius28)
        }
        .task {
            await LocationService.shared.requestPermission()
        }
    }

    private func centerOnMe() {
        Task {
            if let coord = await LocationService.shared.currentLocation {
                userLocation = coord
            }
        }
    }
}

// MARK: - Search pill

private struct MapSearchPill: View {
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: .sp2) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color.wvInk400)
                Text("Поиск маршрутов и людей")
                    .font(.wvBody)
                    .foregroundStyle(Color.wvInk400)
                Spacer()
            }
            .padding(.horizontal, .sp4)
            .frame(height: 44)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(Capsule().strokeBorder(Color.wvInk700.opacity(0.5), lineWidth: 0.5))
        }
        .buttonStyle(_SpringPress())
        .frame(minHeight: .minTapTarget)
        .accessibilityLabel("Поиск")
    }
}

// MARK: - Control button

private struct MapControlButton: View {
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color.wvInk50)
                .frame(width: 44, height: 44)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: .radiusMd))
                .overlay(
                    RoundedRectangle(cornerRadius: .radiusMd)
                        .strokeBorder(Color.wvInk700.opacity(0.5), lineWidth: 0.5)
                )
        }
        .buttonStyle(_SpringPress())
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
    }
}

private struct _SpringPress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
