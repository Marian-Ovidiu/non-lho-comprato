#!/usr/bin/env node

const envName = process.argv[2] || 'DATABASE_URL';
const rawValue = process.env[envName];

if (!rawValue) {
  console.error(`${envName} is not set.`);
  process.exit(1);
}

let url;
try {
  url = new URL(rawValue);
} catch {
  console.error(`${envName} is not a valid URL.`);
  process.exit(1);
}

if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
  console.error(`${envName} must be a PostgreSQL URL.`);
  process.exit(1);
}

console.log(`host: ${url.hostname}`);
console.log(`port: ${url.port || '(default)'}`);
console.log(`database: ${url.pathname.replace(/^\//, '') || '(none)'}`);
console.log(`user: ${decodeURIComponent(url.username || '') || '(none)'}`);
