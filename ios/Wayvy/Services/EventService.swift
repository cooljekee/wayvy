import Foundation

// MARK: - Models

struct GeoJSONPoint: Codable {
    let type: String
    let coordinates: [Double]

    var lon: Double { coordinates[0] }
    var lat: Double { coordinates[1] }
}

struct EventResponse: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let title: String
    let description: String
    let coverUrl: String?
    let location: GeoJSONPoint
    let address: String
    let startsAt: Date
    let endsAt: Date?
    let visibility: String
    let attendCount: Int
    let isAttending: Bool
    let distanceM: Double?
    let createdAt: Date
}

struct AttendeeUser: Codable, Identifiable {
    let id: UUID
    let username: String?
    let avatarUrl: String?
}

// MARK: - Service

actor EventService {
    static let shared = EventService()

    private let session = URLSession.shared

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

    // MARK: - Fetch feed

    func fetchEvents(limit: Int = 20, offset: Int = 0) async throws -> [EventResponse] {
        var comps = URLComponents(url: baseURL.appendingPathComponent("/events"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)"),
        ]
        var req = URLRequest(url: comps.url!)
        addAuth(&req)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        struct Wrapper: Decodable { let items: [EventResponse] }
        return try decoder.decode(Wrapper.self, from: data).items
    }

    // MARK: - Fetch nearby

    func fetchNearby(lat: Double, lon: Double, radiusM: Int = 5000) async throws -> [EventResponse] {
        var comps = URLComponents(url: baseURL.appendingPathComponent("/events/nearby"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "lat", value: "\(lat)"),
            URLQueryItem(name: "lon", value: "\(lon)"),
            URLQueryItem(name: "radius_m", value: "\(radiusM)"),
        ]
        var req = URLRequest(url: comps.url!)
        addAuth(&req)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        struct Wrapper: Decodable { let items: [EventResponse] }
        return try decoder.decode(Wrapper.self, from: data).items
    }

    // MARK: - Create event

    func createEvent(
        title: String,
        description: String,
        coverURL: String?,
        lat: Double,
        lon: Double,
        address: String,
        startsAt: Date,
        endsAt: Date?,
        visibility: String
    ) async throws -> EventResponse {
        var req = URLRequest(url: baseURL.appendingPathComponent("/events"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuth(&req)

        var body: [String: Any] = [
            "title": title,
            "description": description,
            "lon": lon,
            "lat": lat,
            "address": address,
            "starts_at": iso8601(startsAt),
            "visibility": visibility,
        ]
        if let coverURL { body["cover_url"] = coverURL }
        if let endsAt { body["ends_at"] = iso8601(endsAt) }

        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        return try decoder.decode(EventResponse.self, from: data)
    }

    // MARK: - Attend

    func attend(eventID: UUID) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/events/\(eventID.uuidString)/attend"))
        req.httpMethod = "POST"
        addAuth(&req)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
    }

    // MARK: - Unattend

    func unattend(eventID: UUID) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/events/\(eventID.uuidString)/attend"))
        req.httpMethod = "DELETE"
        addAuth(&req)
        let (_, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw EventServiceError.serverError
        }
    }

    // MARK: - Attendees

    func fetchAttendees(eventID: UUID) async throws -> [AttendeeUser] {
        var req = URLRequest(url: baseURL.appendingPathComponent("/events/\(eventID.uuidString)/attendees"))
        addAuth(&req)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        struct Wrapper: Decodable { let items: [AttendeeUser] }
        return try decoder.decode(Wrapper.self, from: data).items
    }

    // MARK: - Helpers

    private func addAuth(_ req: inout URLRequest) {
        if let token = Keychain.load(forKey: "jwt") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func iso8601(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    private func assertHTTP(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw EventServiceError.serverError
        }
    }

    enum EventServiceError: LocalizedError {
        case serverError
        var errorDescription: String? { "Не удалось загрузить события" }
    }
}
