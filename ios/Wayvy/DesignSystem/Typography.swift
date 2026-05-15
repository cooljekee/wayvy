import SwiftUI

extension Font {
    // MARK: - Display  (SF Pro Display — auto-selected by system at large sizes)
    static let wvMetric = Font.system(size: 44, weight: .bold, design: .rounded)
        .monospacedDigit()
    static let wvH1 = Font.system(size: 34, weight: .bold,     design: .default)
    static let wvH2 = Font.system(size: 28, weight: .bold,     design: .default)
    static let wvH3 = Font.system(size: 22, weight: .semibold, design: .default)

    // MARK: - Body  (SF Pro Text)
    static let wvBody      = Font.system(size: 16, weight: .regular, design: .default)
    static let wvBodySmall = Font.system(size: 14, weight: .regular, design: .default)
    static let wvCaption   = Font.system(size: 12, weight: .medium,  design: .default)
    static let wvEyebrow   = Font.system(size: 11, weight: .bold,    design: .default)
}
