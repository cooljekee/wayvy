import SwiftUI

// MARK: - ViewModel

@Observable
@MainActor
final class SearchOverlayViewModel {
    enum Segment { case routes, people }

    var segment: Segment = .routes
    var query: String = ""
    var people: [UserProfile] = []
    var isSearchingPeople = false
    private var searchTask: Task<Void, Never>?

    func onQueryChanged(_ q: String) {
        searchTask?.cancel()
        guard segment == .people, !q.trimmingCharacters(in: .whitespaces).isEmpty else {
            if q.isEmpty { people = [] }
            return
        }
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce
            guard !Task.isCancelled else { return }
            isSearchingPeople = true
            do {
                people = try await UserService.shared.search(query: q)
            } catch {
                // silent — stale results remain
            }
            isSearchingPeople = false
        }
    }

    func onSegmentChanged() {
        query = ""
        people = []
        searchTask?.cancel()
    }
}

// MARK: - View

struct SearchOverlayView: View {
    let onClose: () -> Void
    var onTapUser: ((UserProfile) -> Void)?

    @State private var vm = SearchOverlayViewModel()
    @FocusState private var inputFocused: Bool
    @State private var navigateToProfile: UserProfile?
    @State private var showProfile = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.wvInk900.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    headerRow
                    // Segment control
                    segmentRow
                    // Results
                    resultsList
                }
            }
            .navigationDestination(isPresented: $showProfile) {
                if let user = navigateToProfile {
                    ProfileView(subject: .user(user.id))
                }
            }
        }
        .onAppear { inputFocused = true }
    }

    // MARK: - Header (search input + cancel)

    private var headerRow: some View {
        HStack(spacing: .sp2) {
            HStack(spacing: .sp2) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color.wvInk400)

                TextField(
                    vm.segment == .routes ? "Маршрут, автор, город" : "Имя или @ник",
                    text: $vm.query
                )
                .font(.wvBody)
                .foregroundStyle(Color.wvInk50)
                .tint(Color.wvCoral500)
                .focused($inputFocused)
                .onChange(of: vm.query) { _, new in vm.onQueryChanged(new) }
                .submitLabel(.search)
                .autocorrectionDisabled()

                if !vm.query.isEmpty {
                    Button(action: { vm.query = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(Color.wvInk400)
                    }
                    .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
                }
            }
            .padding(.horizontal, .sp3)
            .frame(height: 44)
            .background(Color.wvInk800, in: RoundedRectangle(cornerRadius: .radiusBtn))
            .overlay(
                RoundedRectangle(cornerRadius: .radiusBtn)
                    .strokeBorder(Color.wvInk700, lineWidth: 0.5)
            )

            Button(action: onClose) {
                Text("Отмена")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color.wvCoral500)
            }
            .frame(minHeight: .minTapTarget)
        }
        .padding(.horizontal, .sp4)
        .padding(.top, .sp3)
        .padding(.bottom, .sp2)
    }

    // MARK: - Segment control

    private var segmentRow: some View {
        HStack(spacing: 0) {
            segmentButton(label: "Маршруты", seg: .routes)
            segmentButton(label: "Люди", seg: .people)
        }
        .padding(4)
        .background(Color.wvInk800.opacity(0.6), in: RoundedRectangle(cornerRadius: .radiusMd))
        .padding(.horizontal, .sp4)
        .padding(.bottom, .sp2)
        .onChange(of: vm.segment) { _, _ in vm.onSegmentChanged() }
    }

    private func segmentButton(label: String, seg: SearchOverlayViewModel.Segment) -> some View {
        Button(action: { vm.segment = seg }) {
            Text(label)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(vm.segment == seg ? Color.wvInk50 : Color.wvInk400)
                .frame(maxWidth: .infinity)
                .frame(height: 36)
                .background(
                    vm.segment == seg ? Color.wvInk700 : Color.clear,
                    in: RoundedRectangle(cornerRadius: 9)
                )
        }
        .buttonStyle(_SpringPress())
    }

    // MARK: - Results

    @ViewBuilder
    private var resultsList: some View {
        ScrollView(showsIndicators: false) {
            LazyVStack(spacing: 0) {
                switch vm.segment {
                case .routes:
                    routesSection
                case .people:
                    peopleSection
                }
            }
            .padding(.horizontal, .sp4)
            .padding(.bottom, .sp8)
        }
    }

    // Routes stub
    private var routesSection: some View {
        VStack(spacing: .sp2) {
            if vm.query.isEmpty {
                sectionHeader("Популярное у подписок")
            }
            Text("Поиск маршрутов скоро будет")
                .font(.wvBody)
                .foregroundStyle(Color.wvInk400)
                .frame(maxWidth: .infinity)
                .padding(.top, .sp8)
        }
    }

    // People — live search
    @ViewBuilder
    private var peopleSection: some View {
        if vm.query.isEmpty {
            sectionHeader("Может быть знаком")
                .padding(.bottom, .sp2)
        }

        if vm.isSearchingPeople {
            ProgressView()
                .tint(Color.wvCoral500)
                .frame(maxWidth: .infinity)
                .padding(.top, .sp8)
        } else if vm.people.isEmpty && !vm.query.isEmpty {
            Text("Ничего не нашлось")
                .font(.wvBody)
                .foregroundStyle(Color.wvInk400)
                .frame(maxWidth: .infinity)
                .padding(.top, .sp8)
        } else {
            ForEach(vm.people) { user in
                Button(action: { openProfile(user) }) {
                    PersonRow(user: user)
                }
                .buttonStyle(_SpringPress())
                Divider()
                    .background(Color.wvInk800)
            }
        }
    }

    private func sectionHeader(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.wvEyebrow)
            .foregroundStyle(Color.wvInk400)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, .sp2)
    }

    private func openProfile(_ user: UserProfile) {
        inputFocused = false
        if let external = onTapUser {
            external(user)
            onClose()
        } else {
            navigateToProfile = user
            showProfile = true
        }
    }
}

// MARK: - Person row (avatar + name + handle + FollowButton)

private struct PersonRow: View {
    let user: UserProfile
    @State private var followState: FollowButtonState

    init(user: UserProfile) {
        self.user = user
        _followState = State(initialValue: {
            switch user.followState {
            case .following:  return .following
            case .requested:  return .requested
            default:          return .none
            }
        }())
    }

    var body: some View {
        HStack(spacing: .sp3) {
            AvatarView(url: user.avatarURL, size: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(user.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.wvInk50)
                HStack(spacing: 4) {
                    Text("@\(user.username)")
                        .font(.wvCaption)
                        .foregroundStyle(Color.wvInk400)
                    if let city = user.city {
                        Text("· \(city)")
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvInk500)
                    }
                }
            }

            Spacer()

            FollowButton(userID: user.id, state: $followState)
        }
        .padding(.vertical, .sp2)
        .frame(minHeight: .minTapTarget)
        .contentShape(Rectangle())
    }
}

// MARK: - Spring press

private struct _SpringPress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
