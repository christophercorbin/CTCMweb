# CargoLink Barbados — UX / QA Review

**Scope:** `https://develop.d1yo6c4008x99n.amplifyapp.com/`
**Date:** 2026-04-13
**Reviewer:** Interactive audit (Chrome, logged-in as `christophercorbin.cyber@gmail.com`, Customer role). Desktop (1569w) + narrow viewport (~1200w). Admin routes not tested (no admin credentials).

---

## Executive summary

The site is structurally solid — auth persistence works, empty states are polished, no console errors, and the dashboard / customer info / rates flows all load. The biggest issues are **on the public marketing landing page**, where a scroll-reveal animation layer is failing to fire for several sections, leaving large blocks of content invisible (stuck at `opacity:0`). A handful of smaller UX issues appear in the authenticated app shell.

**Severity legend:** 🔴 Critical · 🟠 Major · 🟡 Minor · 🟢 Polish

---

## 1. Landing page (marketing)

### 🔴 Scroll-reveal animations not firing for entire sections
The site uses `[data-animate]` + `.cl-visible` (IntersectionObserver) to fade in content. Multiple sections are stuck invisible:
- "Our Shipping Services" section heading
- "AIR FREIGHT" 3-step block (Purchase Online / Bundle / Pick Up) — text and image thumbnails render near-white
- "Our Sales Team Is Here To Help" CTA + Request A Quote button
- "How It Works" heading and intro
- "Contact Us" heading (visible only after interacting)

**Impact:** Significant portions of the homepage look broken / empty on first view. Likely cause: observer `threshold` too high, or `data-animate` nodes added after observer attaches, or the reveal JS isn't running on `/` route hydration. Consider: (a) make `opacity:1` the default and only animate when JS is available (progressive enhancement), or (b) drop to `opacity:0.01` base so content stays readable if JS fails.

### 🟠 Large empty whitespace gaps between sections
Because the invisible sections still occupy layout space, there are multiple ~600–800px tall "empty" scroll regions. Users scrolling through think they've hit the footer twice before they have.

### 🟡 Floating Adobe PDF icon (top-right, fixed)
Appears on every page, no tooltip, no `aria-label`, unclear purpose (rate sheet? brochure?). Also collides with the user-menu dropdown at narrow widths. Add a label or remove.

### 🟡 Hero subhead contrast
Yellow "Smart Shipping To The Caribbean" over a busy container-ship photo — likely fails WCAG AA on parts of the image. Either dim the background image more or move the yellow chip onto a solid pill.

### 🟡 "Contact Us" button is the only hero CTA
For already-registered users, the primary action should be "Go to Dashboard" or "Track a Shipment." There's no track-by-number input on the marketing page — a missed conversion/utility opportunity.

### 🟢 Step watermark numbers in "How It Works" are very faint
Hard to read at a glance. Increase contrast or drop the watermark in favor of clean numbered circles.

---

## 2. Top nav (marketing shell)

### 🟡 No mobile hamburger observed
At ~390px viewport I did not see a collapse-to-hamburger pattern — the horizontal nav persists. Worth verifying on a real device; if confirmed, add a hamburger below a known breakpoint.

### 🟡 User avatar chip shows email prefix, not a name
Top-right pill reads "CC christophercor…" (truncated). Consider showing a first name if available, and increase truncation budget.

### 🟢 Active route isn't highlighted in the top nav on marketing pages (Home/Rates/Contact)
Adds to feeling "where am I?" when deep-linking.

---

## 3. Rates page

### ✅ Works well
Clear hierarchy (Our Rates → Rate Calculator → Handling/Brokerage/FX/Duties → Customs Duty Calculator CTA). Good use of the yellow highlight card for Duties & Taxes.

### 🟡 "Cost Per (LB/USD)" label is jargony
Consider "Weight tier" or "Price per pound (USD/BBD)". Put the units inside the dropdown options rather than in the label.

### 🟢 URL trailing slash inconsistency
`/rates` 302→ `/rates/`. Pick one canonical form for SEO/analytics cleanliness.

---

## 4. Authenticated dashboard (`/dashboard`)

### 🟠 "Welcome back, christophercorbin.cyber"
Greeting uses the email local-part instead of a name. Fall back order should be: first name → full name → email. The email's `.cyber` reads as unpolished.

### 🟡 Sidebar logo is cropped into a tiny white rounded square
Visually inconsistent with the full marketing logo. Reserve a bit more width, or show just the bird icon centered with padding.

### 🟡 Duplicate sign-out affordance
- Sidebar bottom: "Logout"
- Header avatar dropdown: "Sign Out"
- Labels don't even match. Pick one verb and one location.

### 🟢 "My Addresses" card uses monospace for the address block
Readable but visually heavy. Copy button has no `aria-label` that I could detect — add one for screen readers.

### 🟢 No page title differentiation in `<title>`
All authenticated routes share "CargoLink Barbados — The Smarter Way to Ship". Update per-route (e.g., "Dashboard · CargoLink Barbados") for tabs, history, and SEO.

### 🟢 Bell icon (notifications) in top bar
Not tested — confirm it has a click target + empty state, otherwise remove.

---

## 5. `/dashboard/pending-packages` (Ship or Hold)

### 🟡 Empty-state alignment inconsistency
Page title "Ship or Hold" is left-aligned to a mid-width column, but the empty-state illustration + text are visually centered in the viewport. The shipping list on `/dashboard` uses the full content width. Make these consistent.

---

## 6. `/customer-info`

### 🔴 Stray test data + no validation is shipping
- **Address** field is saved as `"etst"` — a 4-char typo string. The form accepted it. No regex/min-length/format validation is blocking junk addresses.
- **First Name** = `"test"`, **Last Name** = empty.
This would break downstream address printing on customs forms / waybills. Add at minimum: min-length, required-Last-Name, and a pattern that requires at least one space for addresses, or use a structured address (street / city / country).

### 🟠 "Edit" button is confusing
The inputs look editable already (borders, white background) — there's no disabled state. Clicking Edit doesn't visibly change anything. Either: (a) render inputs as read-only text by default and flip to editable on Edit, or (b) remove the Edit button and add a persistent Save button that's disabled until changes exist.

### 🟡 No required-field indicators
Zod likely handles it on submit, but users can't tell Last Name is required until they try.

---

## 7. `/invoices`

### ✅ Clean empty state
"No invoices yet / Your invoices will appear here once shipments are created" — good copy.

### 🟢 Same title-alignment inconsistency as Ship or Hold
Heading left, illustration centered.

---

## 8. Cross-cutting / accessibility

- 🟡 No "Skip to main content" link detected.
- 🟡 Sidebar navigation uses yellow highlight for active state — contrast is fine, but the marker could double as an `aria-current="page"` for SR users; verify.
- 🟡 The yellow accent bar under the marketing header is purely decorative but appears on every route — confirm it has `aria-hidden`.
- 🟢 Hero "Welcome To CargoLink Barbados" is a great H1 on `/`, but authenticated pages need an obvious H1 too (currently some rely on CSS weight).

---

## 9. What's working well

- No JavaScript console errors on landing, rates, dashboard, customer info, invoices.
- Auth session persists across hard refreshes and deep links.
- Skybox Air/Sea addresses are prominently shown with Copy buttons — excellent for the core use case.
- Rate calculator layout is clean and scannable.
- Empty states have both an icon and a next-step explanation (good).
- Warning banner about Thursday noon Miami cutoff is a nice at-a-glance reminder.
- The 6-step "How It Works" copy is clear and converts-oriented (Sign Up → US Address → Shop → Receive → Clear → Collect).

---

## 10. Prioritized fix list

| # | Sev | Area | Fix |
|---|---|---|---|
| 1 | 🔴 | Landing | Fix scroll-reveal so sections never stay at `opacity:0`. Default to visible, enhance with animation. |
| 2 | 🔴 | Customer Info | Add validation on Address / Last Name / First Name (min-length, required, format). |
| 3 | 🟠 | Landing | Remove the dead whitespace gaps caused by invisible sections. |
| 4 | 🟠 | Dashboard | Use first name (not email prefix) in "Welcome back" greeting. |
| 5 | 🟠 | Customer Info | Fix Edit/Save state — inputs shouldn't look editable in read mode. |
| 6 | 🟡 | Global | Resolve "Logout" vs "Sign Out" duplication. |
| 7 | 🟡 | Global | Per-route `<title>` tags. |
| 8 | 🟡 | Landing | Label or remove the floating PDF icon. |
| 9 | 🟡 | Landing | Add mobile hamburger below ~768px. |
| 10 | 🟡 | Landing | Raise contrast on yellow hero subhead + faint section headings. |
| 11 | 🟡 | Dashboard | Larger, non-cropped sidebar logo. |
| 12 | 🟡 | Rates | Rename "Cost Per (LB/USD)" to something plainer. |
| 13 | 🟢 | A11y | Skip-link, `aria-current`, Copy-button aria-labels, verify `aria-hidden` on decorative bar. |

---

## Not tested (require more access or setup)

- Registration / email confirm flow (already signed in)
- Login error states (`UserNotConfirmedException`, `FORCE_CHANGE_PASSWORD` new-password step)
- Forgot password (noted as "Not Yet Built" in `CLAUDE.md`)
- Admin routes: customer management, shipment CRUD, warehouse receipt OCR, admin invoices
- SES email deliverability
- Responsive behavior on a real mobile device (emulated window resize only)
- Full screen-reader / keyboard-only pass
- Create-shipment form validation ("+ New Shipment" button on dashboard)

If you want me to cover any of those, give me the relevant credentials or enable a test account and I'll extend the audit.
