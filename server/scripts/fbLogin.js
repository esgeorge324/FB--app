import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import readline from 'node:readline/promises';
import { chromium } from 'playwright';
import { config } from '../src/config.js';

// One-time (or occasional, once your session expires) interactive login.
// Opens a real, visible browser window so YOU log into Facebook yourself -
// this script never sees or stores your password, only the resulting
// session cookies, saved locally to config.fb.storageStatePath.
//
// This must be run on a machine with a real display (your own laptop/desktop),
// not inside a headless cloud sandbox.
async function main() {
  mkdirSync(dirname(config.fb.storageStatePath), { recursive: true });

  console.log('Opening a browser window - please log into Facebook normally.');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://www.facebook.com/login');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('\nAfter you have finished logging in (and closed any "save browser" dialogs), press Enter here...');
  rl.close();

  await context.storageState({ path: config.fb.storageStatePath });
  console.log(`Saved session to ${config.fb.storageStatePath}`);
  console.log('You can now set MARKETPLACE_PROVIDER=facebook in server/.env to use real Marketplace data.');

  await browser.close();
}

main().catch((err) => {
  console.error('Login capture failed:', err);
  process.exit(1);
});
