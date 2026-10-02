---
name: "Faculty of Education NPU Design System"
version: "1.1.0"
author: "Faculty of Education, Nakhon Phanom University (คณะครุศาสตร์ มหาวิทยาลัยนครพนม)"
description: "Minimalist, clean academic design system replicating the official Faculty of Education web applications at Nakhon Phanom University."
tokens:
  color:
    brand:
      darkRoast: "#291506"
      footerBrown: "#3E2112"
      deepBrown: "#351C0D"
      accentAmber: "#B45309"
      goldenOchre: "#C2410C"
      activeCardBg: "#FCF8ED"
      activeCardBorder: "#FDE68A"
    neutral:
      canvas: "#FAF9F6"
      surface: "#FFFFFF"
      border: "#E7E5E4"
      borderFocus: "#B45309"
      textPrimary: "#1C1917"
      textSecondary: "#57534E"
      textMuted: "#78716C"
      textLight: "#A8A29E"
    semantic:
      requiredRed: "#DC2626"
      successGreen: "#15803D"
      infoBg: "#FAF9F6"
      infoBorder: "#E7E5E4"
  typography:
    family:
      primary: "'Prompt', 'Sarabun', sans-serif"
      formal: "'Sarabun', sans-serif"
    scale:
      xs: "0.75rem"
      sm: "0.875rem"
      base: "1rem"
      lg: "1.125rem"
      xl: "1.25rem"
      "2xl": "1.5rem"
      "3xl": "1.875rem"
---

# Faculty of Education NPU Design System (คณะครุศาสตร์ มหาวิทยาลัยนครพนม)

Design System specification directly modeled after the official Faculty of Education, Nakhon Phanom University web application:
- **Visual Style**: Minimalist, clean, airy academic aesthetic with generous whitespace and high typographic hierarchy.
- **Color Identity**:
  - **Dark Roast Brown (`#291506`)**: Primary button color, active accessibility toggle, and high-emphasis controls.
  - **Deep Footer Brown (`#3E2112`)**: Persistent dark brown footer bar with university department credentials.
  - **Warm Golden Ochre (`#B45309`)**: Active step circle badge, accent highlights, and step progress indicators.
  - **Soft Cream Tint (`#FCF8ED`)**: Active navigation step container background.
  - **Stone Grays (`#1C1917`, `#57534E`, `#78716C`, `#E7E5E4`)**: Clean text hierarchy, soft input borders, and neutral backgrounds.
- **Component Patterns**:
  - **Header**: Pure white background (`#FFFFFF`), NPU logo, 3-line official hierarchy typography, right-side pill navigation, language switcher (`ไทย` / `EN`), accessibility font size controls (`ก-`, `ก`, `ก+`), and user email badge.
  - **Vertical Stepper Navigation**: Numbered circular badges linked by vertical connector lines. Active step highlighted with golden badge and soft cream card.
  - **Form Inputs**: Minimalist white fields, thin stone borders, red asterisks (`*`) for required fields, clean helper callout banners (`ⓘ`).
  - **Sticky Action Bar**: Fixed bottom bar featuring `✔ บันทึกร่างอัตโนมัติ` on the left, with `← ย้อนกลับ` and `ถัดไป →` action buttons on the right.


---

## 1. Design Philosophy & Identity

The visual identity of Nakhon Phanom University reflects academic excellence rooted in the sacred cultural heritage of the Mekong River basin and Phra That Phanom:

- **Warm Terracotta & Sacred Fire (`#EA580C`, `#C2410C`):** Primary brand colors inspired by the architectural terracotta brick of Phra That Phanom pagoda and the sacred spire flame.
- **Golden Paddy Ears (`#F59E0B`, `#D97706`):** Representing growth, student potential, and the agricultural richness of the Isan region.
- **Mekong River Blue (`#2563EB`, `#0284C7`):** Accent color denoting the life-giving flow of the Mekong River bordering Nakhon Phanom.
- **Academic Serenity & Contrast:** Clean off-white and cool zinc backgrounds (`#F8FAFC`, `#FFFFFF`) with deep slate typography (`#0F172A`) for maximum readability and zero eye fatigue.

---

## 2. Anti-Patterns (Banned AI Slop)

To maintain a professional, institutional aesthetic, the following tropes are strictly forbidden:

| Category | Banned Cliché | Required Implementation |
| :--- | :--- | :--- |
| **Colors** | Neon purple-to-blue gradients, glowing drop shadows | Solid brand colors, subtle tonal shifts, and authentic university hues |
| **Cards** | Cards nested inside cards with hairline borders | Flat depth hierarchy, clean dividers, whitespace separation |
| **Typography**| Tracking-out tiny all-caps eyebrows over large text | Clean semantic headings with Thai typography (Prompt / Sarabun) |
| **Buttons** | Wrapped or truncated button labels | Single-line labels with whitespace-nowrap and exact 2x horizontal padding |
| **Modals** | Dark translucent glassmorphism with neon blur | Solid, crisp white surfaces (`#FFFFFF`) with subtle outer drop shadows |

---

## 3. Typography & Hierarchy

- **Primary Font:** `Prompt` (Google Fonts) for modern, highly legible Thai and English UI text.
- **Secondary Font:** `Sarabun` (Google Fonts) for formal academic transcripts, certificates, and long-form descriptions.
- **Scale:**
  - **H1 (Page Title):** 24px–28px, Bold, tracking tight, slate-900.
  - **H2 (Section Header):** 18px–20px, Semibold, slate-800.
  - **H3 (Card / Modal Title):** 16px, Medium/Semibold, slate-800.
  - **Body Text:** 14px–15px, Regular (400), line-height 1.5–1.6, slate-700.
  - **Captions / Badges:** 12px–13px, Medium (500), single-line only.

---

## 4. Spacing & Spatial Mathematics

- **Grid Base:** 4px rhythmic scale (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px, `p-6` = 24px).
- **Container Outer Padding:** Must always equal or exceed inner item spacing (minimum 16px).
- **Button Padding Ratio:** Horizontal padding is strictly 2x vertical padding:
  - Small Button: `px-3 py-1.5` (12px / 6px)
  - Standard Button: `px-4 py-2` (16px / 8px)
  - Large / Hero Button: `px-6 py-3` (24px / 12px)
- **Border Radius Math:** Nested elements follow `Inner Radius = Outer Radius - Padding`.

---

## 5. Components & UI Patterns

### 5.1 Primary Buttons
```tsx
<button className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-lg shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 whitespace-nowrap">
  {children}
</button>
```

### 5.2 Status Badges (K-P-A & Activity Status)
- **Approved / Complete:** `bg-green-50 text-green-700 border border-green-200`
- **Pending / In Review:** `bg-amber-50 text-amber-700 border border-amber-200`
- **Rejected / Needs Correction:** `bg-red-50 text-red-700 border border-red-200`
- **General Info / Tag:** `bg-blue-50 text-blue-700 border border-blue-200`

### 5.3 Surface & Card Container
```tsx
<div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
  {content}
</div>
```

---

## 6. Agent Instructions for UI Implementation

When implementing UI in this codebase, the agent must:
1. Reference the tokens defined in the YAML front matter of this `DESIGN.md`.
2. Ensure all Thai text maintains natural phrasing, correct vowel placement, and uses the `Prompt` font.
3. Keep mobile touch targets at least 44px for QR scanner controls and submission buttons.
4. Maintain accessibility with high contrast ratios (WCAG AA compliant, text contrast ratio ≥ 4.5:1).
5. Never invent disparate color themes or dark mode overrides that clash with the NPU brand identity.
