import UIKit
import CoreLocation
import SwiftUI

// MARK: - Pin data types

enum WaypointPinKind: Sendable {
    case routeLinked(stepNumber: Int)
    case standalone
}

struct WaypointPin: Identifiable, Sendable {
    let id: UUID
    let coordinate: CLLocationCoordinate2D
    let kind: WaypointPinKind
}

// MARK: - UIImage generator for Yandex MapKit placemarks

enum WaypointBubble {

    // 52×52pt rounded-square pin.
    // Route-linked: coral (#FF5A4E) background + step number.
    // Standalone: ink800 (#16191F) background + map-pin icon.
    static func makeImage(kind: WaypointPinKind) -> UIImage {
        let totalSize = CGSize(width: 52, height: 52)
        let borderWidth: CGFloat = 2.5
        let cornerRadius: CGFloat = 12
        let innerRect = CGRect(origin: .zero, size: totalSize).insetBy(dx: borderWidth, dy: borderWidth)

        let renderer = UIGraphicsImageRenderer(size: totalSize)
        return renderer.image { ctx in
            let cgCtx = ctx.cgContext

            // White border
            let borderPath = UIBezierPath(roundedRect: CGRect(origin: .zero, size: totalSize), cornerRadius: cornerRadius + borderWidth)
            UIColor.white.setFill()
            borderPath.fill()

            // Background fill
            let bgColor: UIColor
            switch kind {
            case .routeLinked: bgColor = UIColor(red: 1.0, green: 0.353, blue: 0.306, alpha: 1) // #FF5A4E
            case .standalone:  bgColor = UIColor(red: 0.086, green: 0.098, blue: 0.122, alpha: 1) // #16191F
            }
            let innerPath = UIBezierPath(roundedRect: innerRect, cornerRadius: cornerRadius)
            bgColor.setFill()
            innerPath.fill()

            // Clip to inner shape for icon drawing
            cgCtx.saveGState()
            innerPath.addClip()

            switch kind {
            case .routeLinked(let step):
                drawStepNumber(step, in: innerRect, ctx: cgCtx)
            case .standalone:
                drawMapPinIcon(in: innerRect, ctx: cgCtx)
            }

            cgCtx.restoreGState()
        }
    }

    // MARK: - Icon drawing

    private static func drawStepNumber(_ number: Int, in rect: CGRect, ctx: CGContext) {
        let str = "\(number)" as NSString
        let fontSize: CGFloat = number > 9 ? 16 : 20
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: fontSize, weight: .bold),
            .foregroundColor: UIColor.white,
        ]
        let strSize = str.size(withAttributes: attrs)
        let strRect = CGRect(
            x: rect.midX - strSize.width / 2,
            y: rect.midY - strSize.height / 2,
            width: strSize.width,
            height: strSize.height
        )
        str.draw(in: strRect, withAttributes: attrs)
    }

    private static func drawMapPinIcon(in rect: CGRect, ctx: CGContext) {
        let cx = rect.midX
        let cy = rect.midY - 3
        let headRadius: CGFloat = 8
        let innerRadius: CGFloat = 3.5

        // Pin head (circle)
        let headRect = CGRect(x: cx - headRadius, y: cy - headRadius, width: headRadius * 2, height: headRadius * 2)
        let headPath = UIBezierPath(ovalIn: headRect)
        UIColor.white.setFill()
        headPath.fill()

        // Pin tail
        let tailPath = UIBezierPath()
        tailPath.move(to: CGPoint(x: cx - 5, y: cy + headRadius - 2))
        tailPath.addLine(to: CGPoint(x: cx, y: cy + headRadius + 8))
        tailPath.addLine(to: CGPoint(x: cx + 5, y: cy + headRadius - 2))
        tailPath.close()
        UIColor.white.setFill()
        tailPath.fill()

        // Inner dot (negative space to show background color)
        let innerRect = CGRect(x: cx - innerRadius, y: cy - innerRadius, width: innerRadius * 2, height: innerRadius * 2)
        let innerPath = UIBezierPath(ovalIn: innerRect)
        UIColor(red: 0.086, green: 0.098, blue: 0.122, alpha: 1).setFill() // #16191F
        innerPath.fill()
    }
}
