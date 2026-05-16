import SwiftUI
import YandexMapsMobile
import CoreLocation

struct YandexMapView: UIViewRepresentable {
    var userLocation: CLLocationCoordinate2D?
    var ownPolylines: [[CLLocationCoordinate2D]]
    var followPolylines: [[CLLocationCoordinate2D]]
    var waypoints: [WaypointPin] = []
    var onLongPress: ((CLLocationCoordinate2D) -> Void)?
    var onWaypointTap: ((UUID) -> Void)?
    var onCameraIdle: ((CLLocationCoordinate2D) -> Void)?

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> YMKMapView {
        let mapView = YMKMapView(frame: .zero)!

        let longPress = UILongPressGestureRecognizer(
            target: context.coordinator,
            action: #selector(Coordinator.handleLongPress(_:))
        )
        longPress.minimumPressDuration = 0.5
        mapView.addGestureRecognizer(longPress)
        mapView.mapWindow.map.addCameraListener(with: context.coordinator)

        return mapView
    }

    func updateUIView(_ mapView: YMKMapView, context: Context) {
        context.coordinator.update(mapView: mapView, parent: self)
    }

    // MARK: - Coordinator

    @MainActor
    final class Coordinator: NSObject, @preconcurrency YMKMapCameraListener, @preconcurrency YMKMapObjectTapListener {
        var parent: YandexMapView
        private var meDot: YMKPlacemarkMapObject?
        private var ownObjects: [YMKPolylineMapObject] = []
        private var followObjects: [YMKPolylineMapObject] = []
        private var waypointPlacemarks: [UUID: YMKPlacemarkMapObject] = [:]
        private var placemarkToID: [ObjectIdentifier: UUID] = [:]

        init(_ parent: YandexMapView) {
            self.parent = parent
        }

        // MARK: - YMKMapCameraListener

        func onCameraPositionChanged(
            with map: YMKMap,
            cameraPosition: YMKCameraPosition,
            cameraUpdateReason: YMKCameraUpdateReason,
            finished: Bool
        ) {
            guard finished else { return }
            let coord = CLLocationCoordinate2D(
                latitude: Double(cameraPosition.target.latitude),
                longitude: Double(cameraPosition.target.longitude)
            )
            parent.onCameraIdle?(coord)
        }

        @MainActor
        func update(mapView: YMKMapView, parent: YandexMapView) {
            let map = mapView.mapWindow.map
            let objects = map.mapObjects

            ownObjects.forEach { objects.remove(with: $0) }
            followObjects.forEach { objects.remove(with: $0) }
            ownObjects = []
            followObjects = []

            for coords in parent.ownPolylines where !coords.isEmpty {
                let points = coords.map { YMKPoint(latitude: $0.latitude, longitude: $0.longitude) }
                let obj = objects.addPolyline(with: YMKPolyline(points: points))
                obj.setPaletteColorWithColorIndex(0, color: UIColor(Color.wvCoral500))
                obj.setStrokeColorsWithColors([0])
                obj.strokeWidth = 4.0
                obj.outlineColor = UIColor(Color.wvCoral500).withAlphaComponent(0.28)
                obj.outlineWidth = 6.0
                ownObjects.append(obj)
            }

            for coords in parent.followPolylines where !coords.isEmpty {
                let points = coords.map { YMKPoint(latitude: $0.latitude, longitude: $0.longitude) }
                let obj = objects.addPolyline(with: YMKPolyline(points: points))
                obj.setPaletteColorWithColorIndex(0, color: UIColor(Color.wvTeal400))
                obj.setStrokeColorsWithColors([0])
                obj.strokeWidth = 3.0
                obj.outlineColor = UIColor(Color.wvTeal400).withAlphaComponent(0.28)
                obj.outlineWidth = 5.0
                followObjects.append(obj)
            }

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

            updateWaypoints(parent.waypoints, objects: objects)
            self.parent = parent
        }

        @MainActor
        private func updateWaypoints(_ pins: [WaypointPin], objects: YMKMapObjectCollection) {
            let newIDs = Set(pins.map(\.id))
            let oldIDs = Set(waypointPlacemarks.keys)

            for id in oldIDs.subtracting(newIDs) {
                if let obj = waypointPlacemarks.removeValue(forKey: id) {
                    placemarkToID.removeValue(forKey: ObjectIdentifier(obj))
                    objects.remove(with: obj)
                }
            }

            for pin in pins where waypointPlacemarks[pin.id] == nil {
                let point = YMKPoint(latitude: pin.coordinate.latitude, longitude: pin.coordinate.longitude)
                let placemark = objects.addPlacemark(with: point)
                placemark.setIconWith(WaypointBubble.makeImage(kind: pin.kind))
                if parent.onWaypointTap != nil {
                    placemark.addTapListener(with: self)
                }
                waypointPlacemarks[pin.id] = placemark
                placemarkToID[ObjectIdentifier(placemark)] = pin.id
            }
        }

        // MARK: - YMKMapObjectTapListener

        func onMapObjectTap(with mapObject: YMKMapObject, point: YMKPoint) -> Bool {
            guard let id = placemarkToID[ObjectIdentifier(mapObject)] else { return false }
            parent.onWaypointTap?(id)
            return true
        }

        // MARK: - Long press

        @MainActor @objc func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
            guard gesture.state == .began,
                  let mapView = gesture.view as? YMKMapView else { return }

            let touchPoint = gesture.location(in: mapView)
            let screenPoint = YMKScreenPoint(x: Float(touchPoint.x), y: Float(touchPoint.y))
            guard let geoPoint = mapView.mapWindow.screenToWorld(with: screenPoint) else { return }
            let coord = CLLocationCoordinate2D(latitude: geoPoint.latitude, longitude: geoPoint.longitude)
            parent.onLongPress?(coord)
        }

        // MARK: - Me dot

        private func makeMeDotImage() -> UIImage {
            let size = CGSize(width: 24, height: 24)
            let renderer = UIGraphicsImageRenderer(size: size)
            return renderer.image { ctx in
                UIColor.systemBlue.withAlphaComponent(0.18).setFill()
                ctx.cgContext.fillEllipse(in: CGRect(origin: .zero, size: size))
                UIColor.white.setFill()
                ctx.cgContext.fillEllipse(in: CGRect(x: 3, y: 3, width: 18, height: 18))
                UIColor.systemBlue.setFill()
                ctx.cgContext.fillEllipse(in: CGRect(x: 6, y: 6, width: 12, height: 12))
            }
        }
    }
}
