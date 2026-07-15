import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const run = command => execSync(command, { cwd: root, stdio: 'inherit' });

console.log('1. Building the mobile web application...');
run('npx vite build');

if (process.platform === 'darwin') {
  console.log('2. Synchronizing Capacitor and CocoaPods...');
  if (!existsSync(resolve(root, 'ios', 'App', 'Podfile'))) run('npx cap add ios --packagemanager CocoaPods');
  run('npx cap sync ios');
  console.log('\nReady for Xcode: npx cap open ios');
} else {
  const iosProject = resolve(root, 'ios');
  if (existsSync(iosProject)) {
    console.log('2. Copying web assets into the local iOS project...');
    run('npx cap copy ios');
  } else {
    console.log('2. No local iOS project found; the GitHub macOS workflow will generate it.');
  }
  console.log('\nWindows preparation complete. CocoaPods and IPA compilation run on the GitHub macOS workflow.');
}
