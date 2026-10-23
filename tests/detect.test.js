'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, toCsv } = require('../src/csv');
const { groupOrders, detect, summaryMarkdown } = require('../src/detect');

const NOW = '2026-10-20T00:00:00Z';

function row(overrides) {
  return {
    Name: '#1', 'Created at': '2026-10-01 09:00:00', 'Financial Status': 'paid',
    'Fulfillment Status': 'unfulfilled', Total: '100.00', Tags: '', Note: '',
    'Lineitem name': 'Widget', 'Lineitem quantity': '2',
    'Lineitem fulfillment status': 'unfulfilled', 'Fulfillment Tracking Number': '',
    ...overrides,
  };
}

test('parseCsv handles quoted commas and escaped quotes', () => {
  const rows = parseCsv('Name,Note\n#1,"hello, ""world"""\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Note, 'hello, "world"');
});

test('toCsv escapes values that need quoting', () => {
  assert.match(toCsv(['a'], [{ a: 'x,y' }]), /"x,y"/);
});

test('groupOrders groups line items and sums unfulfilled quantity', () => {
  const orders = groupOrders([
    row({}),
    row({ 'Lineitem name': 'Case', 'Lineitem quantity': '1', 'Lineitem fulfillment status': 'fulfilled' }),
  ]);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].totalQuantity, 3);
  assert.equal(orders[0].unfulfilledQuantity, 2);
});

test('paid unfulfilled order older than threshold is flagged', () => {
  const { exceptions } = detect([row({})], { now: NOW, days: 3 });
  assert.equal(exceptions.length, 1);
  assert.equal(exceptions[0].exception_type, 'paid_unfulfilled_aging');
  assert.equal(exceptions[0].age_days, 18);
});

test('paid unfulfilled order inside threshold is not flagged', () => {
  const { exceptions } = detect([row({ 'Created at': '2026-10-19 09:00:00' })], { now: NOW, days: 3 });
  assert.equal(exceptions.length, 0);
});

test('unpaid order is not flagged as paid unfulfilled', () => {
  const { exceptions } = detect([row({ 'Financial Status': 'pending' })], { now: NOW });
  assert.equal(exceptions.length, 0);
});

test('partial fulfilment with leftover quantity is flagged', () => {
  const rows = [
    row({ 'Fulfillment Status': 'partial', 'Lineitem fulfillment status': 'fulfilled', 'Lineitem quantity': '2' }),
    row({ 'Fulfillment Status': 'partial', 'Lineitem name': 'Case', 'Lineitem quantity': '1' }),
  ];
  const { exceptions } = detect(rows, { now: NOW });
  assert.equal(exceptions.length, 1);
  assert.equal(exceptions[0].exception_type, 'partial_fulfilled_leftover');
  assert.match(exceptions[0].detail, /1 item/);
});

test('fulfilled order with empty tracking is flagged regardless of age', () => {
  const { exceptions } = detect([row({
    'Created at': '2026-10-19 09:00:00', 'Fulfillment Status': 'fulfilled',
    'Lineitem fulfillment status': 'fulfilled',
  })], { now: NOW });
  assert.equal(exceptions.length, 1);
  assert.equal(exceptions[0].exception_type, 'fulfilled_no_tracking');
});

test('fulfilled order with tracking is clean', () => {
  const { exceptions } = detect([row({
    'Fulfillment Status': 'fulfilled', 'Lineitem fulfillment status': 'fulfilled',
    'Fulfillment Tracking Number': '9400100000000000000000',
  })], { now: NOW });
  assert.equal(exceptions.length, 0);
});

test('on hold order by tag older than threshold is flagged once', () => {
  const { exceptions } = detect([row({ Tags: 'on-hold, vip' })], { now: NOW });
  assert.equal(exceptions.length, 1);
  assert.equal(exceptions[0].exception_type, 'on_hold_aging');
});

test('on hold order by fulfilment status is flagged', () => {
  const { exceptions } = detect([row({ 'Fulfillment Status': 'on_hold' })], { now: NOW });
  assert.equal(exceptions[0].exception_type, 'on_hold_aging');
});

test('preorder by tag is excluded', () => {
  const { exceptions } = detect([row({ Tags: 'preorder' })], { now: NOW });
  assert.equal(exceptions.length, 0);
});

test('preorder by note keyword from config is excluded', () => {
  const { exceptions } = detect([row({ Note: 'Ships later, backorder batch' })], { now: NOW, preorderKeywords: ['backorder'] });
  assert.equal(exceptions.length, 0);
});

test('custom days threshold is respected', () => {
  const { exceptions } = detect([row({ 'Created at': '2026-10-12 09:00:00' })], { now: NOW, days: 10 });
  assert.equal(exceptions.length, 0);
});

test('exceptions sort by age times total when a total column exists', () => {
  const rows = [
    row({ Name: '#small', Total: '10.00' }),
    row({ Name: '#big', Total: '500.00', 'Created at': '2026-10-10 09:00:00' }),
  ];
  const { exceptions } = detect(rows, { now: NOW });
  assert.equal(exceptions[0].order_id, '#big');
});

test('summary markdown reports counts per type', () => {
  const result = detect([row({})], { now: NOW });
  const md = summaryMarkdown(result, 'orders.csv');
  assert.match(md, /paid_unfulfilled_aging: 1/);
  assert.match(md, /Orders scanned: 1/);
});
