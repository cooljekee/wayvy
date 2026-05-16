import UIKit

actor MediaService {
    static let shared = MediaService()

    private let session = URLSession.shared

    private var baseURL: URL {
        let raw = Bundle.main.infoDictionary?["APIBaseURL"] as? String ?? "http://localhost:8080"
        return URL(string: raw)!
    }

    struct UploadResult: Sendable {
        let r2Key: String
        let url: String
    }

    // MARK: - Upload

    func upload(imageData: Data) async throws -> UploadResult {
        guard let uiImage = UIImage(data: imageData),
              let compressed = uiImage.jpegData(compressionQuality: 0.8) else {
            throw MediaServiceError.compressionFailed
        }

        let boundary = UUID().uuidString
        var req = URLRequest(url: baseURL.appendingPathComponent("/media/upload"))
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        addAuth(&req)
        req.httpBody = buildMultipart(data: compressed, boundary: boundary)

        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)

        struct Resp: Decodable {
            let r2Key: String
            let url: String
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let resp = try decoder.decode(Resp.self, from: data)
        return UploadResult(r2Key: resp.r2Key, url: resp.url)
    }

    // MARK: - Helpers

    private func buildMultipart(data: Data, boundary: String) -> Data {
        var body = Data()
        let crlf = "\r\n"
        body.append("--\(boundary)\(crlf)".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\(crlf)".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\(crlf)\(crlf)".data(using: .utf8)!)
        body.append(data)
        body.append("\(crlf)--\(boundary)--\(crlf)".data(using: .utf8)!)
        return body
    }

    private func addAuth(_ req: inout URLRequest) {
        if let token = Keychain.load(forKey: "jwt") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func assertHTTP(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw MediaServiceError.uploadFailed
        }
    }

    enum MediaServiceError: LocalizedError {
        case compressionFailed
        case uploadFailed
        var errorDescription: String? {
            switch self {
            case .compressionFailed: return "Не удалось обработать фото"
            case .uploadFailed: return "Не удалось загрузить фото"
            }
        }
    }
}
