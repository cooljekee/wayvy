import Foundation

actor AuthService {
    static let shared = AuthService()

    private let baseURL: URL = {
        let raw = Bundle.main.infoDictionary?["APIBaseURL"] as? String
            ?? "http://localhost:8080"
        return URL(string: raw)!
    }()

    func requestOTP(phone: String) async throws {
        var req = URLRequest(url: baseURL.appending(path: "auth/otp/request"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["phone": phone])
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard (200...299).contains((resp as? HTTPURLResponse)?.statusCode ?? 0) else {
            throw AuthError.requestFailed
        }
    }

    func verifyOTP(phone: String, code: String) async throws -> String {
        var req = URLRequest(url: baseURL.appending(path: "auth/otp/verify"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["phone": phone, "code": code])
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard (200...299).contains((resp as? HTTPURLResponse)?.statusCode ?? 0) else {
            throw AuthError.invalidCode
        }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = json["access_token"] as? String
        else { throw AuthError.invalidCode }
        return token
    }

    // JWT payload decode — checks if username claim is present
    nonisolated func usernameFromJWT(_ token: String) -> String? {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else { return nil }
        var b64 = parts[1]
        let rem = b64.count % 4
        if rem > 0 { b64 += String(repeating: "=", count: 4 - rem) }
        guard let data = Data(base64Encoded: b64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        return json["username"] as? String
    }

    enum AuthError: LocalizedError {
        case requestFailed
        case invalidCode

        var errorDescription: String? {
            switch self {
            case .requestFailed: "Не удалось отправить код. Попробуй снова."
            case .invalidCode:   "Неверный код. Попробуй ещё раз."
            }
        }
    }
}
