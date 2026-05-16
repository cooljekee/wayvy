import Foundation

// MARK: - Models

struct UserProfile: Codable, Identifiable, Sendable {
    let id: UUID
    let username: String
    let displayName: String?
    let city: String?
    let bio: String?
    let avatarURL: String?
    let routesCount: Int?
    let followersCount: Int?
    let followingCount: Int?
    let isFollowing: Bool?
    let followState: FollowState?

    var name: String { displayName ?? username }

    enum FollowState: String, Codable, Sendable {
        case none, requested, following
    }
}

// MARK: - Service

actor UserService {
    static let shared = UserService()

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

    // MARK: - Fetch profile
    // userID nil → own profile

    func fetchProfile(userID: UUID?) async throws -> UserProfile {
        let path: String
        if let userID {
            path = "/users/\(userID.uuidString)/profile"
        } else {
            path = "/users/me/profile"
        }
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        addAuth(&req)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        return try decoder.decode(UserProfile.self, from: data)
    }

    // MARK: - Follow / unfollow

    func follow(userID: UUID) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/users/\(userID.uuidString)/follow"))
        req.httpMethod = "POST"
        addAuth(&req)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
    }

    func unfollow(userID: UUID) async throws {
        var req = URLRequest(url: baseURL.appendingPathComponent("/users/\(userID.uuidString)/follow"))
        req.httpMethod = "DELETE"
        addAuth(&req)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
    }

    // MARK: - Search

    func search(query: String) async throws -> [UserProfile] {
        var comps = URLComponents(
            url: baseURL.appendingPathComponent("/users/search"),
            resolvingAgainstBaseURL: false
        )!
        comps.queryItems = [URLQueryItem(name: "q", value: query)]
        var req = URLRequest(url: comps.url!)
        addAuth(&req)
        let (data, response) = try await session.data(for: req)
        try assertHTTP(response, data: data)
        struct Wrapper: Decodable { let items: [UserProfile] }
        return try decoder.decode(Wrapper.self, from: data).items
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
            throw UserServiceError.serverError
        }
    }

    enum UserServiceError: LocalizedError {
        case serverError
        var errorDescription: String? { "Не удалось загрузить профиль" }
    }
}
