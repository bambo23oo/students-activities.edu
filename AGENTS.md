# Agent Guidelines & Design System Enforcement

This project follows the **DESIGN.md** design system specification (adhering to the standard from https://designmd.app/).

## Mandatory Design System Directives

1. **Design System Source of Truth:**
   - Always read and respect `/DESIGN.md` before generating or modifying any UI components.
   - Use the designated color tokens:
     - Primary: Warm Terracotta / Orange (`#EA580C`, `#C2410C`)
     - Secondary: Sacred Gold (`#F59E0B`)
     - Accent: Mekong River Blue (`#2563EB`)
     - Neutrals: Slate / Zinc off-whites and dark text (`#0F172A`, `#FFFFFF`, `#F8FAFC`)
2. **Typography Standards:**
   - Use Google Fonts `Prompt` and `Sarabun` for Thai and English typography.
   - Do not fall back to generic fonts without font family pairing.
3. **Anti-Pattern Guardrails:**
   - Reject AI clichés: No arbitrary purple/cyan glowing gradients, no nested cards, no truncated button labels.
   - Button padding math: Horizontal padding must always equal 2x vertical padding.
   - Touch targets on mobile must be at least 44px (especially QR scanner and check-in controls).
4. **Database & API Integration:**
   - Supabase tables: `students`, `activities`, `check_in_logs`, `reflections`.
   - Never break working real-time sync or scanner mechanics when enhancing UI.
