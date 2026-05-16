import SwiftUI
import PhotosUI

struct EventCreateSheet: View {
    var onSave: (EventResponse) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme

    @State private var title = ""
    @State private var description = ""
    @State private var address = ""
    @State private var startsAt = Date().addingTimeInterval(3600)
    @State private var visibility = "public"
    @State private var coverPhotoItem: PhotosPickerItem?
    @State private var coverImage: Image?
    @State private var isSaving = false
    @State private var saveError: String?

    // Палитра градиентов для обложки
    private let gradients: [LinearGradient] = [
        LinearGradient(
            colors: [Color.wvCoral500.opacity(0.7), Color.wvCoral700],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        ),
        LinearGradient(
            colors: [Color.wvTeal400.opacity(0.7), Color.wvTeal600],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        ),
        LinearGradient(
            colors: [Color.wvAmber400.opacity(0.7), Color.wvAmber500],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        ),
    ]
    @State private var gradientIndex = 0

    private var canSave: Bool { !title.trimmingCharacters(in: .whitespaces).isEmpty && !isSaving }

    var body: some View {
        VStack(spacing: 0) {
            grip
            header
            Divider().opacity(0.1)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    coverSection
                    formSection
                }
                .padding(.bottom, .sp10)
            }

            actionBar
        }
        .background(Color.wvSurface1)
        .onChange(of: coverPhotoItem) { _, item in
            Task { await loadCoverPhoto(item) }
        }
    }

    // MARK: - Grip

    private var grip: some View {
        Capsule()
            .fill(Color.wvInk300.opacity(0.4))
            .frame(width: 36, height: 5)
            .padding(.top, 8)
            .padding(.bottom, 10)
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: .sp2) {
            Text("Новое событие")
                .font(.wvH3)
                .foregroundStyle(Color.wvInk50)
            Spacer()
            visibilityPill
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color.wvInk300)
                    .frame(width: 30, height: 30)
                    .background(Color.wvInk500.opacity(0.3))
                    .clipShape(Circle())
            }
            .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
        }
        .padding(.horizontal, .sp4)
        .padding(.bottom, .sp2)
    }

    // MARK: - Visibility pill

    private var visibilityPill: some View {
        Button {
            visibility = visibility == "public" ? "followers" : "public"
        } label: {
            Label(
                visibility == "public" ? "Публично" : "Подписчики",
                systemImage: visibility == "public" ? "globe" : "person.2"
            )
            .font(.system(size: 11.5, weight: .bold))
            .foregroundStyle(Color.wvInk50)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.wvInk500.opacity(0.3))
            .clipShape(Capsule())
        }
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
    }

    // MARK: - Cover section

    private var coverSection: some View {
        ZStack(alignment: .topLeading) {
            // Cover background
            Group {
                if let coverImage {
                    coverImage.resizable().scaledToFill()
                } else {
                    gradients[gradientIndex % gradients.count]
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 124)
            .clipped()

            // Date chip overlay
            coverDateChip
                .padding(.sp3)

            // Swap cover button
            HStack {
                Spacer()
                PhotosPicker(selection: $coverPhotoItem, matching: .images) {
                    Label("Обложка", systemImage: "camera")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(.ultraThinMaterial)
                        .clipShape(Capsule())
                }
                .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
                .padding(.sp3)
            }
        }
        .frame(height: 124)
        .clipShape(RoundedRectangle(cornerRadius: .radiusXl, style: .continuous))
        .padding(.horizontal, .sp4)
        .padding(.top, .sp3)
        .padding(.bottom, .sp4)
    }

    private var coverDateChip: some View {
        VStack(spacing: 2) {
            Text(monthStr(startsAt))
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Color.wvInk300)
                .textCase(.uppercase)
                .kerning(0.8)
            Text(dayStr(startsAt))
                .font(.system(size: 20, weight: .heavy, design: .default))
                .foregroundStyle(Color.wvCoral500)
                .monospacedDigit()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.wvInk900)
        .clipShape(RoundedRectangle(cornerRadius: .radiusMd, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: .radiusMd, style: .continuous)
                .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    // MARK: - Form section

    private var formSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Название
            ecLabel("Название")
            TextField("Закат, забег, кофе…", text: $title)
                .font(.wvBody)
                .foregroundStyle(Color.wvInk50)
                .padding(.sp3)
                .background(Color.wvInk600.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: .radiusMd, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: .radiusMd, style: .continuous)
                        .strokeBorder(Color.wvInk400.opacity(0.3), lineWidth: 1)
                )
                .padding(.horizontal, .sp4)
                .padding(.bottom, .sp4)

            // Когда
            ecLabel("Когда")
            HStack(spacing: .sp2) {
                DatePicker("", selection: $startsAt, displayedComponents: .date)
                    .labelsHidden()
                    .tint(Color.wvCoral500)
                DatePicker("", selection: $startsAt, displayedComponents: .hourAndMinute)
                    .labelsHidden()
                    .tint(Color.wvCoral500)
                Spacer()
            }
            .padding(.horizontal, .sp4)
            .padding(.bottom, .sp4)

            // Место
            ecLabel("Место")
            HStack(spacing: .sp2) {
                Image(systemName: "mappin")
                    .foregroundStyle(Color.wvInk300)
                    .font(.system(size: 14))
                TextField("Адрес или место", text: $address)
                    .font(.wvBody)
                    .foregroundStyle(Color.wvInk50)
            }
            .padding(.sp3)
            .background(Color.wvInk600.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: .radiusMd, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: .radiusMd, style: .continuous)
                    .strokeBorder(Color.wvInk400.opacity(0.3), lineWidth: 1)
            )
            .padding(.horizontal, .sp4)
            .padding(.bottom, .sp4)

            // Описание
            ecLabel("Описание")
            ZStack(alignment: .topLeading) {
                if description.isEmpty {
                    Text("Что будет? Что взять? Где встречаемся?")
                        .font(.wvBody)
                        .foregroundStyle(Color.wvInk400)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .allowsHitTesting(false)
                }
                TextEditor(text: $description)
                    .font(.wvBody)
                    .foregroundStyle(Color.wvInk50)
                    .frame(minHeight: 80)
                    .scrollContentBackground(.hidden)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
            }
            .background(Color.wvInk600.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: .radiusMd, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: .radiusMd, style: .continuous)
                    .strokeBorder(Color.wvInk400.opacity(0.3), lineWidth: 1)
            )
            .padding(.horizontal, .sp4)
        }
    }

    // MARK: - Action bar

    private var actionBar: some View {
        HStack(spacing: .sp2) {
            Button("Черновик") { dismiss() }
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Color.wvInk50)
                .frame(maxWidth: .infinity, minHeight: 50)
                .background(Color.wvInk500.opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous))

            Button(action: save) {
                Group {
                    if isSaving {
                        ProgressView().tint(.white)
                    } else {
                        Text("Создать событие")
                            .font(.system(size: 15, weight: .bold))
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 50)
                .foregroundStyle(.white)
            }
            .disabled(!canSave)
            .background(canSave ? Color.wvCoral500 : Color.wvInk400.opacity(0.4))
            .clipShape(RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous))
        }
        .padding(.horizontal, .sp4)
        .padding(.vertical, .sp3)
        .background(Color.wvSurface1)
    }

    // MARK: - Actions

    private func save() {
        guard canSave else { return }
        isSaving = true
        Task {
            do {
                let event = try await EventService.shared.createEvent(
                    title: title.trimmingCharacters(in: .whitespaces),
                    description: description,
                    coverURL: nil,
                    lat: 55.7558,
                    lon: 37.6173,
                    address: address,
                    startsAt: startsAt,
                    endsAt: nil,
                    visibility: visibility
                )
                onSave(event)
            } catch {
                saveError = "Не удалось создать событие"
            }
            isSaving = false
        }
    }

    private func loadCoverPhoto(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        if let data = try? await item.loadTransferable(type: Data.self),
           let uiImage = UIImage(data: data) {
            coverImage = Image(uiImage: uiImage)
        }
    }

    // MARK: - Helpers

    private func ecLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(Color.wvInk300)
            .textCase(.uppercase)
            .kerning(0.8)
            .padding(.horizontal, .sp4)
            .padding(.bottom, .sp2)
    }

    private func monthStr(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ru_RU")
        f.dateFormat = "MMM"
        return f.string(from: date)
    }

    private func dayStr(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "dd"
        return f.string(from: date)
    }
}
