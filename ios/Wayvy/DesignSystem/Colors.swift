import SwiftUI

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red:     Double(r) / 255,
            green:   Double(g) / 255,
            blue:    Double(b) / 255,
            opacity: Double(a) / 255
        )
    }

    // MARK: - Coral  --wv-coral-*
    static let wvCoral50  = Color(hex: "#FFF1EE")
    static let wvCoral100 = Color(hex: "#FFD9D2")
    static let wvCoral200 = Color(hex: "#FFB1A4")
    static let wvCoral300 = Color(hex: "#FF8876")
    static let wvCoral400 = Color(hex: "#FF6F58")
    static let wvCoral500 = Color(hex: "#FF5A4E")
    static let wvCoral600 = Color(hex: "#E84436")
    static let wvCoral700 = Color(hex: "#C2331F")

    // MARK: - Teal  --wv-teal-*
    static let wvTeal50  = Color(hex: "#E6F8FA")
    static let wvTeal100 = Color(hex: "#B9ECF0")
    static let wvTeal200 = Color(hex: "#7ADBE2")
    static let wvTeal300 = Color(hex: "#3FC6D2")
    static let wvTeal400 = Color(hex: "#14B8C7")
    static let wvTeal500 = Color(hex: "#0A9CA9")
    static let wvTeal600 = Color(hex: "#0A7F8A")

    // MARK: - Amber  --wv-amber-*
    static let wvAmber50  = Color(hex: "#FFF6E0")
    static let wvAmber100 = Color(hex: "#FCE3A8")
    static let wvAmber200 = Color(hex: "#F8CE6E")
    static let wvAmber400 = Color(hex: "#F4B740")
    static let wvAmber500 = Color(hex: "#E09B1F")

    // MARK: - Ink  --wv-ink-*
    static let wvInk50  = Color(hex: "#F4F6FA")
    static let wvInk100 = Color(hex: "#E7EAF0")
    static let wvInk200 = Color(hex: "#C5CBD6")
    static let wvInk300 = Color(hex: "#8A93A4")
    static let wvInk400 = Color(hex: "#5B6577")
    static let wvInk500 = Color(hex: "#3A4150")
    static let wvInk600 = Color(hex: "#2A2F3A")
    static let wvInk700 = Color(hex: "#1F232C")
    static let wvInk800 = Color(hex: "#16191F")
    static let wvInk900 = Color(hex: "#0E1116")

    // MARK: - Semantic aliases
    static let wvRouteOwn    = Color.wvCoral500
    static let wvRouteFollow = Color.wvTeal400

    // MARK: - Scheme-aware surfaces
    static let wvSurface0 = Color(UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(wvHex: "#0B0D11")
            : UIColor(wvHex: "#F4F6FA")
    })

    static let wvSurface1 = Color(UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(wvHex: "#16191F")
            : UIColor(wvHex: "#FFFFFF")
    })

    static let wvSurface2 = Color(UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(wvHex: "#1F232C")
            : UIColor(wvHex: "#F8FAFC")
    })
}

private extension UIColor {
    convenience init(wvHex hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        self.init(
            red:   CGFloat((int >> 16) & 0xFF) / 255,
            green: CGFloat((int >> 8)  & 0xFF) / 255,
            blue:  CGFloat(int         & 0xFF) / 255,
            alpha: 1
        )
    }
}
