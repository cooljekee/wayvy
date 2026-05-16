import Foundation
import CoreLocation

actor RouteService {
    static let shared = RouteService()

    private let session = URLSession.shared

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    private var baseURL: URL {
        let raw = Bundle.main.infoDictionary?["APIBaseURL"] as? String ?? "http://localhost:8080"
        return URL(string: raw)!
    }

    // MARK: - Create route

    func createRoute(
        title: String?,
        coordinates: [CLLocationCoordinate2D],
        city: String?,
        visibility: String,
        startedAt: Date,
        finishedAt: Date,
        durationS: Int
    ) async throws -> RouteResponse {
        var req = URLRequest(url: baseURL.appendingPathComponent("/routes"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuth(&req)

        var body: [String: Any] = [
            "gps_track": geoJSONLineString(from: coordinates),
            "visibility": visibility,
            "started_at": iso8601(startedAt),
            "finished_at": iso8601(finishedAt),
            "duration_s": durationS
        ]
        if let title, !title.isEmpty { body["title"] = title }
        if let city, !city.isEmpty { body["city"] = city }

        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        return try decoder.decode(RouteResponse.self, from: data)
    }

    // MARK: - Fetch my routes

    func fetchMyRoutes() async throws -> [RouteResponse] {
        var req = URLRequest(url: baseURL.appendingPathComponent("/routes"))
        addAuth(&req)

        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)

        struct Wrapper: Decodable { let items: [RouteResponse] }
        return try decoder.decode(Wrapper.self, from: data).items
    }

    // MARK: - Helpers

    private func addAuth(_ req: inout URLRequest) {
        if let token = Keychain.load(forKey: "jwt") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func geoJSONLineString(from coords: [CLLocationCoordinate2D]) -> [String: Any] {
        [
            "type": "LineString",
            "coordinates": coords.map { [$0.longitude, $0.latitude] }
        ]
    }

    private func iso8601(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    private func assertHTTP(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw RouteServiceError.serverError
        }
    }

    enum RouteServiceError: LocalizedError {
        case serverError
        var errorDescription: String? { "Не удалось сохранить маршрут" }
    }
}

// MARK: - Response model

struct RouteResponse: Codable, Identifiable {
    let id: UUID
    let userId: UUID?
    let title: String?
    let city: String?
    let distanceM: Int?
    let durationS: Int?
    let visibility: String
    let startedAt: Date?
    let finishedAt: Date?
    let createdAt: Date?
}
