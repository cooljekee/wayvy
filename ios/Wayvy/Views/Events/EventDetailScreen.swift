import SwiftUI

// MARK: - EventDetailScreen

struct EventDetailScreen: View {
    let event: EventResponse

    @Environment(\.dismiss) private var dismiss

    @State private var isAttending: Bool
    @State private var attendCount: Int

    init(event: EventResponse) {
        self.event = event
        _isAttending = State(initialValue: event.isAttending)
        _attendCount = State(initialValue: event.attendCount)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Map placeholder (Yandex MapKit will replace this)
            mapPlaceholder

            // Centered event pin
            EventMapPin(event: event)

            // Top bar overlay
            VStack {
                topBar
                    .padding(.horizontal, .sp3)
                    .padding(.top, 56)
                Spacer()
            }

            // Bottom sheet
            bottomSheet
        }
        .ignoresSafeArea()
        .preferredColorScheme(.dark)
    }

    // MARK: - Map placeholder

    private var mapPlaceholder: some View {
        Color.wvInk800
            .ignoresSafeArea()
            .overlay {
                Canvas { context, size in
                    let spacing: CGFloat = 40
                    var x: CGFloat = 0
                    while x < size.width {
                        context.stroke(Path { p in
                            p.move(to: CGPoint(x: x, y: 0))
                            p.addLine(to: CGPoint(x: x, y: size.height))
                        }, with: .color(Color.wvInk600.opacity(0.5)), lineWidth: 1)
                        x += spacing
                    }
                    var y: CGFloat = 0
                    while y < size.height {
                        context.stroke(Path { p in
                            p.move(to: CGPoint(x: 0, y: y))
                            p.addLine(to: CGPoint(x: size.width, y: y))
                        }, with: .color(Color.wvInk600.opacity(0.5)), lineWidth: 1)
                        y += spacing
                    }
                }
            }
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack(spacing: .sp2) {
            // Кнопка назад
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color.wvInk50)
                    .frame(width: .minTapTarget, height: .minTapTarget)
                    .background(.ultraThinMaterial)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)

            // Блок автора
            HStack(spacing: 10) {
                Circle()
                    .fill(Color.wvCoral500.opacity(0.6))
                    .frame(width: 32, height: 32)
                VStack(alignment: .leading, spacing: 1) {
                    Text("автор события")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.wvInk300)
                }
                Spacer()
            }
            .padding(.leading, .sp2)
            .padding(.trailing, .sp4)
            .frame(height: .minTapTarget)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())

            // Кнопка поделиться
            Button {
                // поделиться
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color.wvInk50)
                    .frame(width: .minTapTarget, height: .minTapTarget)
                    .background(.ultraThinMaterial)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Bottom sheet

    private var bottomSheet: some View {
        VStack(spacing: 0) {
            // Ручка
            Capsule()
                .fill(Color.wvInk300.opacity(0.4))
                .frame(width: 36, height: 5)
                .padding(.top, .sp2)
                .padding(.bottom, .sp3)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Обложка
                    coverWithChips
                        .padding(.horizontal, .sp4)
                        .padding(.bottom, .sp4)

                    // Заголовок
                    Text(event.title)
                        .font(.wvH2)
                        .foregroundStyle(Color.wvInk50)
                        .padding(.horizontal, .sp4)
                        .padding(.bottom, .sp2)

                    // Мета-строка: видимость + дистанция
                    metaRow
                        .padding(.horizontal, .sp4)
                        .padding(.bottom, .sp3)

                    // Описание
                    if !event.description.isEmpty {
                        Text(event.description)
                            .font(.wvBody)
                            .foregroundStyle(Color.wvInk200)
                            .lineSpacing(4)
                            .padding(.horizontal, .sp4)
                            .padding(.bottom, .sp3)
                    }

                    // Участники
                    attendeesRow
                        .padding(.horizontal, .sp4)
                        .padding(.bottom, .sp2)
                }
                .padding(.bottom, .sp4)
            }
            .frame(maxHeight: UIScreen.main.bounds.height * 0.5)

            // CTA
            ctaBar
        }
        .background(Color.wvInk800)
        .clipShape(
            UnevenRoundedRectangle(
                topLeadingRadius: .radius28,
                bottomLeadingRadius: 0,
                bottomTrailingRadius: 0,
                topTrailingRadius: .radius28,
                style: .continuous
            )
        )
    }

    // MARK: - Cover

    private var coverWithChips: some View {
        ZStack(alignment: .bottomLeading) {
            Group {
                if let urlStr = event.coverUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { phase in
                        if case .success(let img) = phase {
                            img.resizable().scaledToFill()
                        } else {
                            gradientPlaceholder
                        }
                    }
                } else {
                    gradientPlaceholder
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 132)
            .overlay(alignment: .topLeading) {
                dateChip.padding(.sp3)
            }
            .overlay(alignment: .bottom) {
                LinearGradient(
                    colors: [.clear, .black.opacity(0.4)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 60)
            }
            .overlay(alignment: .bottomLeading) {
                HStack(spacing: .sp2) {
                    glassChip(text: timeStr(event.startsAt), icon: "clock")
                    glassChip(text: event.address, icon: "mappin", maxWidth: 180)
                }
                .padding(.sp2)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: .radiusXl, style: .continuous))
    }

    private var gradientPlaceholder: some View {
        LinearGradient(
            colors: [Color.wvCoral500.opacity(0.6), Color.wvCoral700],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var dateChip: some View {
        VStack(spacing: 2) {
            Text(monthStr(event.startsAt))
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Color.wvInk300)
                .textCase(.uppercase)
                .kerning(0.8)
            Text(dayStr(event.startsAt))
                .font(.system(size: 22, weight: .heavy))
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

    private func glassChip(text: String, icon: String, maxWidth: CGFloat? = nil) -> some View {
        Label(text, systemImage: icon)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(.white)
            .lineLimit(1)
            .padding(.horizontal, 9)
            .padding(.vertical, 4)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
            .frame(maxWidth: maxWidth)
    }

    // MARK: - Meta row

    private var metaRow: some View {
        HStack(spacing: .sp2) {
            Label(
                event.visibility == "public" ? "Публичное" : "Подписчики",
                systemImage: event.visibility == "public" ? "globe" : "person.2"
            )
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(event.visibility == "public" ? Color.wvTeal400 : Color.wvInk300)
            .padding(.horizontal, .sp2)
            .padding(.vertical, 4)
            .background(
                (event.visibility == "public" ? Color.wvTeal400 : Color.wvInk400).opacity(0.15)
            )
            .clipShape(Capsule())

            if let dist = event.distanceM {
                Text("·")
                    .foregroundStyle(Color.wvInk400)
                let km = String(format: "%.1f", dist / 1000).replacingOccurrences(of: ".", with: ",")
                Text("\(km) км от тебя")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.wvInk300)
            }
        }
    }

    // MARK: - Attendees

    private var attendeesRow: some View {
        HStack(spacing: .sp2) {
            HStack(spacing: -8) {
                ForEach(0..<min(3, attendCount), id: \.self) { _ in
                    Circle()
                        .fill(Color.wvInk500)
                        .frame(width: 28, height: 28)
                        .overlay(Circle().strokeBorder(Color.wvInk800, lineWidth: 1.5))
                }
            }
            Text("идут \(attendCount)")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.wvInk300)
        }
    }

    // MARK: - CTA bar

    private var ctaBar: some View {
        HStack(spacing: .sp2) {
            // Кнопка «Иду» — coral fill → outlined при isAttending
            Button {
                let willAttend = !isAttending
                isAttending = willAttend
                attendCount += willAttend ? 1 : -1
                Task {
                    do {
                        if willAttend {
                            try await EventService.shared.attend(eventID: event.id)
                        } else {
                            try await EventService.shared.unattend(eventID: event.id)
                        }
                    } catch {
                        // Откат оптимистичного обновления
                        isAttending = !willAttend
                        attendCount += willAttend ? -1 : 1
                    }
                }
            } label: {
                HStack(spacing: .sp2) {
                    if isAttending {
                        Image(systemName: "checkmark")
                            .fontWeight(.bold)
                    }
                    Text("Иду")
                        .font(.system(size: 15, weight: .bold))
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .foregroundStyle(isAttending ? Color.wvCoral500 : Color.wvInk50)
                .background(isAttending ? Color.clear : Color.wvCoral500)
                .overlay(
                    RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous)
                        .strokeBorder(isAttending ? Color.wvCoral500 : Color.clear, lineWidth: 1.5)
                )
                .clipShape(RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous))
            }
            .buttonStyle(.plain)

            // Вторичная кнопка сообщений
            Button {} label: {
                Image(systemName: "message")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color.wvInk200)
                    .frame(width: 52, height: 50)
                    .background(Color.wvInk600.opacity(0.4))
                    .clipShape(RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, .sp4)
        .padding(.vertical, .sp3)
        .background(Color.wvInk800)
    }

    // MARK: - Helpers

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

    private func timeStr(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ru_RU")
        f.timeStyle = .short
        return f.string(from: date)
    }
}

// MARK: - EventMapPin

struct EventMapPin: View {
    let event: EventResponse

    @State private var pulsing = false

    var body: some View {
        ZStack {
            // Пульсирующий halo
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.wvAmber400.opacity(pulsing ? 0.0 : 0.25))
                .frame(width: 80, height: 80)
                .scaleEffect(pulsing ? 1.35 : 1.0)
                .animation(
                    .easeOut(duration: 2.2).repeatForever(autoreverses: false),
                    value: pulsing
                )

            VStack(spacing: 0) {
                // Тело пина
                VStack(spacing: 2) {
                    Text(monthStr(event.startsAt))
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Color.wvInk300)
                        .textCase(.uppercase)
                        .kerning(0.8)
                    Text(dayStr(event.startsAt))
                        .font(.system(size: 24, weight: .heavy))
                        .foregroundStyle(Color.wvCoral500)
                        .monospacedDigit()
                }
                .padding(.horizontal, .sp2)
                .padding(.vertical, .sp2)
                .frame(width: 64)
                .background(Color.wvInk900)
                .clipShape(RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous)
                        .strokeBorder(Color.white, lineWidth: 2.5)
                )

                // Стрелка-якорь
                Image(systemName: "arrowtriangle.down.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.wvInk900)
                    .offset(y: -2)
            }
        }
        .onAppear { pulsing = true }
        .shadow(color: Color.black.opacity(0.45), radius: 14, x: 0, y: 8)
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
