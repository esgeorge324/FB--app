import { mkdirSync, readFileSync } from 'node:fs';
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
// not inside a headless cloud sandbox or container.
//
// If REMOTE_SERVER_URL and APP_ACCESS_TOKEN are set (e.g. because you're
// running the app on a VPS via Docker, per README "Version 2"), this also
// pushes the captured session to that server's /api/fb-session endpoint,
// so the headless remote server can use it without ever needing a display
// or your Facebook password itself.
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

  const remoteUrl = process.env.REMOTE_SERVER_URL;
  const accessToken = process.env.APP_ACCESS_TOKEN;
  if (remoteUrl && accessToken) {
    console.log(`\nPushing session to ${remoteUrl}/api/fb-session ...`);
    const storageState = JSON.parse(readFileSync(config.fb.storageStatePath, 'utf-8'));
    const res = await fetch(`${remoteUrl.replace(/\/$/, '')}/api/fb-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(storageState),
    });
    if (res.ok) {
      console.log('Remote session updated.');
    } else {
      console.error(`Failed to push session to remote server (${res.status}): ${await res.text()}`);
    }
  } else if (remoteUrl || accessToken) {
    console.log(
      '\nSkipping remote push: set both REMOTE_SERVER_URL and APP_ACCESS_TOKEN to push this session to a hosted server.'
    );
  }
}

main().catch((err) => {
  console.error('Login capture failed:', err);
  process.exit(1);
});
