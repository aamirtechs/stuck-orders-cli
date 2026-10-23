# Good First Issues

These are seeded starter issues for new contributors. Each one is scoped, self contained, and covered by the existing test style.

## 1. WooCommerce orders CSV mapping

WooCommerce exports use different column names for order id, line items, status, and totals than Shopify does. Add a mapping layer that detects a WooCommerce export, normalises its rows into the internal order shape, and proves the same four exception checks run on it. Start in src/detect.js where columns are resolved, and add a small synthetic WooCommerce fixture under examples/ plus tests for the mapping.

## 2. Configurable aging thresholds per fulfilment status

Today one days threshold applies to every exception type. Let the config set a different threshold for unfulfilled, partial, and on hold orders, falling back to the shared default when a type is not specified. Update the CLI help, the summary report, and tests that cover the fallback behaviour.

## 3. Daily digest Markdown output for Slack or email paste

The summary report is written for a file reader. Add an optional compact digest format with the counts, the top five oldest exceptions, and plain text that pastes cleanly into Slack or an email. Keep it dependency free, reuse the existing exception list, and add tests that pin the digest layout.
