import Foundation
import CoreLocation

// MARK: - Models

struct Waypoint: Codable, Identifiable {
    let id: UUID
    let userId: UUID?
    let routeId: UUID?
    let title: String
    let description: String?
    let address: String?
    let placeName: String?
    let visibility: String
    let coverPhotoURL: String?
    let createdAt: Date?
}

struct MapWaypoint: Codable, Identifiable, Sendable {
    let id: UUID
    let routeId: UUID?
    let title: String
    let lat: Double
    let lon: Double
    let coverPhotoURL: String?
    let authorID: UUID?
    let authorName: String?
    let stepIndex: Int?

    var isStandalone: Bool { routeId == nil }
}

struct WaypointPhoto: Codable, Identifiable {
    let id: UUID
    let waypointId: UUID
    let r2Key: String
    let url: String
    let orderIndex: Int
    let createdAt: Date?
}

// MARK: - Service

actor WaypointService {
    static let shared = WaypointService()

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

    // MARK: - Create

    func createWaypoint(
        lat: Double,
        lon: Double,
        title: String,
        description: String?,
        visibility: String,
        routeID: UUID?
    ) async throws -> Waypoint {
        var req = URLRequest(url: baseURL.appendingPathComponent("/waypoints"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuth(&req)

        var body: [String: Any] = [
            "lat": lat,
            "lon": lon,
            "title": title,
            "visibility": visibility,
        ]
        if let description, !description.isEmpty { body["description"] = description }
        if let routeID { body["route_id"] = routeID.uuidString }

        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        return try decoder.decode(Waypoint.self, from: data)
    }

    // MARK: - Map bbox query (GET /waypoints/map?bbox=minLon,minLat,maxLon,maxLat)

    func fetchByBBox(minLon: Double, minLat: Double, maxLon: Double, maxLat: Double) async throws -> [MapWaypoint] {
        var comps = URLComponents(
            url: baseURL.appendingPathComponent("/waypoints/map"),
            resolvingAgainstBaseURL: false
        )!
        comps.queryItems = [
            URLQueryItem(name: "bbox", value: "\(minLon),\(minLat),\(maxLon),\(maxLat)")
        ]
        var req = URLRequest(url: comps.url!)
        addAuth(&req)

        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        struct Wrapper: Decodable { let items: [MapWaypoint] }
        return try decoder.decode(Wrapper.self, from: data).items
    }

    // MARK: - Nearby

    func fetchNearby(lat: Double, lon: Double, radiusM: Int) async throws -> [Waypoint] {
        var comps = URLComponents(
            url: baseURL.appendingPathComponent("/waypoints/nearby"),
            resolvingAgainstBaseURL: false
        )!
        comps.queryItems = [
            URLQueryItem(name: "lat", value: "\(lat)"),
            URLQueryItem(name: "lon", value: "\(lon)"),
            URLQueryItem(name: "radius_m", value: "\(radiusM)"),
        ]
        var req = URLRequest(url: comps.url!)
        addAuth(&req)

        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        struct Wrapper: Decodable { let items: [Waypoint] }
        return try decoder.decode(Wrapper.self, from: data).items
    }

    // MARK: - Attach photo

    func attachPhoto(waypointID: UUID, r2Key: String, url: String) async throws {
        let path = "/waypoints/\(waypointID.uuidString)/photos"
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuth(&req)

        let body: [String: Any] = ["r2_key": r2Key, "url": url]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
    }

    // MARK: - Helpers

    private func addAuth(_ req: inout URLRequest) {
        if let token = Keychain.load(forKey: "jwt") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func assertHTTP(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw WaypointServiceError.serverError
        }
    }

    enum WaypointServiceError: LocalizedError {
        case serverError
        var errorDescription: String? { "Не удалось сохранить точку" }
    }
}
