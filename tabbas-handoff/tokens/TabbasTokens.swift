// Tabbas tokens v0.1. Generated from the design prototype.
import SwiftUI

enum TabbasTheme { case night, forest }

struct TabbasColors {
    let bg: Color
    let surface: Color
    let surface2: Color
    let line: Color
    let text: Color
    let muted: Color
    let accent: Color
    let onAccent: Color
    let accentText: Color
    let accentSoft: Color
    let iconTile: Color
    let heroText: Color
    let heroMuted: Color
    let heroChipBg: Color
    let heroChipText: Color
    let danger: Color
    let dangerText: Color
    let dangerSoft: Color
    let waitText: Color
    let waitSoft: Color
    let navBg: Color
    let scrim: Color
    let confirmBg: Color
    let confirmText: Color
    let confirmMuted: Color
    let checkBg: Color
    let checkColor: Color

    static func of(_ theme: TabbasTheme) -> TabbasColors {
        switch theme {
        case .night: return TabbasColors(
            bg: Color(red: 0.039, green: 0.047, blue: 0.043),
            surface: Color(red: 0.078, green: 0.094, blue: 0.086),
            surface2: Color(red: 0.110, green: 0.129, blue: 0.118),
            line: Color(red: 0.149, green: 0.173, blue: 0.157),
            text: Color(red: 0.953, green: 0.961, blue: 0.945),
            muted: Color(red: 0.604, green: 0.639, blue: 0.616),
            accent: Color(red: 0.831, green: 0.961, blue: 0.235),
            onAccent: Color(red: 0.039, green: 0.047, blue: 0.043),
            accentText: Color(red: 0.831, green: 0.961, blue: 0.235),
            accentSoft: Color(red: 0.831, green: 0.961, blue: 0.235).opacity(0.14),
            iconTile: Color(red: 0.110, green: 0.129, blue: 0.118),
            heroText: Color(red: 0.953, green: 0.961, blue: 0.945),
            heroMuted: Color(red: 0.604, green: 0.639, blue: 0.616),
            heroChipBg: Color(red: 0.831, green: 0.961, blue: 0.235).opacity(0.14),
            heroChipText: Color(red: 0.831, green: 0.961, blue: 0.235),
            danger: Color(red: 1.000, green: 0.478, blue: 0.349),
            dangerText: Color(red: 1.000, green: 0.478, blue: 0.349),
            dangerSoft: Color(red: 1.000, green: 0.478, blue: 0.349).opacity(0.13),
            waitText: Color(red: 0.961, green: 0.769, blue: 0.318),
            waitSoft: Color(red: 0.961, green: 0.769, blue: 0.318).opacity(0.13),
            navBg: Color(red: 0.078, green: 0.094, blue: 0.086),
            scrim: Color(red: 0.000, green: 0.000, blue: 0.000).opacity(0.62),
            confirmBg: Color(red: 0.831, green: 0.961, blue: 0.235),
            confirmText: Color(red: 0.039, green: 0.047, blue: 0.043),
            confirmMuted: Color(red: 0.227, green: 0.278, blue: 0.086),
            checkBg: Color(red: 0.039, green: 0.047, blue: 0.043),
            checkColor: Color(red: 0.831, green: 0.961, blue: 0.235))
        case .forest: return TabbasColors(
            bg: Color(red: 0.953, green: 0.945, blue: 0.918),
            surface: Color(red: 1.000, green: 1.000, blue: 1.000),
            surface2: Color(red: 0.890, green: 0.925, blue: 0.898),
            line: Color(red: 0.882, green: 0.871, blue: 0.831),
            text: Color(red: 0.055, green: 0.102, blue: 0.082),
            muted: Color(red: 0.333, green: 0.380, blue: 0.353),
            accent: Color(red: 0.059, green: 0.239, blue: 0.180),
            onAccent: Color(red: 1.000, green: 1.000, blue: 1.000),
            accentText: Color(red: 0.059, green: 0.239, blue: 0.180),
            accentSoft: Color(red: 0.890, green: 0.925, blue: 0.898),
            iconTile: Color(red: 0.890, green: 0.925, blue: 0.898),
            heroText: Color(red: 1.000, green: 1.000, blue: 1.000),
            heroMuted: Color(red: 0.725, green: 0.827, blue: 0.769),
            heroChipBg: Color(red: 0.831, green: 0.961, blue: 0.235),
            heroChipText: Color(red: 0.059, green: 0.239, blue: 0.180),
            danger: Color(red: 0.706, green: 0.137, blue: 0.094),
            dangerText: Color(red: 0.557, green: 0.106, blue: 0.086),
            dangerSoft: Color(red: 0.984, green: 0.894, blue: 0.882),
            waitText: Color(red: 0.431, green: 0.329, blue: 0.000),
            waitSoft: Color(red: 1.000, green: 0.957, blue: 0.800),
            navBg: Color(red: 1.000, green: 1.000, blue: 1.000),
            scrim: Color(red: 0.055, green: 0.102, blue: 0.082).opacity(0.45),
            confirmBg: Color(red: 0.059, green: 0.239, blue: 0.180),
            confirmText: Color(red: 1.000, green: 1.000, blue: 1.000),
            confirmMuted: Color(red: 0.725, green: 0.827, blue: 0.769),
            checkBg: Color(red: 0.831, green: 0.961, blue: 0.235),
            checkColor: Color(red: 0.059, green: 0.239, blue: 0.180))
        }
    }
}

// Gradients (heroBg in Night, card backgrounds) are kept in tokens.json; build them with LinearGradient/RadialGradient.
