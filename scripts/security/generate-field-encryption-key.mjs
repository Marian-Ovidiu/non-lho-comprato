#!/usr/bin/env node

import { randomBytes } from "node:crypto";

const key = randomBytes(32).toString("base64");
const dateId = new Date().toISOString().slice(0, 10);

console.log(`APP_FIELD_ENCRYPTION_KEY_ID=${dateId}`);
console.log(`APP_FIELD_ENCRYPTION_KEY=${key}`);
