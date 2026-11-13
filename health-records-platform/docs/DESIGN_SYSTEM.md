# Design system

**Intent:** calm, clinical and trustworthy, never generic. Warm paper canvas, deep teal brand, navy ink. Restraint over decoration: 1px warm borders, small radii, almost no shadow, no gradients or glass.

## Typography

| Role | Face | Use |
|---|---|---|
| Display | Newsreader (variable serif) | Patient greetings, page-defining headlines, landing. Human and editorial, used sparingly. |
| UI | Public Sans (variable) | Everything else. Designed for public services, with very high legibility at small sizes. |
| Data | IBM Plex Mono | Health IDs, references (`REQ-…`, `PRM-…`), licence numbers, hashes |

All three are self-hosted through `@fontsource`, so the browser makes no third-party font requests. The scale runs 11 / 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 px (`--text-*` in `globals.css`).

## Colour tokens and measured contrast (WCAG 2.2 AA)

| Pair | Ratio |
|---|---|
| ink `#13233A` on canvas `#F6F4EF` | 14.4:1 |
| ink-2 `#3A4757` on white | 9.5:1 |
| ink-3 `#5A6574` on canvas / white | 5.4 / 5.9:1 |
| brand-600 `#0F6E5C` on white / canvas | 6.2 / 5.6:1 |
| white on brand-600 | 6.2:1 |
| success / warning / danger / info text on their tints | 6.2 / 5.9 / 6.2 / 7.3:1 |
| navy-200 on navy-800 (provider/admin sidebar) | 10.4:1 |

Status is never shown by colour alone. Every badge has text, and provenance badges also carry an icon.

## Provenance language

| Source | Badge | Rule colour |
|---|---|---|
| Verified institution | green, `verified` icon | teal |
| Approved integration | blue, `share` icon | blue |
| Uploaded by patient | sand, `upload_file` icon, *"not medically verified"* | sand |

## Components (`src/components`)

- `ui/`: Button (variants: primary, secondary, ghost, danger, danger-outline, navy, link; with a loading state), Field/Input/Textarea/Select (label, hint and error wired automatically through context), Checkbox / CheckboxCard, RadioCards, Dialog, ConfirmDialog (reason and step-up built in), DropdownMenu, Badge, Callout, Card, Stat, Table, TabsNav (URL-driven), FilterBar (no-JS GET form), Pagination, EmptyState, Skeleton / PageSkeleton, Toaster (polite live region), PasswordInput, ActionButton, Icon.
- `shell/`: one `AppShell` with three moods (patient light, provider/admin navy), MobileDrawer, BottomNav (patient, mobile), UserMenu, NotificationBell, SkipLink, SyntheticBanner.
- `domain/`: RecordRow, ProvenanceBadge, CategoryIcon, HealthIdChip, ActivityItem, NotificationList, AccessGuard, FileDrop and upload with progress, StructuredData, Charts (with screen-reader figcaptions), SecuritySettings, IdentityForm.

## Icons

Google Material Symbols, Rounded, weight 400. `scripts/build-icons.mjs` extracts only the glyphs in use (outline and filled) into `icon-paths.ts`. Icons are decorative (`aria-hidden`) unless given a `label`.

## Accessibility practices

Skip link, a visible focus ring on everything, labelled controls with `aria-describedby` hints and errors, `aria-invalid`, `aria-current` in navigation, live regions for toasts, uploads and access expiry, reduced-motion support, 44px minimum targets on mobile, and a bottom navigation for thumb reach. Verified by `e2e/accessibility.spec.ts` (axe-core, WCAG 2.2 A/AA) on 32 screens. Manual screen-reader testing (TalkBack and VoiceOver) is still needed before the pilot.
