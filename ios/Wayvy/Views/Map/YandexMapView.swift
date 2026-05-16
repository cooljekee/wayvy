import SwiftUI
import YandexMapsMobile
import CoreLocation

struct YandexMapView: UIViewRepresentable {
    var userLocation: CLLocationCoordinate2D?
    var ownPolylines: [[CLLocationCoordinate2D]]
    var followPolylines: [[CLLocationCoordinate2D]]
    var waypoints: [WaypointPin] = []
    var onLongPress: ((CLLocationCoordinate2D) -> Void)?

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> YMKMapView {
        let mapView = YMKMapView(frame: .zero)
        // Night style JSON — replace with full Yandex night style JSON for production
        // mapView.mapWindow.map.setMapStyleWithStyle(YandexNightStyle.json)

        let longPress = UILongPressGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleLongPress(_:))
        )
        longPress.minimumPressDuration = 0.5
        mapView.addGestureRecognizer(longPress)

        return mapView
    }

    func updateUIView(_ mapView: YMKMapView, context: Context) {
        context.coordinator.update(mapView: mapView, parent: self)
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject {
        var parent: YandexMapView
        private var meDot: YMKPlacemarkMapObject?
        private var ownObjects: [YMKPolylineMapObject] = []
        private var followObjects: [YMKPolylineMapObject] = []
        private var waypointPlacemarks: [UUID: YMKPlacemarkMapObject] = [:]

        init(_ parent: YandexMapView) {
            self.parent = parent
        }

        func update(mapView: YMKMapView, parent: YandexMapView) {
            let map = mapView.mapWindow.map
            let objects = map.mapObjects

            // Remove stale polylines
            ownObjects.forEach { objects.remove(with: $0) }
            followObjects.forEach { objects.remove(with: $0) }
            ownObjects = []
            followObjects = []

            // Own polylines — coral, 4pt + glow outline
            for coords in parent.ownPolylines where !coords.isEmpty {
                let points = coords.map { YMKPoint(latitude: $0.latitude, longitude: $0.longitude) }
                let obj = objects.addPolyline(with: YMKPolyline(points: points))
                obj.strokeColor = UIColor(Color.wvCoral500)
                obj.strokeWidth = 4.0
                obj.outlineColor = UIColor(Color.wvCoral500).withAlphaComponent(0.28)
                obj.outlineWidth = 6.0
                ownObjects.append(obj)
            }

            // Follow polylines — teal, 3pt + glow outline
            for coords in parent.followPolylines where !coords.isEmpty {
                let points = coords.map { YMKPoint(latitude: $0.latitude, longitude: $0.longitude) }
                let obj = objects.addPolyline(with: YMKPolyline(points: points))
                obj.strokeColor = UIColor(Color.wvTeal400)
                obj.strokeWidth = 3.0
                obj.outlineColor = UIColor(Color.wvTeal400).withAlphaComponent(0.28)
                obj.outlineWidth = 5.0
                followObjects.append(obj)
            }

            // Me dot
            if let coord = parent.userLocation {
                let point = YMKPoint(latitude: coord.latitude, longitude: coord.longitude)
                if let dot = meDot {
                    dot.geometry = point
                } else {
                    let dot = objects.addPlacemark(with: point)
                    dot.setIconWith(makeMeDotImage())
                    meDot = dot
                }
            } else if let dot = meDot {
                objects.remove(with: dot)
                meDot = nil
            }

            // Waypoint pins
            updateWaypoints(parent.waypoints, objects: objects)

            self.parent = parent
        }

        private func updateWaypoints(_ pins: [WaypointPin], objects: YMKMapObjectCollection) {
            let newIDs = Set(pins.map(\.id))
            let oldIDs = Set(waypointPlacemarks.keys)

            // Remove stale
            for id in oldIDs.subtracting(newIDs) {
                if let obj = waypointPlacemarks.removeValue(forKey: id) {
                    objects.remove(with: obj)
                }
            }

            // Add new
            for pin in pins where waypointPlacemarks[pin.id] == nil {
                let point = YMKPoint(latitude: pin.coordinate.latitude, longitude: pin.coordinate.longitude)
                let placemark = objects.addPlacemark(with: point)
                placemark.setIconWith(WaypointBubble.makeImage(kind: pin.kind))
                waypointPlacemarks[pin.id] = placemark
            }
        }

        // MARK: - Long press

        @objc func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
            guard gesture.state == .began,
                  let mapView = gesture.view as? YMKMapView else { return }

            let touchPoint = gesture.location(in: mapView)
            let screenPoint = YMKScreenPoint(x: Float(touchPoint.x), y: Float(touchPoint.y))
            let geoPoint = mapView.mapWindow.screenToWorld(with: screenPoint)
            let coord = CLLocationCoordinate2D(latitude: geoPoint.latitude, longitude: geoPoint.longitude)

            let callback = parent.onLongPress
            Task { @MainActor in
                callback?(coord)
            }
        }

        // MARK: - Me dot

        private func makeMeDotImage() -> UIImage {
            let size = CGSize(width: 24, height: 24)
            let renderer = UIGraphicsImageRenderer(size: size)
            return renderer.image { ctx in
                // Glow ring
                UIColor.systemBlue.withAlphaComponent(0.18).setFill()
                ctx.cgContext.fillEllipse(in: CGRect(origin: .zero, size: size))
                // White border
                UIColor.white.setFill()
                ctx.cgContext.fillEllipse(in: CGRect(x: 3, y: 3, width: 18, height: 18))
                // Blue fill
                UIColor.systemBlue.setFill()
                ctx.cgContext.fillEllipse(in: CGRect(x: 6, y: 6, width: 12, height: 12))
            }
        }
    }
}
