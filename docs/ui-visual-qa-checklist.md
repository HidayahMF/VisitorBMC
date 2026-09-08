# VisitorBMC Visual QA Checklist

Run this checklist in a browser after starting the frontend and backend test environment.

## Viewports

- [ ] 360px: no critical horizontal overflow; actions remain reachable.
- [ ] 768px: filters and action groups wrap without overlap.
- [ ] 1366px: desktop navbar is single-line and balanced.
- [ ] 1920px: content remains readable and does not stretch excessively.

## Bilingual Review

- [ ] EN switcher changes navigation, dashboard labels, statuses, actions, states, and dates to English.
- [ ] ID switcher changes navigation, dashboard labels, statuses, actions, states, and dates to Indonesian.
- [ ] Selected language survives a full page reload.
- [ ] EN/ID utility remains compact and does not wrap at 1366px.
- [ ] Longer Indonesian labels remain readable at 360px and 768px.

## Navigation And Account

- [ ] Dashboard shows the approved BMC composition.
- [ ] Primary navigation contains Dasbor, Perusahaan, Pengunjung, Kunjungan, and Di Dalam.
- [ ] Administrasi dropdown contains only role-allowed items.
- [ ] Administrasi parent is active on each admin child route.
- [ ] Long account names truncate with a useful title tooltip.
- [ ] Account dropdown opens from a button and closes on Escape/click outside.
- [ ] Mobile menu groups Utama, Administrasi, and account actions clearly.

## Security Dashboard

- [ ] Visitors Today, Currently Inside, Checked Out Today, and Induction Required all use people/visitor units.
- [ ] Loading dashboard state is distinct from real zero counts.
- [ ] Today's Activity shows recent real visits and opens Visit Detail.
- [ ] Requires Attention shows only actionable induction work.
- [ ] Calm empty attention state appears when no action is required.
- [ ] Quick Actions prioritize New Visit, Currently Inside, and Visit History.
- [ ] Dashboard labels and dates are correct in both EN and ID.

## Operational Pages

- [ ] Visitors table is readable on desktop and cards are usable on mobile.
- [ ] Companies table is readable on desktop and cards are usable on mobile.
- [ ] Visits table is readable on desktop and cards are usable on mobile.
- [ ] Currently Inside shows visitor, company, host, check-in time, and action.
- [ ] Visit Detail visitor records stack cleanly on mobile.
- [ ] Visitor Detail metadata and visit history wrap cleanly.
- [ ] Visitor and visit history preserve chronology and important fields.

## Admin Pages

- [ ] Reports tabs, filters, cards/tables, and pagination align consistently.
- [ ] Audit Log filters and mobile records remain readable.
- [ ] User Management autocomplete and role/access actions are usable at 360px.
- [ ] Safety Configuration form does not overflow at 360px.
- [ ] Safety Content upload and content actions wrap without clipping.

## Dialog And Keyboard

- [ ] ConfirmDialog receives focus when opened.
- [ ] Tab cycles only between dialog controls.
- [ ] Shift+Tab cycles only between dialog controls.
- [ ] Escape closes the dialog.
- [ ] Focus returns to the triggering action after close.
- [ ] Visible focus rings remain clear on navigation, forms, cards, and actions.

## Visitor Badge (CR80 Identity Card)

- [ ] Badge preview keeps the CR80 identity-card ratio at 1366px, 1920px, 768px, and 360px.
- [ ] Badge is not stretched to fill an A4 sheet in the screen preview.
- [ ] The existing BMC logo asset is visible in the badge header.
- [ ] Visitor name is the dominant printed field and is limited to two lines.
- [ ] Visitor code, company, host, date, and visit code remain readable.
- [ ] Long visitor/company/host values do not overflow the physical badge.
- [ ] Print preview contains only the badge, not navbar, page controls, or action buttons.
- [ ] Badge uses a solid BMC blue header and retains print colors where supported.
- [ ] EN badge labels are correct after switching language.
- [ ] ID badge labels are correct after switching language.

## States

- [ ] Loading states are visible and do not allow duplicate actions.
- [ ] Empty states are distinct from request errors.
- [ ] Retry controls are visible for recoverable errors.
- [ ] Status badges include readable text and are not color-only.
- [ ] Connection banner appears only when health checks fail.
