import SwiftUI

// MARK: - State

enum FollowButtonState: Equatable {
    case none
    case requested
    case following
}

// MARK: - View

struct FollowButton: View {
    let userID: UUID
    @Binding var state: FollowButtonState
    var onStateChange: ((FollowButtonState) -> Void)?

    @State private var isLoading = false

    var body: some View {
        Button(action: handleTap) {
            HStack(spacing: .sp1) {
                switch state {
                case .none:
                    Text("Подписаться")
                        .font(.system(size: 14, weight: .bold))
                case .requested:
                    Text("Запрошено")
                        .font(.system(size: 14, weight: .bold))
                case .following:
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                    Text("Подписан")
                        .font(.system(size: 14, weight: .bold))
                }
            }
            .foregroundStyle(labelColor)
            .padding(.horizontal, .sp4)
            .frame(height: 36)
            .frame(minWidth: 120)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
            .overlay(
                RoundedRectangle(cornerRadius: .radiusBtn)
                    .strokeBorder(borderColor, lineWidth: state == .none ? 0 : 1.5)
            )
        }
        .buttonStyle(_FollowSpring())
        .disabled(isLoading)
        .frame(minWidth: .minTapTarget, minHeight: .minTapTarget)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: state)
    }

    // MARK: - Appearance

    @ViewBuilder
    private var background: some View {
        if state == .none {
            Color.wvCoral500
        } else {
            Color.clear
        }
    }

    private var labelColor: Color {
        switch state {
        case .none:      return .white
        case .requested: return .wvInk400
        case .following: return .wvInk50
        }
    }

    private var borderColor: Color {
        switch state {
        case .none:      return .clear
        case .requested: return .wvInk500
        case .following: return .wvInk500
        }
    }

    // MARK: - Actions

    private func handleTap() {
        guard !isLoading else { return }
        let next: FollowButtonState
        switch state {
        case .none:      next = .following
        case .requested: next = .none
        case .following: next = .none
        }
        let previous = state
        state = next
        onStateChange?(next)

        isLoading = true
        Task {
            do {
                if next == .following {
                    try await UserService.shared.follow(userID: userID)
                } else if previous != .none {
                    try await UserService.shared.unfollow(userID: userID)
                }
            } catch {
                // Revert on failure
                await MainActor.run { state = previous }
            }
            await MainActor.run { isLoading = false }
        }
    }
}

// MARK: - Spring press style

private struct _FollowSpring: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
