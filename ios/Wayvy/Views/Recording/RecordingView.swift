import SwiftUI
import CoreLocation

// MARK: - View model

@Observable @MainActor
final class RecordingModel {
    var track: [CLLocationCoordinate2D] = []
    var currentLocation: CLLocationCoordinate2D?
    var elapsedSeconds: Int = 0
    var startedAt: Date?
    private(set) var waypoints: [WaypointPin] = []

    // Stable ID for this recording session — passed as routeID to inline waypoints.
    // The actual route is created on Stop; the ID links waypoints to it retroactively
    // once route pre-creation is supported by the backend.
    let pendingRouteID: UUID = UUID()

    private var timerTask: Task<Void, Never>?
    private var locationTask: Task<Void, Never>?

    var distanceKm: Double {
        var total: Double = 0
        for i in 1..<track.count {
            let a = CLLocation(latitude: track[i - 1].latitude, longitude: track[i - 1].longitude)
            let b = CLLocation(latitude: track[i].latitude, longitude: track[i].longitude)
            total += b.distance(from: a)
        }
        return total / 1_000
    }

    var distanceString: String {
        String(format: "%.2f", distanceKm).replacingOccurrences(of: ".", with: ",")
    }

    var timeString: String {
        let m = elapsedSeconds / 60
        let s = elapsedSeconds % 60
        return String(format: "%02d:%02d", m, s)
    }

    func start() {
        startedAt = Date()

        timerTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                self?.elapsedSeconds += 1
            }
        }

        locationTask = Task { [weak self] in
            let stream = await LocationService.shared.startRecording()
            for await coord in stream {
                self?.track.append(coord)
                self?.currentLocation = coord
            }
        }
    }

    func addWaypoint(_ pin: WaypointPin) {
        // Update step numbers for route-linked waypoints
        var updated = waypoints
        updated.append(pin)
        waypoints = updated.enumerated().map { index, p in
            if case .routeLinked = p.kind {
                return WaypointPin(id: p.id, coordinate: p.coordinate, kind: .routeLinked(stepNumber: index + 1))
            }
            return p
        }
    }

    func stopAndCollect() async -> [CLLocationCoordinate2D] {
        timerTask?.cancel()
        locationTask?.cancel()
        timerTask = nil
        locationTask = nil
        return await LocationService.shared.stopRecording()
    }
}

// MARK: - Recording view

struct RecordingView: View {
    @Environment(AppState.self) private var appState
    @State private var model = RecordingModel()
    @State private var showStopSheet = false
    @State private var showWaypointSheet = false

    var body: some View {
        ZStack(alignment: .bottom) {
            YandexMapView(
                userLocation: model.currentLocation,
                ownPolylines: model.track.isEmpty ? [] : [model.track],
                followPolylines: [],
                waypoints: model.waypoints
            )
            .ignoresSafeArea()

            RecordingHUDView(
                distance: model.distanceString,
                time: model.timeString,
                onAddPoint: { showWaypointSheet = true },
                onStop: { showStopSheet = true }
            )
            .padding(.horizontal, .sp4)
            .padding(.bottom, .sp6)
        }
        .onAppear {
            appState.isRecording = true
            model.start()
        }
        .sheet(isPresented: $showWaypointSheet) {
            WaypointSheetView(
                mode: .inline(routeID: model.pendingRouteID),
                onSaved: { pin in
                    model.addWaypoint(pin)
                    showWaypointSheet = false
                },
                onCancel: { showWaypointSheet = false }
            )
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(.radius28)
        }
        .sheet(isPresented: $showStopSheet) {
            StopConfirmSheet(
                model: model,
                onResume: { showStopSheet = false },
                onDone: {
                    appState.isRecording = false
                    appState.isShowingRecording = false
                }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
            .presentationCornerRadius(.radius28)
        }
    }
}

// MARK: - HUD

private struct RecordingHUDView: View {
    let distance: String
    let time: String
    let onAddPoint: () -> Void
    let onStop: () -> Void

    var body: some View {
        VStack(spacing: .sp2) {
            // Status row
            HStack(spacing: .sp3) {
                RecordingIndicator()
                Spacer()
            }

            // Metrics
            HStack(alignment: .bottom, spacing: .sp6) {
                MetricColumn(value: distance, unit: "км")
                MetricColumn(value: time, unit: "время")
                Spacer()
            }
            .padding(.horizontal, .sp1)

            // Actions
            HStack(spacing: .sp2) {
                Button(action: onAddPoint) {
                    Label("Добавить точку", systemImage: "mappin.and.ellipse")
                        .font(.wvBody.weight(.bold))
                        .foregroundStyle(Color.wvInk50)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.wvInk700)
                        .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
                }
                .buttonStyle(_SpringPress())

                Button(action: onStop) {
                    Image(systemName: "stop.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 50, height: 50)
                        .background(Color.wvCoral500)
                        .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
                        .shadow(color: Color.wvCoral500.opacity(0.45), radius: 8, y: 4)
                }
                .buttonStyle(_SpringPress())
                .accessibilityLabel("Остановить запись")
            }
        }
        .padding(.sp3)
        .background {
            RoundedRectangle(cornerRadius: .radius28)
                .fill(Color.wvInk900.opacity(0.82))
                .background {
                    RoundedRectangle(cornerRadius: .radius28)
                        .fill(.ultraThinMaterial)
                }
                .overlay {
                    RoundedRectangle(cornerRadius: .radius28)
                        .strokeBorder(Color.white.opacity(0.10), lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.55), radius: 18, y: 8)
        }
    }
}

private struct RecordingIndicator: View {
    var body: some View {
        HStack(spacing: .sp1) {
            Circle()
                .fill(Color.wvCoral500)
                .frame(width: 7, height: 7)
            Text("ЗАПИСЬ")
                .font(.wvEyebrow)
                .foregroundStyle(Color(hex: "#FFD9D2"))
                .kerning(1.2)
        }
        .padding(.vertical, .sp1)
        .padding(.horizontal, .sp2)
        .background(Color.wvCoral500.opacity(0.18))
        .clipShape(Capsule())
    }
}

private struct MetricColumn: View {
    let value: String
    let unit: String

    var body: some View {
        VStack(alignment: .leading, spacing: .sp1) {
            Text(value)
                .font(.wvMetric)
                .foregroundStyle(Color.wvInk50)
                .monospacedDigit()
            Text(unit.uppercased())
                .font(.wvEyebrow)
                .foregroundStyle(Color.wvInk400)
                .kerning(1)
        }
    }
}

private struct _SpringPress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
