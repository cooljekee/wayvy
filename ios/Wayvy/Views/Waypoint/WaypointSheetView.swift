import SwiftUI
import PhotosUI
import CoreLocation

// MARK: - Mode

enum WaypointSheetMode {
    case inline(routeID: UUID?)
    case standalone(coordinate: CLLocationCoordinate2D)
}

// MARK: - View

struct WaypointSheetView: View {
    let mode: WaypointSheetMode
    let onSaved: (WaypointPin) -> Void
    let onCancel: () -> Void

    @State private var title = ""
    @State private var description = ""
    @State private var visibility = "followers"
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var selectedImages: [UIImage] = []
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var coordinate: CLLocationCoordinate2D?

    private var isStandalone: Bool {
        if case .standalone = mode { return true }
        return false
    }

    var body: some View {
        VStack(spacing: 0) {
            dragGrip

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    header

                    if isStandalone {
                        standaloneLabel
                            .padding(.horizontal, .sp5)
                            .padding(.bottom, .sp3)
                    }

                    photosSection
                    titleSection
                    descriptionSection
                    visibilitySection

                    if let msg = errorMessage {
                        Text(msg)
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvCoral500)
                            .padding(.horizontal, .sp5)
                            .padding(.bottom, .sp2)
                    }

                    actionButtons
                        .padding(.horizontal, .sp5)
                        .padding(.bottom, .sp6)
                }
            }
        }
        .background(Color.wvInk800)
        .task {
            switch mode {
            case .standalone(let coord):
                coordinate = coord
            case .inline:
                coordinate = await LocationService.shared.currentLocation
            }
        }
        .onChange(of: pickerItems) { _, items in
            Task {
                var images: [UIImage] = []
                for item in items {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let img = UIImage(data: data) {
                        images.append(img)
                    }
                }
                selectedImages = images
            }
        }
    }

    // MARK: - Subviews

    private var dragGrip: some View {
        Capsule()
            .fill(Color.wvInk600)
            .frame(width: 36, height: 5)
            .frame(maxWidth: .infinity)
            .padding(.top, .sp2)
            .padding(.bottom, .sp2)
    }

    private var header: some View {
        HStack(spacing: .sp2) {
            Text(isStandalone ? "Одиночная точка" : "Новая точка")
                .font(.wvH3.bold())
                .foregroundStyle(Color.wvInk50)
            Spacer()
            visibilityPill
            closeButton
        }
        .padding(.horizontal, .sp5)
        .padding(.bottom, .sp2)
    }

    private var visibilityPill: some View {
        Button(action: cycleVisibility) {
            HStack(spacing: 6) {
                Image(systemName: visibilityIcon)
                    .font(.system(size: 11, weight: .medium))
                Text(visibilityLabel)
                    .font(.wvEyebrow)
            }
            .foregroundStyle(Color.wvInk50)
            .padding(.horizontal, .sp3)
            .padding(.vertical, 6)
            .background(Color.wvInk700)
            .clipShape(Capsule())
        }
        .buttonStyle(_WPSpring())
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
    }

    private var closeButton: some View {
        Button(action: onCancel) {
            Image(systemName: "xmark")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.wvInk50)
                .frame(width: 30, height: 30)
                .background(Color.wvInk700)
                .clipShape(Circle())
        }
        .buttonStyle(_WPSpring())
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
    }

    private var standaloneLabel: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: .radiusXs)
                .fill(Color.wvInk900)
                .frame(width: 14, height: 14)
                .overlay(
                    Image(systemName: "mappin.fill")
                        .font(.system(size: 7, weight: .bold))
                        .foregroundStyle(.white)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: .radiusXs)
                        .strokeBorder(Color.white.opacity(0.18), lineWidth: 1)
                )
            Text("без маршрута")
                .font(.wvEyebrow)
                .foregroundStyle(Color.wvInk50)
        }
        .padding(.horizontal, .sp3)
        .padding(.vertical, .sp1)
        .background(Color.wvInk700.opacity(0.6))
        .clipShape(Capsule())
    }

    // MARK: - Photos

    private var photosSection: some View {
        VStack(alignment: .leading, spacing: .sp2) {
            sectionLabel("Медиа")
                .padding(.horizontal, .sp5)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: .sp2) {
                    ForEach(Array(selectedImages.enumerated()), id: \.offset) { index, img in
                        PhotoTile(image: img, isCover: index == 0)
                    }
                    PhotosPickerTile(items: $pickerItems)
                }
                .padding(.horizontal, .sp5)
            }
        }
        .padding(.bottom, .sp4)
    }

    // MARK: - Title

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: .sp2) {
            sectionLabel("Название")
            TextField("Кофейня, парк, вид...", text: $title)
                .font(.wvBody)
                .foregroundStyle(Color.wvInk50)
                .tint(Color.wvCoral500)
                .padding(.sp3)
                .background(Color.wvInk700.opacity(0.4))
                .clipShape(RoundedRectangle(cornerRadius: .radiusMd))
                .overlay(
                    RoundedRectangle(cornerRadius: .radiusMd)
                        .strokeBorder(Color.wvInk600, lineWidth: 1)
                )
        }
        .padding(.horizontal, .sp5)
        .padding(.bottom, .sp3)
    }

    // MARK: - Description

    private var descriptionSection: some View {
        VStack(alignment: .leading, spacing: .sp2) {
            sectionLabel("Описание")
            ZStack(alignment: .topLeading) {
                if description.isEmpty {
                    Text("Что попробовать? Когда лучше прийти?")
                        .font(.wvBody)
                        .foregroundStyle(Color.wvInk400)
                        .padding(.sp3)
                        .allowsHitTesting(false)
                }
                TextEditor(text: $description)
                    .font(.wvBody)
                    .foregroundStyle(Color.wvInk50)
                    .tint(Color.wvCoral500)
                    .frame(minHeight: 72, maxHeight: 120)
                    .padding(.sp3)
                    .scrollContentBackground(.hidden)
            }
            .background(Color.wvInk700.opacity(0.4))
            .clipShape(RoundedRectangle(cornerRadius: .radiusMd))
            .overlay(
                RoundedRectangle(cornerRadius: .radiusMd)
                    .strokeBorder(Color.wvInk600, lineWidth: 1)
            )
        }
        .padding(.horizontal, .sp5)
        .padding(.bottom, .sp4)
    }

    // MARK: - Visibility

    private var visibilitySection: some View {
        VStack(alignment: .leading, spacing: .sp2) {
            sectionLabel("Видимость")
            HStack(spacing: .sp2) {
                ForEach(["public", "followers", "private"], id: \.self) { v in
                    Button(action: { visibility = v }) {
                        Text(labelFor(v))
                            .font(.wvCaption.weight(.bold))
                            .foregroundStyle(visibility == v ? .white : Color.wvInk300)
                            .frame(maxWidth: .infinity)
                            .frame(height: 36)
                            .background(visibility == v ? Color.wvCoral500 : Color.wvInk700)
                            .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
                    }
                    .buttonStyle(_WPSpring())
                }
            }
        }
        .padding(.horizontal, .sp5)
        .padding(.bottom, .sp4)
    }

    // MARK: - Action buttons

    private var actionButtons: some View {
        HStack(spacing: .sp2) {
            Button(action: onCancel) {
                Text("Черновик")
                    .font(.wvBody.weight(.bold))
                    .foregroundStyle(Color.wvInk50)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.wvInk700)
                    .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
            }
            .buttonStyle(_WPSpring())
            .disabled(isSaving)

            Button(action: save) {
                ZStack {
                    if isSaving {
                        ProgressView().tint(.white)
                    } else {
                        Text(isStandalone ? "Сохранить точку" : "Добавить точку")
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
            .buttonStyle(_WPSpring())
            .disabled(isSaving || title.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.wvEyebrow)
            .foregroundStyle(Color.wvInk400)
            .kerning(0.6)
    }

    private var visibilityIcon: String {
        switch visibility {
        case "public":    return "globe"
        case "followers": return "person.2.fill"
        default:          return "lock.fill"
        }
    }

    private var visibilityLabel: String { labelFor(visibility) }

    private func labelFor(_ v: String) -> String {
        switch v {
        case "public":    return "Публично"
        case "followers": return "Подписчики"
        default:          return "Только я"
        }
    }

    private func cycleVisibility() {
        switch visibility {
        case "public":    visibility = "followers"
        case "followers": visibility = "private"
        default:          visibility = "public"
        }
    }

    // MARK: - Save

    private func save() {
        guard !isSaving else { return }
        isSaving = true
        errorMessage = nil

        Task { @MainActor in
            guard let coord = coordinate else {
                errorMessage = "Не удалось определить координаты"
                isSaving = false
                return
            }

            do {
                // Upload photos in parallel
                var uploadResults: [MediaService.UploadResult] = []
                if !selectedImages.isEmpty {
                    uploadResults = try await withThrowingTaskGroup(
                        of: (Int, MediaService.UploadResult).self,
                        returning: [MediaService.UploadResult].self
                    ) { group in
                        for (i, img) in selectedImages.enumerated() {
                            let data = img.jpegData(compressionQuality: 1.0) ?? Data()
                            group.addTask {
                                let result = try await MediaService.shared.upload(imageData: data)
                                return (i, result)
                            }
                        }
                        var indexed = [(Int, MediaService.UploadResult)]()
                        for try await pair in group { indexed.append(pair) }
                        indexed.sort { $0.0 < $1.0 }
                        return indexed.map(\.1)
                    }
                }

                // Create waypoint
                let routeID: UUID? = {
                    if case .inline(let id) = mode { return id }
                    return nil
                }()

                let waypoint = try await WaypointService.shared.createWaypoint(
                    lat: coord.latitude,
                    lon: coord.longitude,
                    title: title.trimmingCharacters(in: .whitespaces).isEmpty ? "Точка" : title,
                    description: description.isEmpty ? nil : description,
                    visibility: visibility,
                    routeID: routeID
                )

                // Attach photos sequentially
                for result in uploadResults {
                    try await WaypointService.shared.attachPhoto(
                        waypointID: waypoint.id,
                        r2Key: result.r2Key,
                        url: result.url
                    )
                }

                let kind: WaypointPinKind = routeID != nil ? .routeLinked(stepNumber: 1) : .standalone
                let pin = WaypointPin(id: waypoint.id, coordinate: coord, kind: kind)
                onSaved(pin)
            } catch {
                isSaving = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

// MARK: - Photo tile

private struct PhotoTile: View {
    let image: UIImage
    let isCover: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: 96, height: 96)
                .clipped()

            if isCover {
                Text("COVER")
                    .font(.wvEyebrow)
                    .foregroundStyle(.white)
                    .padding(.horizontal, .sp1)
                    .padding(.vertical, 3)
                    .background(Color.wvCoral500)
                    .clipShape(Capsule())
                    .padding(.sp1)
            }
        }
        .frame(width: 96, height: 96)
        .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
        .overlay(
            RoundedRectangle(cornerRadius: .radiusBtn)
                .strokeBorder(isCover ? Color.wvCoral500 : Color.clear, lineWidth: 2)
        )
    }
}

// MARK: - Photos picker tile

private struct PhotosPickerTile: View {
    @Binding var items: [PhotosPickerItem]

    var body: some View {
        PhotosPicker(selection: $items, maxSelectionCount: 10, matching: .images) {
            VStack(spacing: .sp1) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 22))
                Text("Фото")
                    .font(.wvEyebrow)
            }
            .foregroundStyle(Color.wvInk400)
            .frame(width: 96, height: 96)
            .background(Color.wvInk700.opacity(0.4))
            .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
            .overlay(
                RoundedRectangle(cornerRadius: .radiusBtn)
                    .strokeBorder(
                        Color.wvInk600,
                        style: StrokeStyle(lineWidth: 1.5, dash: [4])
                    )
            )
        }
    }
}

// MARK: - Button style

private struct _WPSpring: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
