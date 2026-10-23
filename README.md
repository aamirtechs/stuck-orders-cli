# stuck-orders-cli
Live page: https://aamirtechs.github.io/stuck-orders-cli/

Feed a Shopify orders CSV export to this tool and get the exception queue nobody sees: paid but unfulfilled aging orders, partial fulfilments with leftover items, fulfilled orders with no tracking, and on hold orders ageing invisibly.

Most store dashboards show totals. They do not show the handful of orders quietly rotting in a corner, the ones that turn into chargebacks, WISMO tickets, and one star reviews. This tool builds that queue, offline, with no dependencies.

## Install

Requires Node.js 20 or newer. No packages to install.

```bash
git clone <this repo>
cd stuck-orders-cli
node src/cli.js --help
```

Optionally link it as a command:

```bash
npm link
stuck-orders-cli examples/orders.csv --config examples/config.example.json
```

## Usage

```bash
node src/cli.js orders.csv [--days 3] [--now 2026-10-20T00:00:00Z] [--config config.json] [--out-dir out]
```

Input is a Shopify orders CSV export with line item rows. Expected columns include Name, Created at, Financial Status, Fulfillment Status, Total, Tags, Note, Lineitem name, Lineitem quantity, Lineitem fulfillment status, and Fulfillment Tracking Number. Column matching is case insensitive and a few common aliases are accepted.

What it flags, per order, after grouping line item rows by order:

- `paid_unfulfilled_aging`: financial status is paid, fulfilment is unfulfilled, and the order is older than the threshold.
- `partial_fulfilled_leftover`: the order is partially fulfilled and at least one item quantity is still unfulfilled, aged past the threshold.
- `fulfilled_no_tracking`: the order is marked fulfilled and the tracking number is empty.
- `on_hold_aging`: an on hold tag or fulfilment status, aged past the threshold.

Preorders are excluded. An order is treated as a preorder when its tags or note contain a keyword from the config list, which defaults to preorder, pre-order, and pre order.

Outputs, written to the output directory:

- `exceptions.csv` with one row per exception, sorted by age times order value when a total column exists, and by age alone when it does not.
- `report.md`, a short summary with counts per exception type and the top exceptions.

### Config

```json
{
  "days": 3,
  "now": "2026-10-20T00:00:00Z",
  "preorderKeywords": ["preorder", "pre-order", "pre order"]
}
```

The `--days` and `--now` flags override the config. The `now` override exists so scheduled runs and tests are deterministic instead of depending on the wall clock.

## Example

Input, from `examples/orders.csv` (synthetic data, 8 orders, one is a preorder, one is too new, one is unpaid, one has tracking):

```csv
Name,Created at,Financial Status,Fulfillment Status,Total,Tags,Note,Lineitem name,Lineitem quantity,Lineitem fulfillment status,Fulfillment Tracking Number
#1001,2026-10-01 09:15:00,paid,unfulfilled,120.00,,,Blue Widget,2,unfulfilled,
#1002,2026-10-05 11:00:00,paid,partial,85.50,,,Red Gadget,3,fulfilled,
#1002,2026-10-05 11:00:00,paid,partial,85.50,,,Red Gadget Case,1,unfulfilled,
#1003,2026-10-10 14:30:00,paid,fulfilled,42.00,,,Green Cable,1,fulfilled,
#1004,2026-10-02 08:00:00,paid,unfulfilled,210.00,on-hold,Fraud review hold,Black Headphones,1,unfulfilled,
#1005,2026-09-20 10:00:00,paid,unfulfilled,300.00,preorder,Preorder item ships in November,Future Console,1,unfulfilled,
#1006,2026-10-19 16:45:00,paid,unfulfilled,55.00,,,Yellow Mug,1,unfulfilled,
#1007,2026-10-08 12:00:00,paid,fulfilled,64.00,,,White Keyboard,1,fulfilled,9400100000000000000000
#1008,2026-10-03 09:00:00,pending,unfulfilled,19.99,,,Sticker Pack,5,unfulfilled,
```

Run:

```bash
node src/cli.js examples/orders.csv --config examples/config.example.json --out-dir out
```

Real console output:

```text
Orders scanned: 8
Exceptions found: 4
Wrote out/exceptions.csv
Wrote out/report.md
```

Real `exceptions.csv` output:

```csv
order_id,exception_type,age_days,total,created_at,financial_status,fulfillment_status,priority_score,detail
#1004,on_hold_aging,17,210.00,2026-10-02 08:00:00,paid,unfulfilled,3570,"Order is on hold and is 17 days old, past the 3 day threshold."
#1001,paid_unfulfilled_aging,18,120.00,2026-10-01 09:15:00,paid,unfulfilled,2160,Paid order still unfulfilled after 18 days.
#1002,partial_fulfilled_leftover,14,85.50,2026-10-05 11:00:00,paid,partial,1197,1 item(s) still unfulfilled on a partially fulfilled order aged 14 days.
#1003,fulfilled_no_tracking,9,42.00,2026-10-10 14:30:00,paid,fulfilled,378,Order marked fulfilled with an empty tracking number.
```

Real `report.md` output:

```markdown
# Stuck Orders Summary

Source: orders.csv
Now: 2026-10-20T00:00:00.000Z
Aging threshold (days): 3
Orders scanned: 8
Exceptions found: 4

## Counts by exception type

- paid_unfulfilled_aging: 1
- partial_fulfilled_leftover: 1
- fulfilled_no_tracking: 1
- on_hold_aging: 1
```

## Tests

```bash
npm test
```

16 tests cover CSV parsing, order grouping, each exception type, preorder exclusion by tag and by note keyword, the custom threshold, sorting by age times total, and the summary report.

## Good first issues

See GFIs.md.

## License

MIT. Copyright (c) 2026 Amir Hussain.
