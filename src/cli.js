#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseCsv, toCsv } = require('./csv');
const { detect, summaryMarkdown } = require('./detect');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key === 'help') { args.help = true; } else { args[key] = argv[i + 1]; i += 1; }
    } else { args._.push(a); }
  }
  return args;
}

function usage() {
  return [
    'Usage: stuck-orders-cli <orders.csv> [options]',
    '',
    'Options:',
    '  --days <n>        Aging threshold in days (default 3)',
    '  --now <iso-date>  Override the current date, for deterministic runs',
    '  --config <file>   JSON config with days, now, and preorderKeywords',
    '  --out-dir <dir>   Output directory (default: current directory)',
    '  --help            Show this help',
  ].join('\n');
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help || args._.length === 0) {
    console.log(usage());
    return args._.length === 0 && !args.help ? 1 : 0;
  }
  const input = args._[0];
  let config = {};
  if (args.config) config = JSON.parse(fs.readFileSync(args.config, 'utf8'));
  const options = {
    days: args.days !== undefined ? Number(args.days) : config.days,
    now: args.now || config.now,
    preorderKeywords: config.preorderKeywords,
  };
  const rows = parseCsv(fs.readFileSync(input, 'utf8'));
  const result = detect(rows, options);
  const outDir = args['out-dir'] || '.';
  fs.mkdirSync(outDir, { recursive: true });
  const headers = ['order_id', 'exception_type', 'age_days', 'total', 'created_at', 'financial_status', 'fulfillment_status', 'priority_score', 'detail'];
  const csvRows = result.exceptions.map((e) => ({ ...e, priority_score: Number(e.priority_score.toFixed(2)) }));
  fs.writeFileSync(path.join(outDir, 'exceptions.csv'), toCsv(headers, csvRows));
  fs.writeFileSync(path.join(outDir, 'report.md'), summaryMarkdown(result, path.basename(input)));
  console.log('Orders scanned: ' + result.orders.length);
  console.log('Exceptions found: ' + result.exceptions.length);
  console.log('Wrote ' + path.join(outDir, 'exceptions.csv'));
  console.log('Wrote ' + path.join(outDir, 'report.md'));
  return 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (err) {
    console.error('Error: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, usage, main };
