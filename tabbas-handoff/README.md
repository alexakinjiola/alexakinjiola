# Tabbas: design handoff kit (v0.1)

Tabbas is Hausa for "certainly". It's a Nigerian money app built on one promise: **every transfer lands, or it comes back within 60 seconds.**

The live design, clickable prototype and specs are on the design canvas:
https://claude.ai/artifact/GDDfkCV8hGNRPDF1Pj63qu
The canvas has three pages: Research & brand, App prototype (iOS) and Handoff.

## What's in this folder

| Folder | Contents |
|---|---|
| `tokens/tokens.json` | Colours for both themes (Night is the default, Forest is the light theme), plus type, spacing, radius, sizes and motion |
| `tokens/tokens.css` | The same as CSS custom properties. Add `data-theme="forest"` to switch to Forest |
| `tokens/TabbasTokens.swift` | `TabbasColors.of(.night / .forest)` for SwiftUI. Gradients stay in tokens.json |
| `icons/` | iOS app icon at 1024 px (lime, Night and Forest versions), the mark as SVG, and the lockup as PNG |
| `appstore/` | 4 App Store screenshots at 1290 × 2796 (6.7" iPhone) |
| `screens/night`, `screens/forest` | All 69 screens at @2x in both themes. The file names match the canvas (A01–I06) |

## Placeholders: facts and decisions still needed

These are deliberately left blank in the designs. Please don't invent values for them.

- `[CBN LIMIT]`: daily and balance limits for each KYC tier. Take them from the current CBN circular.
- `[USSD CODE]`: the freeze and send code, from the telco or partner bank.
- `[FEE]`, `[CARD FEE]`, `[PRICE]`: card, statement, top-up and biller pricing.
- `[AMOUNT]`: the cap on transfers from a new device in its first 24 hours.
- Business sign-off: whether to fund the 60-second reversal and the ₦500 late payout from float, and whether a named case owner within 10 minutes is a staffing level you can meet.
- Legal: business-name and trademark search for "Tabbas", plus a native Hausa speaker's check of the meaning and pronunciation.
- How live receipts are verified: confirm the mechanism with the partner bank. It's marked VALIDATE in the specs.

## Rules that must survive into code

1. Never fake progress. If the bank hasn't responded, the tracker says "Waiting on [bank]".
2. Status is never shown by colour alone. Always use an icon and a word.
3. Every tap target is at least 44 × 44 pt.
4. Show every fee before Confirm, and add nothing afterwards.
5. The dashed **PROTOTYPE** pills are for demo navigation only. Don't ship them.
