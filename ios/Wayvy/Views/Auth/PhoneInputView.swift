import SwiftUI

struct PhoneInputView: View {
    @Environment(AppState.self) private var appState
    @State private var rawDigits = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var navigateToOTP = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.wvCoral500.ignoresSafeArea()
            heroSection
            authCard
        }
        .navigationBarHidden(true)
        .navigationDestination(isPresented: $navigateToOTP) {
            OTPInputView(phone: fullPhone)
        }
    }

    // MARK: - Hero

    private var heroSection: some View {
        VStack(spacing: .sp3) {
            Image(systemName: "figure.walk")
                .font(.system(size: 52, weight: .light))
                .foregroundStyle(.white)

            Text("wayvy")
                .font(.wvH1.bold())
                .foregroundStyle(.white)

            Text("Гуляй вместе.\nЗапиши свой город.")
                .font(.wvBody)
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .padding(.bottom, 260)
    }

    // MARK: - Auth card

    private var authCard: some View {
        VStack(spacing: .sp3) {
            phoneRow

            if let msg = errorMessage {
                Text(msg)
                    .font(.wvCaption)
                    .foregroundStyle(Color.wvCoral200)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            ctaButton

            Text("Продолжая, ты соглашаешься с условиями и политикой конфиденциальности.")
                .font(.wvCaption)
                .foregroundStyle(Color.wvInk400)
                .multilineTextAlignment(.center)
                .padding(.top, .sp1)
        }
        .padding(.horizontal, .sp5)
        .padding(.top, .sp5)
        .padding(.bottom, .sp5)
        .background {
            Color.wvInk800
                .clipShape(
                    UnevenRoundedRectangle(
                        topLeadingRadius: .radius28,
                        topTrailingRadius: .radius28
                    )
                )
                .ignoresSafeArea(edges: .bottom)
        }
    }

    private var phoneRow: some View {
        HStack(spacing: .sp2) {
            Image(systemName: "phone.fill")
                .font(.system(size: 15))
                .foregroundStyle(Color.wvInk300)

            Text("+7")
                .font(.wvBody.weight(.medium))
                .foregroundStyle(Color.wvInk200)

            TextField("(900) 000-00-00", text: phoneBinding)
                .keyboardType(.numberPad)
                .font(.wvBody)
                .foregroundStyle(Color.wvInk50)
        }
        .padding(.sp4)
        .background(Color.wvInk700)
        .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
    }

    private var ctaButton: some View {
        Button(action: sendCode) {
            ZStack {
                if isLoading {
                    ProgressView().tint(Color.wvCoral500)
                } else {
                    Text("Получить код")
                        .font(.wvBody.weight(.bold))
                        .foregroundStyle(Color.wvCoral500)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: .radiusBtn))
        }
        .buttonStyle(_SpringPress())
        .disabled(rawDigits.count < 10 || isLoading)
    }

    // MARK: - Logic

    private var fullPhone: String { "+7\(rawDigits)" }

    private var phoneBinding: Binding<String> {
        Binding(
            get: { formatPhone(rawDigits) },
            set: { rawDigits = String($0.filter(\.isNumber).prefix(10)) }
        )
    }

    private func formatPhone(_ digits: String) -> String {
        var s = ""
        let arr = Array(digits)
        for (i, d) in arr.enumerated() {
            switch i {
            case 0:     s += "(" + String(d)
            case 1, 2:  s += String(d)
            case 3:     s += ") " + String(d)
            case 4, 5:  s += String(d)
            case 6:     s += "-" + String(d)
            case 7:     s += String(d)
            case 8:     s += "-" + String(d)
            case 9:     s += String(d)
            default:    break
            }
        }
        return s
    }

    private func sendCode() {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        Task {
            do {
                try await AuthService.shared.requestOTP(phone: fullPhone)
                navigateToOTP = true
            } catch {
                errorMessage = error.localizedDescription
            }
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
