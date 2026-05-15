import SwiftUI

struct UsernameSetupView: View {
    @Environment(AppState.self) private var appState
    @State private var username = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var fieldFocused: Bool

    private var isValid: Bool {
        username.count >= 3 &&
        username.allSatisfy { $0.isLetter && $0.isASCII && $0.isLowercase
                           || $0.isNumber
                           || $0 == "_" }
    }

    var body: some View {
        ZStack {
            Color.wvInk900.ignoresSafeArea()

            VStack(alignment: .leading, spacing: .sp6) {
                header
                usernameField

                if let msg = errorMessage {
                    Text(msg)
                        .font(.wvCaption)
                        .foregroundStyle(Color.wvCoral500)
                }

                ctaButton
                hint
                Spacer()
            }
            .padding(.horizontal, .sp5)
            .padding(.top, .sp8)
        }
        .navigationBarHidden(true)
        .onAppear { fieldFocused = true }
        .onChange(of: username) { _, new in
            username = new.lowercased()
            errorMessage = nil
        }
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(alignment: .leading, spacing: .sp2) {
            Text("Придумай имя")
                .font(.wvH2.bold())
                .foregroundStyle(Color.wvInk50)
            Text("Другие будут видеть тебя по нему")
                .font(.wvBody)
                .foregroundStyle(Color.wvInk300)
        }
    }

    private var usernameField: some View {
        HStack(spacing: .sp2) {
            Text("@")
                .font(.wvBody.weight(.medium))
                .foregroundStyle(Color.wvInk300)

            TextField("username", text: $username)
                .keyboardType(.asciiCapable)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .font(.wvBody)
                .foregroundStyle(Color.wvInk50)
                .focused($fieldFocused)
        }
        .padding(.sp4)
        .background(Color.wvInk800)
        .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
        .overlay {
            RoundedRectangle(cornerRadius: .radiusBtn)
                .strokeBorder(
                    fieldFocused ? Color.wvCoral500 : Color.wvInk600,
                    lineWidth: fieldFocused ? 2 : 1
                )
                .animation(.easeInOut(duration: 0.14), value: fieldFocused)
        }
    }

    private var ctaButton: some View {
        Button(action: proceed) {
            ZStack {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text("Продолжить")
                        .font(.wvBody.weight(.bold))
                        .foregroundStyle(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(isValid ? Color.wvCoral500 : Color.wvInk600)
            .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
            .animation(.easeInOut(duration: 0.14), value: isValid)
        }
        .buttonStyle(_SpringPress())
        .disabled(!isValid || isLoading)
    }

    private var hint: some View {
        Text("Только a–z, 0–9, _ · минимум 3 символа")
            .font(.wvCaption)
            .foregroundStyle(Color.wvInk400)
    }

    // MARK: - Logic

    private func proceed() {
        guard isValid, !isLoading else { return }
        guard username.trimmingCharacters(in: .whitespaces).count >= 3 else {
            errorMessage = "Имя слишком короткое"
            return
        }
        fieldFocused = false
        isLoading = true
        Task {
            // Backend endpoint for username setup comes in Phase 3.
            // For now, mark auth complete locally.
            try? await Task.sleep(for: .milliseconds(300))
            appState.isAuthenticated = true
            isLoading = false
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
