import SwiftUI
import CoreLocation

struct StopConfirmSheet: View {
    let model: RecordingModel
    let onResume: () -> Void
    let onDone: () -> Void

    @State private var isSaving = false
    @State private var errorMessage: String?

    private var points: Int { model.track.count }

    private var distanceString: String { model.distanceString }

    private var durationString: String {
        let m = model.elapsedSeconds / 60
        let s = model.elapsedSeconds % 60
        return String(format: "%02d:%02d", m, s)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            dragGrip

            Text("Завершить маршрут?")
                .font(.wvH3.bold())
                .foregroundStyle(Color.wvInk50)
                .padding(.top, .sp1)

            Text("Ты прошёл \(distanceString) км за \(durationString). Точек: \(points).")
                .font(.wvBodySmall)
                .foregroundStyle(Color.wvInk400)
                .padding(.top, .sp1)
                .padding(.bottom, .sp4)

            statsStrip
                .padding(.bottom, .sp4)

            if let msg = errorMessage {
                Text(msg)
                    .font(.wvCaption)
                    .foregroundStyle(Color.wvCoral500)
                    .padding(.bottom, .sp2)
            }

            buttons
        }
        .padding(.horizontal, .sp5)
        .padding(.bottom, .sp5)
        .frame(maxWidth: .infinity)
        .background(Color.wvInk800)
    }

    // MARK: - Subviews

    private var dragGrip: some View {
        Capsule()
            .fill(Color.wvInk600)
            .frame(width: 36, height: 5)
            .frame(maxWidth: .infinity)
            .padding(.vertical, .sp2)
    }

    private var statsStrip: some View {
        HStack(spacing: 1) {
            StatCell(value: distanceString, unit: "км", label: "дистанция")
            StatCell(value: durationString, unit: "", label: "время")
            StatCell(value: String(points), unit: "", label: "точки")
        }
        .background(Color.wvInk900)
        .clipShape(RoundedRectangle(cornerRadius: .radiusLg))
    }

    private var buttons: some View {
        VStack(spacing: .sp2) {
            Button(action: save) {
                ZStack {
                    if isSaving {
                        ProgressView().tint(.white)
                    } else {
                        Text("Сохранить маршрут")
                            .font(.wvBody.weight(.bold))
                            .foregroundStyle(.white)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.wvCoral500)
                .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
                .shadow(color: Color.wvCoral500.opacity(0.40), radius: 10, y: 4)
            }
            .buttonStyle(_SpringPress())
            .disabled(isSaving)

            Button(action: onResume) {
                Text("Продолжить запись")
                    .font(.wvBody.weight(.bold))
                    .foregroundStyle(Color.wvInk50)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.wvInk700)
                    .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
            }
            .buttonStyle(_SpringPress())
            .disabled(isSaving)

            Button(action: discard) {
                Text("Удалить запись")
                    .font(.wvBody.weight(.bold))
                    .foregroundStyle(Color(hex: "#E5484D"))
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .overlay {
                        RoundedRectangle(cornerRadius: .radiusBtn)
                            .strokeBorder(Color(hex: "#E5484D").opacity(0.28), lineWidth: 1)
                    }
            }
            .buttonStyle(_SpringPress())
            .disabled(isSaving)
        }
    }

    // MARK: - Actions

    private func save() {
        guard !isSaving else { return }
        isSaving = true
        errorMessage = nil

        Task { @MainActor in
            let coordinates = await model.stopAndCollect()
            let city = await detectCity(from: coordinates.first)
            let startedAt = model.startedAt ?? Date()
            let finishedAt = Date()

            do {
                try await RouteService.shared.createRoute(
                    title: nil,
                    coordinates: coordinates,
                    city: city,
                    visibility: "public",
                    startedAt: startedAt,
                    finishedAt: finishedAt,
                    durationS: model.elapsedSeconds
                )
                onDone()
            } catch {
                isSaving = false
                errorMessage = "Не удалось сохранить маршрут"
            }
        }
    }

    private func discard() {
        Task {
            _ = await model.stopAndCollect()
            onDone()
        }
    }

    private func detectCity(from coordinate: CLLocationCoordinate2D?) async -> String? {
        guard let coordinate else { return nil }
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let placemarks = try? await CLGeocoder().reverseGeocodeLocation(location)
        return placemarks?.first?.locality
    }
}

// MARK: - Stat cell

private struct StatCell: View {
    let value: String
    let unit: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value)
                    .font(.wvH3.weight(.bold))
                    .foregroundStyle(Color.wvInk50)
                    .monospacedDigit()
                if !unit.isEmpty {
                    Text(unit)
                        .font(.wvCaption)
                        .foregroundStyle(Color.wvInk400)
                }
            }
            Text(label)
                .font(.wvEyebrow)
                .foregroundStyle(Color.wvInk500)
                .kerning(0.6)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, .sp3)
        .background(Color.wvInk900)
    }
}

private struct _SpringPress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
