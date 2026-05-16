import CoreLocation

actor LocationService: NSObject, CLLocationManagerDelegate {
    static let shared = LocationService()

    private let manager = CLLocationManager()
    private var track: [CLLocationCoordinate2D] = []
    private var isRecording = false
    private var streamContinuation: AsyncStream<CLLocationCoordinate2D>.Continuation?

    private(set) var currentLocation: CLLocationCoordinate2D?
    private(set) var recordingStartedAt: Date?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = false
    }

    func requestPermission() {
        manager.requestAlwaysAuthorization()
    }

    func startRecording() -> AsyncStream<CLLocationCoordinate2D> {
        track = []
        isRecording = true
        recordingStartedAt = Date()

        var cont: AsyncStream<CLLocationCoordinate2D>.Continuation?
        let stream = AsyncStream<CLLocationCoordinate2D> { continuation in
            cont = continuation
        }
        streamContinuation = cont
        manager.startUpdatingLocation()
        return stream
    }

    func stopRecording() -> [CLLocationCoordinate2D] {
        isRecording = false
        streamContinuation?.finish()
        streamContinuation = nil
        manager.stopUpdatingLocation()
        return track
    }

    nonisolated func locationManager(
        _ manager: CLLocationManager,
        didUpdateLocations locations: [CLLocation]
    ) {
        Task { await self.handle(locations) }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {}

    private func handle(_ locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        currentLocation = loc.coordinate
        guard isRecording else { return }
        track.append(loc.coordinate)
        streamContinuation?.yield(loc.coordinate)
    }
}
