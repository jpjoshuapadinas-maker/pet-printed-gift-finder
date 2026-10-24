# Gift Finder budget-band review — 2026-10-24

Status: **Review branch only. Not deployed. Not ready for joint testing.**

## Source snapshot
- Google Sheet: `Pet Printed | Gift Finder Catalog`, tab `Gift Finder Catalog`, 527 product rows.
- Eligibility: 145 TRUE, 382 FALSE; 527 available flags TRUE as recorded in the sheet. These flags are point-in-time, not live Shopify inventory guarantees.
- Code under test: `index.html` blob SHA `3e6694ed68cad190b7e926b68838278179ee86d7` on `review/budget-bands-2026-10-22`.
- Default branch `main` remains unchanged.

## Offline simulated-DOM regression
Executed the actual review-branch inline JavaScript with a minimal mocked DOM, mocked catalog fetch response assembled from the sheet, and mocked browser URL/session APIs. Covered all 320 combinations (4 recipients × 5 pet selections × 4 occasions × 4 budgets), including repeated `More gift options` clicks.

- 0 empty first-page scenarios.
- 0 repeated product URLs across initial and expanded recommendation cards.
- 0 unapproved/unavailable product cards.
- 0 scenarios mixing below-band products with in-band first-page picks.
- 0 malformed above-budget dollar-difference labels.
- 0 execution errors in the simulated environment.
- Missing `eligible` and missing `available` flags each excluded a previously approved product in separate negative tests.

## Important limits and release gates
- **Not a real browser test**: the DOM, fetch, location, history and session storage were simulated. Responsive layout, user interactions in an actual browser, CORS, image loading, link navigation, accessibility and network failures are not verified.
- **Not a live API test**: the deployed Apps Script catalog endpoint could not be accessed from the available test environment. The simulated response may differ from the actual API schema and live values.
- Do not merge/deploy or announce ready for joint testing until the deployed endpoint is verified and full end-to-end browser testing passes, including in-band, below-band and above-budget cases.
- Catalog approvals must remain evidence-based. Do not promote pending products without product-specific proof; preserve `Audit Changes` and existing backup tabs. Revalidate inventory and variant prices at the storefront before launch.
