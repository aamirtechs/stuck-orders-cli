# Changelog

## 1.0.0

- Initial release.
- Groups Shopify line item rows into orders.
- Detects paid but unfulfilled aging orders, partial fulfilments with leftover items, fulfilled orders with no tracking, and on hold orders aging past the threshold.
- Configurable threshold in days, preorder exclusions, and a deterministic now override for tests and scheduled runs.
- Writes exceptions.csv sorted by age times order value, plus a summary report.md.
