import SwiftUI

struct OTPInputView: View {
    let phone: String

    @Environment(AppState.self) private var appState
    @State private var digits: [String] = ["", "", "", ""]
    @FocusState private var focusedIndex: Int?
    @State private var countdown = 60
    @State private var canResend = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var navigateToUsernameSetup = false

    private var code: String { digits.joined() }

    var body: some View {
        ZStack {
            Color.wvInk900.ignoresSafeArea()

            VStack(spacing: .sp8) {
                header
                otpRow
                timerRow

                if let msg = errorMessage {
                    Text(msg)
                        .font(.wvCaption)
                        .foregroundStyle(Color.wvCoral500)
                        .multilineTextAlignment(.center)
                }

                Spacer()
            }
            .padding(.horizontal, .sp5)
            .padding(.top, .sp8)
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            focusedIndex = 0
            startCountdown()
        }
        .navigationDestination(isPresented: $navigateToUsernameSetup) {
            UsernameSetupView()
        }
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(spacing: .sp2) {
            Text("Введи код из СМС")
                .font(.wvH3)
                .foregroundStyle(Color.wvInk50)

            Text("Отправили на \(phone)")
                .font(.wvBodySmall)
                .foregroundStyle(Color.wvInk300)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var otpRow: some View {
        HStack(spacing: .sp3) {
            ForEach(0..<4, id: \.self) { i in
                otpField(index: i)
            }
        }
    }

    private func otpField(index i: Int) -> some View {
        let isFocused = focusedIndex == i
        let hasValue  = !digits[i].isEmpty

        return TextField("", text: $digits[i])
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .font(.wvH2.bold())
            .foregroundStyle(Color.wvInk50)
            .frame(width: 56, height: 56)
            .background(Color.wvInk800)
            .clipShape(RoundedRectangle(cornerRadius: .radiusMd))
            .overlay {
                RoundedRectangle(cornerRadius: .radiusMd)
                    .strokeBorder(
                        isFocused ? Color.wvCoral500 : Color.wvInk600,
                        lineWidth: isFocused ? 2 : 1
                    )
                    .animation(.easeInOut(duration: 0.14), value: isFocused)
            }
            .focused($focusedIndex, equals: i)
            .onChange(of: digits[i]) { _, new in
                let filtered = String(new.filter(\.isNumber).prefix(1))
                if filtered != new { digits[i] = filtered }
                guard !filtered.isEmpty else { return }
                if i < 3 {
                    focusedIndex = i + 1
                } else if code.count == 4 {
                    submit()
                }
            }
            .onTapGesture { focusedIndex = i }
    }

    private var timerRow: some View {
        Group {
            if canResend {
                Button("Отправить снова") {
                    resend()
                }
                .font(.wvBody.weight(.medium))
                .foregroundStyle(Color.wvCoral500)
            } else {
                Text("Отправить снова через \(countdown) с")
                    .font(.wvBodySmall)
                    .foregroundStyle(Color.wvInk400)
            }
        }
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.top, .sp1)
    }

    // MARK: - Logic

    private func submit() {
        guard !isLoading, code.count == 4 else { return }
        isLoading = true
        errorMessage = nil
        focusedIndex = nil
        Task {
            do {
                let token = try await AuthService.shared.verifyOTP(phone: phone, code: code)
                Keychain.save(token, forKey: "jwt")
                appState.jwtToken = token
                appState.currentUserPhone = phone
                let hasUsername = AuthService.shared.usernameFromJWT(token) != nil
                if hasUsername {
                    appState.isAuthenticated = true
                } else {
                    navigateToUsernameSetup = true
                }
            } catch {
                errorMessage = error.localizedDescription
                digits = ["", "", "", ""]
                focusedIndex = 0
            }
            isLoading = false
        }
    }

    private func resend() {
        canResend = false
        countdown = 60
        digits = ["", "", "", ""]
        errorMessage = nil
        focusedIndex = 0
        Task {
            try? await AuthService.shared.requestOTP(phone: phone)
            startCountdown()
        }
    }

    private func startCountdown() {
        Task {
            var remaining = 60
            while remaining > 0 {
                try? await Task.sleep(for: .seconds(1))
                remaining -= 1
                await MainActor.run { countdown = remaining }
            }
            await MainActor.run { canResend = true }
        }
    }
}
