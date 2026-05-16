import SwiftUI

// MARK: - EventCard

struct EventCard: View {
    let event: EventResponse
    var onTap: () -> Void = {}

    // Optimistic attend state
    @State private var isAttending: Bool

    init(event: EventResponse, onTap: @escaping () -> Void = {}) {
        self.event = event
        self.onTap = onTap
        _isAttending = State(initialValue: event.isAttending)
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                // COVER — 120pt tall
                coverView
                    .frame(height: 120)
                    .clipped()
                    .clipShape(
                        UnevenRoundedRectangle(
                            topLeadingRadius: .radiusLg,
                            bottomLeadingRadius: 0,
                            bottomTrailingRadius: 0,
                            topTrailingRadius: .radiusLg,
                            style: .continuous
                        )
                    )
                    .overlay(alignment: .topLeading) {
                        dateChip
                            .padding(.sp3)
                    }

                // BODY
                VStack(alignment: .leading, spacing: .sp2) {
                    Text(event.title)
                        .font(.wvH3)
                        .foregroundStyle(Color.wvInk50)
                        .lineLimit(2)

                    HStack(spacing: .sp2) {
                        if !event.address.isEmpty {
                            Label(event.address, systemImage: "mappin")
                                .font(.wvCaption)
                                .foregroundStyle(Color.wvInk300)
                                .lineLimit(1)
                        }
                        Spacer()
                        Text("идут \(event.attendCount)")
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvInk300)
                    }

                    attendButton
                }
                .padding(.horizontal, .sp4)
                .padding(.vertical, .sp3)
            }
            .background(Color.wvSurface1)
            .clipShape(RoundedRectangle(cornerRadius: .radiusLg, style: .continuous))
            .shadow(color: Color.black.opacity(0.15), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
    }

    // MARK: Cover

    @ViewBuilder
    private var coverView: some View {
        if let urlStr = event.coverUrl, let url = URL(string: urlStr) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img):
                    img
                        .resizable()
                        .scaledToFill()
                default:
                    gradientPlaceholder
                }
            }
        } else {
            gradientPlaceholder
        }
    }

    private var gradientPlaceholder: some View {
        LinearGradient(
            colors: [Color.wvCoral500.opacity(0.6), Color.wvCoral700],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: Date chip — wvInk900 bg, wvInk300 month, wvCoral500 day

    private var dateChip: some View {
        VStack(spacing: 2) {
            Text(monthStr(event.startsAt))
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Color.wvInk300)
                .textCase(.uppercase)
                .kerning(0.8)
            Text(dayStr(event.startsAt))
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

    // MARK: Attend button — coral fill → outlined when attending

    private var attendButton: some View {
        Button {
            isAttending.toggle()
            Task {
                do {
                    if isAttending {
                        try await EventService.shared.attend(eventID: event.id)
                    } else {
                        try await EventService.shared.unattend(eventID: event.id)
                    }
                } catch {
                    // Rollback optimistic update on failure
                    isAttending.toggle()
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
            .frame(height: .minTapTarget)
            .foregroundStyle(isAttending ? Color.wvCoral500 : Color.white)
            .background(isAttending ? Color.clear : Color.wvCoral500)
            .overlay(
                RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous)
                    .strokeBorder(
                        isAttending ? Color.wvCoral500 : Color.clear,
                        lineWidth: 1.5
                    )
            )
            .clipShape(RoundedRectangle(cornerRadius: .radiusBtn, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    // MARK: Helpers

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

// MARK: - EventsViewModel

@Observable
@MainActor
final class EventsViewModel {
    var events: [EventResponse] = []
    var isLoading = false
    var error: String?
    var showCreateSheet = false

    func load() async {
        isLoading = true
        error = nil
        do {
            events = try await EventService.shared.fetchEvents(limit: 30, offset: 0)
        } catch {
            self.error = "Не удалось загрузить события"
        }
        isLoading = false
    }

    func refresh() async {
        await load()
    }
}

// MARK: - EventsView

struct EventsView: View {
    @State private var vm = EventsViewModel()
    @State private var selectedEvent: EventResponse?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.wvSurface0.ignoresSafeArea()

                if vm.isLoading && vm.events.isEmpty {
                    ProgressView()
                        .tint(Color.wvCoral500)
                } else if vm.events.isEmpty {
                    emptyState
                } else {
                    eventsList
                }
            }
            .navigationTitle("События")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        vm.showCreateSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.wvCoral500)
                    }
                    .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
                }
            }
            .task { await vm.load() }
            .refreshable { await vm.refresh() }
            .sheet(isPresented: $vm.showCreateSheet) {
                EventCreateSheet { newEvent in
                    vm.events.insert(newEvent, at: 0)
                    vm.showCreateSheet = false
                }
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(.radius28)
            }
            .sheet(item: $selectedEvent) { event in
                EventDetailScreen(event: event)
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                    .presentationCornerRadius(.radius28)
            }
        }
    }

    // MARK: Events list

    private var eventsList: some View {
        ScrollView {
            LazyVStack(spacing: .sp3) {
                ForEach(vm.events) { event in
                    EventCard(event: event) {
                        selectedEvent = event
                    }
                    .padding(.horizontal, .sp4)
                }
            }
            .padding(.vertical, .sp3)
        }
    }

    // MARK: Empty state

    private var emptyState: some View {
        VStack(spacing: .sp4) {
            Image(systemName: "calendar")
                .font(.system(size: 48))
                .foregroundStyle(Color.wvInk400)

            Text("Ничего на этой неделе.\nСоздай первое.")
                .font(.wvBody)
                .foregroundStyle(Color.wvInk300)
                .multilineTextAlignment(.center)

            Button("Создать событие") {
                vm.showCreateSheet = true
            }
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(Color.white)
            .padding(.horizontal, .sp6)
            .padding(.vertical, .sp3)
            .background(Color.wvCoral500)
            .clipShape(Capsule())
            .frame(minHeight: .minTapTarget)
        }
        .padding(.sp8)
    }
}

