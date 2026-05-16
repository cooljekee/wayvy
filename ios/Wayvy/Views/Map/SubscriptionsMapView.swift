import SwiftUI
import CoreLocation

// MARK: - ViewModel

@Observable
@MainActor
final class SubscriptionsMapViewModel {
    var pins: [WaypointPin] = []
    var mapWaypoints: [MapWaypoint] = []
    var tappedWaypoint: MapWaypoint?
    var showWaypointDetail = false
    var showCreatePoint = false
    var centerCoordinate: CLLocationCoordinate2D?
    private var lastFetchCenter: CLLocationCoordinate2D?
    private var isFetching = false

    func onAppear() async {
        let coord = await LocationService.shared.currentLocation
            ?? CLLocationCoordinate2D(latitude: 55.7558, longitude: 37.6173) // Moscow fallback
        centerCoordinate = coord
        await fetchBBox(center: coord)
    }

    func onCameraIdle(_ center: CLLocationCoordinate2D) async {
        // Skip if we moved < 500m since last fetch
        if let last = lastFetchCenter, distance(last, center) < 500 { return }
        await fetchBBox(center: center)
    }

    func onWaypointTap(_ id: UUID) {
        guard let w = mapWaypoints.first(where: { $0.id == id }) else { return }
        tappedWaypoint = w
        showWaypointDetail = true
    }

    // MARK: - Private

    private func fetchBBox(center: CLLocationCoordinate2D) async {
        guard !isFetching else { return }
        isFetching = true
        lastFetchCenter = center

        // ~3km half-side bbox
        let delta = 0.027
        let minLon = center.longitude - delta
        let minLat = center.latitude  - delta
        let maxLon = center.longitude + delta
        let maxLat = center.latitude  + delta

        do {
            let items = try await WaypointService.shared.fetchByBBox(
                minLon: minLon, minLat: minLat,
                maxLon: maxLon, maxLat: maxLat
            )
            mapWaypoints = items
            pins = items.map { w in
                WaypointPin(
                    id: w.id,
                    coordinate: CLLocationCoordinate2D(latitude: w.lat, longitude: w.lon),
                    kind: w.isStandalone
                        ? .standalone
                        : .routeLinked(stepNumber: w.stepIndex ?? 1)
                )
            }
        } catch {
            // Silent fail — stale pins remain visible
        }
        isFetching = false
    }

    private func distance(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) -> Double {
        let loc1 = CLLocation(latitude: a.latitude, longitude: a.longitude)
        let loc2 = CLLocation(latitude: b.latitude, longitude: b.longitude)
        return loc1.distance(from: loc2)
    }
}

// MARK: - View

struct SubscriptionsMapView: View {
    @Environment(AppState.self) private var appState
    @State private var vm = SubscriptionsMapViewModel()
    @State private var showSearch = false
    @State private var userLocation: CLLocationCoordinate2D?

    var body: some View {
        ZStack {
            YandexMapView(
                userLocation: userLocation,
                ownPolylines: [],
                followPolylines: [],
                waypoints: vm.pins,
                onWaypointTap: { id in
                    vm.onWaypointTap(id)
                },
                onCameraIdle: { center in
                    Task { await vm.onCameraIdle(center) }
                }
            )
            .ignoresSafeArea()

            // Search pill — top center
            VStack(spacing: 0) {
                MapSearchPill { showSearch = true }
                    .padding(.horizontal, .sp4)
                    .padding(.top, .sp2)
                Spacer()
            }

            // Left pills: friend stack + create point
            VStack(spacing: 0) {
                Spacer().frame(height: 104)
                HStack(spacing: 0) {
                    VStack(alignment: .leading, spacing: .sp2) {
                        SMapFriendStackPill()
                        SMapCreatePointPill { vm.showCreatePoint = true }
                    }
                    .padding(.leading, .sp4)
                    Spacer()
                }
                Spacer()
            }

            // Control stack — right edge
            VStack(spacing: 0) {
                Spacer().frame(height: 104)
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

            // Legend — bottom-left, above tab bar
            VStack(spacing: 0) {
                Spacer()
                HStack(spacing: 0) {
                    SMapLegendPill()
                        .padding(.leading, .sp4)
                        .padding(.bottom, 90)
                    Spacer()
                }
            }
        }
        .task { await vm.onAppear() }
        // Create standalone waypoint
        .sheet(isPresented: $vm.showCreatePoint) {
            WaypointSheetView(
                mode: .standalone(coordinate: standaloneCoord),
                onSaved: { _ in vm.showCreatePoint = false },
                onCancel: { vm.showCreatePoint = false }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(.radius28)
        }
        // Waypoint detail stub
        .sheet(isPresented: $vm.showWaypointDetail) {
            if let w = vm.tappedWaypoint {
                WaypointDetailStub(waypoint: w)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
                    .presentationCornerRadius(.radius28)
            }
        }
        // Search overlay
        .fullScreenCover(isPresented: $showSearch) {
            SearchOverlayView(onClose: { showSearch = false })
        }
    }

    private var standaloneCoord: CLLocationCoordinate2D {
        userLocation ?? CLLocationCoordinate2D(latitude: 55.7558, longitude: 37.6173)
    }

    private func centerOnMe() {
        Task {
            if let coord = await LocationService.shared.currentLocation {
                userLocation = coord
            }
        }
    }
}

// MARK: - Friend stack pill

private struct SMapFriendStackPill: View {
    var body: some View {
        HStack(spacing: .sp2) {
            // Avatar stack placeholder (3 circles)
            HStack(spacing: -6) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(
                            [Color.wvCoral500, Color.wvTeal400, Color.wvAmber400][i]
                                .opacity(0.9)
                        )
                        .frame(width: 22, height: 22)
                        .overlay(Circle().strokeBorder(Color.wvInk900, lineWidth: 2))
                }
            }
            Text("12")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Color.wvInk50)
            Image(systemName: "chevron.down")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Color.wvInk400)
        }
        .padding(.leading, .sp2)
        .padding(.trailing, .sp3)
        .frame(height: 36)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(Color.wvInk700.opacity(0.5), lineWidth: 0.5))
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
    }
}

// MARK: - Create point pill

private struct SMapCreatePointPill: View {
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: .sp1) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.wvCoral500)
                    .frame(width: 18, height: 18)
                    .overlay(
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                    )
                Text("Точка")
                    .font(.system(size: 12.5, weight: .bold))
                    .foregroundStyle(Color.wvInk50)
            }
            .padding(.leading, .sp2)
            .padding(.trailing, .sp3)
            .frame(height: 36)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(Capsule().strokeBorder(Color.wvInk700.opacity(0.5), lineWidth: 0.5))
        }
        .buttonStyle(_SpringPress())
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
        .accessibilityLabel("Добавить точку")
    }
}

// MARK: - Legend pill

private struct SMapLegendPill: View {
    var body: some View {
        HStack(spacing: .sp3) {
            HStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.wvCoral500)
                    .frame(width: 14, height: 14)
                    .overlay(
                        Image(systemName: "point.topleft.down.curvedto.point.filled.bottomright.up")
                            .font(.system(size: 7, weight: .bold))
                            .foregroundStyle(.white)
                    )
                Text("в маршруте")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color.wvInk200)
            }
            Rectangle()
                .fill(Color.wvInk600)
                .frame(width: 1, height: 12)
            HStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.wvInk800)
                    .frame(width: 14, height: 14)
                    .overlay(
                        Image(systemName: "mappin")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(.white)
                    )
                Text("одиночные")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color.wvInk200)
            }
        }
        .padding(.horizontal, .sp3)
        .frame(height: 32)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(Color.wvInk700.opacity(0.5), lineWidth: 0.5))
    }
}

// MARK: - Waypoint detail stub

private struct WaypointDetailStub: View {
    let waypoint: MapWaypoint

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Drag indicator
            Capsule()
                .fill(Color.wvInk600)
                .frame(width: 36, height: 4)
                .frame(maxWidth: .infinity)
                .padding(.top, .sp2)
                .padding(.bottom, .sp4)

            // Cover photo stub
            RoundedRectangle(cornerRadius: .radiusLg)
                .fill(Color.wvInk700)
                .frame(maxWidth: .infinity)
                .frame(height: 180)
                .overlay(
                    Image(systemName: "photo")
                        .font(.system(size: 32))
                        .foregroundStyle(Color.wvInk500)
                )
                .padding(.horizontal, .sp5)

            VStack(alignment: .leading, spacing: .sp2) {
                Text(waypoint.title)
                    .font(.wvH3)
                    .foregroundStyle(Color.wvInk50)

                if let author = waypoint.authorName {
                    HStack(spacing: .sp2) {
                        Circle()
                            .fill(Color.wvTeal400.opacity(0.8))
                            .frame(width: 24, height: 24)
                        Text(author)
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvInk300)
                        Text("·")
                            .foregroundStyle(Color.wvInk500)
                        Text(waypoint.isStandalone ? "одиночная точка" : "в маршруте")
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvInk400)
                    }
                }
            }
            .padding(.horizontal, .sp5)
            .padding(.top, .sp4)

            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.wvInk900)
    }
}

// MARK: - Reused sub-components (same as MapBrowseView)

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
