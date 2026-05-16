import SwiftUI

// MARK: - Subject

enum ProfileSubject: Equatable {
    case own
    case user(UUID)

    var userID: UUID? {
        if case .user(let id) = self { return id }
        return nil
    }

    var isOwn: Bool { self == .own }
}

// MARK: - ViewModel

@Observable
@MainActor
final class ProfileViewModel {
    var profile: UserProfile?
    var routes: [RouteResponse] = []
    var isLoading = false
    var error: String?
    var followState: FollowButtonState = .none
    var selectedSegment: Segment = .routes

    enum Segment: String, CaseIterable {
        case routes = "Маршруты"
        case events = "События"
    }

    private let subject: ProfileSubject

    init(subject: ProfileSubject) {
        self.subject = subject
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            profile = try await UserService.shared.fetchProfile(userID: subject.userID)
            if !subject.isOwn {
                followState = followButtonState(from: profile?.followState)
            }
            routes = try await RouteService.shared.fetchMyRoutes()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func followButtonState(from state: UserProfile.FollowState?) -> FollowButtonState {
        switch state {
        case .following:  return .following
        case .requested:  return .requested
        default:          return .none
        }
    }
}

// MARK: - View

struct ProfileView: View {
    let subject: ProfileSubject

    @State private var vm: ProfileViewModel
    @Environment(\.colorScheme) private var scheme

    init(subject: ProfileSubject) {
        self.subject = subject
        _vm = State(initialValue: ProfileViewModel(subject: subject))
    }

    var body: some View {
        ZStack(alignment: .top) {
            Color.wvInk900.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    coverSection
                    avatarNameRow
                    if let profile = vm.profile {
                        bioSection(profile)
                    }
                    statsRow
                    actionButtons
                    segmentControl
                    tabContent
                    Spacer(minLength: 100)
                }
            }
        }
        .task { await vm.load() }
    }

    // MARK: - Cover

    private var coverSection: some View {
        ZStack(alignment: .topTrailing) {
            // Coral cover — gradient exception allowed by design spec for profile hero
            LinearGradient(
                colors: [Color.wvCoral300, Color.wvCoral500, Color.wvCoral700],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 200)

            // Decorative wave lines (from design reference)
            Canvas { ctx, size in
                let lines: [(CGFloat, CGFloat, CGFloat, CGFloat)] = [
                    (-20, 80,  440, 78),
                    (-20, 100, 440, 98),
                    (-20, 120, 440, 118),
                    (-20, 140, 440, 138),
                ]
                for (x1, y1, x2, y2) in lines {
                    var path = Path()
                    path.move(to: CGPoint(x: x1, y: y1))
                    path.addCurve(
                        to: CGPoint(x: x2, y: y2),
                        control1: CGPoint(x: 100, y: y1 - 10),
                        control2: CGPoint(x: 300, y: y1 + 10)
                    )
                    ctx.stroke(path, with: .color(.white.opacity(0.18)), lineWidth: 1.2)
                }
            }
            .frame(height: 200)
            .clipped()
        }
        .frame(height: 200)
    }

    // MARK: - Avatar + Name row

    private var avatarNameRow: some View {
        HStack(alignment: .bottom, spacing: .sp3) {
            AvatarView(url: vm.profile?.avatarURL, size: 80)
                .overlay(
                    Circle()
                        .strokeBorder(Color.wvInk900, lineWidth: 4)
                )
                .offset(y: -40)

            VStack(alignment: .leading, spacing: 2) {
                Text(vm.profile?.name ?? "—")
                    .font(.wvH2)
                    .foregroundStyle(Color.wvInk50)
                HStack(spacing: .sp1) {
                    if let handle = vm.profile?.username {
                        Text("@\(handle)")
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvInk300)
                    }
                    if let city = vm.profile?.city {
                        Circle()
                            .fill(Color.wvInk300.opacity(0.5))
                            .frame(width: 3, height: 3)
                        Text(city)
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvInk300)
                    }
                }
            }
            .padding(.bottom, .sp1)

            Spacer()
        }
        .padding(.horizontal, .sp5)
        .padding(.top, -40)
    }

    // MARK: - Bio

    private func bioSection(_ profile: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: .sp2) {
            if let bio = profile.bio, !bio.isEmpty {
                Text(bio)
                    .font(.wvBody)
                    .foregroundStyle(Color.wvInk200)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, .sp5)
        .padding(.top, .sp2)
    }

    // MARK: - Stats

    private var statsRow: some View {
        HStack(spacing: 0) {
            ProfileStatCell(value: vm.profile?.routesCount ?? 0,  label: "маршрутов")
            ProfileStatCell(value: vm.profile?.followingCount ?? 0, label: "подписок")
            ProfileStatCell(
                value: vm.profile?.followersCount ?? 0,
                label: subject.isOwn ? "на тебя" : "подписчиков"
            )
        }
        .padding(.horizontal, .sp5)
        .padding(.top, .sp4)
    }

    // MARK: - Action buttons

    @ViewBuilder
    private var actionButtons: some View {
        HStack(spacing: .sp2) {
            if subject.isOwn {
                Button(action: {}) {
                    Text("Редактировать")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.wvInk50)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(Color.wvInk700, in: RoundedRectangle(cornerRadius: .radiusBtn))
                        .overlay(
                            RoundedRectangle(cornerRadius: .radiusBtn)
                                .strokeBorder(Color.wvInk600, lineWidth: 1)
                        )
                }
                .buttonStyle(_SpringPress())
                .frame(minHeight: .minTapTarget)

                Button(action: {}) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(Color.wvInk50)
                        .frame(width: 44, height: 40)
                        .background(Color.wvInk700, in: RoundedRectangle(cornerRadius: .radiusBtn))
                        .overlay(
                            RoundedRectangle(cornerRadius: .radiusBtn)
                                .strokeBorder(Color.wvInk600, lineWidth: 1)
                        )
                }
                .buttonStyle(_SpringPress())
                .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)

            } else if let userID = subject.userID {
                FollowButton(userID: userID, state: $vm.followState)
                    .frame(maxWidth: .infinity)

                Button(action: {}) {
                    Text("Сообщение")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Color.wvInk50)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(Color.wvInk700, in: RoundedRectangle(cornerRadius: .radiusBtn))
                        .overlay(
                            RoundedRectangle(cornerRadius: .radiusBtn)
                                .strokeBorder(Color.wvInk600, lineWidth: 1)
                        )
                }
                .buttonStyle(_SpringPress())
                .frame(minHeight: .minTapTarget)
            }
        }
        .padding(.horizontal, .sp5)
        .padding(.top, .sp4)
    }

    // MARK: - Segment control

    private var segmentControl: some View {
        HStack(spacing: 0) {
            ForEach(ProfileViewModel.Segment.allCases, id: \.self) { seg in
                Button(action: { vm.selectedSegment = seg }) {
                    Text(seg.rawValue)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(
                            vm.selectedSegment == seg ? Color.wvInk50 : Color.wvInk400
                        )
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(
                            vm.selectedSegment == seg
                                ? Color.wvInk700
                                : Color.clear,
                            in: RoundedRectangle(cornerRadius: 9)
                        )
                }
                .buttonStyle(_SpringPress())
            }
        }
        .padding(4)
        .background(Color.wvInk800.opacity(0.6), in: RoundedRectangle(cornerRadius: .radiusMd))
        .padding(.horizontal, .sp5)
        .padding(.top, .sp5)
    }

    // MARK: - Tab content

    @ViewBuilder
    private var tabContent: some View {
        switch vm.selectedSegment {
        case .routes:
            routesList
        case .events:
            eventsStub
        }
    }

    private var routesList: some View {
        VStack(spacing: .sp2) {
            if vm.isLoading {
                ProgressView()
                    .tint(Color.wvCoral500)
                    .padding(.top, .sp8)
            } else if vm.routes.isEmpty {
                Text("Пока нет маршрутов")
                    .font(.wvBody)
                    .foregroundStyle(Color.wvInk400)
                    .padding(.top, .sp8)
            } else {
                ForEach(vm.routes) { route in
                    RouteCardView(route: route, isOwn: subject.isOwn)
                }
            }
        }
        .padding(.horizontal, .sp5)
        .padding(.top, .sp3)
    }

    private var eventsStub: some View {
        Text("Скоро будет")
            .font(.wvBody)
            .foregroundStyle(Color.wvInk400)
            .padding(.top, .sp8)
    }
}

// MARK: - Route card stub

private struct RouteCardView: View {
    let route: RouteResponse
    let isOwn: Bool

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        f.locale = Locale(identifier: "ru_RU")
        return f
    }()

    var body: some View {
        HStack(spacing: .sp3) {
            // Polyline preview stub
            RoundedRectangle(cornerRadius: .radiusMd)
                .fill(Color.wvInk700)
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: "map.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(isOwn ? Color.wvCoral500 : Color.wvTeal400)
                )

            VStack(alignment: .leading, spacing: .sp1) {
                Text(route.title ?? "Маршрут")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.wvInk50)
                    .lineLimit(2)

                if let date = route.startedAt {
                    Text(Self.dateFormatter.string(from: date))
                        .font(.wvCaption)
                        .foregroundStyle(Color.wvInk400)
                }

                HStack(spacing: .sp1) {
                    if let dist = route.distanceM {
                        let km = String(format: "%.1f", Double(dist) / 1000)
                            .replacingOccurrences(of: ".", with: ",")
                        Text("\(km) км")
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvInk300)
                    }
                    if let dur = route.durationS {
                        let mins = dur / 60
                        Text("· \(mins) мин")
                            .font(.wvCaption)
                            .foregroundStyle(Color.wvInk300)
                    }
                }
            }

            Spacer()
        }
        .padding(.sp3)
        .background(Color.wvInk800, in: RoundedRectangle(cornerRadius: .radiusLg))
        .overlay(
            RoundedRectangle(cornerRadius: .radiusLg)
                .strokeBorder(Color.wvInk700, lineWidth: 0.5)
        )
    }
}

// MARK: - Avatar view

struct AvatarView: View {
    let url: String?
    let size: CGFloat

    var body: some View {
        Circle()
            .fill(
                LinearGradient(
                    colors: [Color(hex: "#FFB1A4"), Color.wvCoral500],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: size, height: size)
            .overlay(
                Group {
                    if url == nil {
                        Image(systemName: "person.fill")
                            .font(.system(size: size * 0.4, weight: .medium))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                }
            )
    }
}

// MARK: - Stat cell

private struct ProfileStatCell: View {
    let value: Int
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("\(value)")
                .font(.system(size: 20, weight: .bold, design: .default))
                .monospacedDigit()
                .foregroundStyle(Color.wvInk50)
            Text(label)
                .font(.wvCaption)
                .foregroundStyle(Color.wvInk400)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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
