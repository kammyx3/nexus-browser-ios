/**
 * Build script for Nexus Browser iOS
 *
 * Prerequisites:
 *   1. macOS with Xcode 15+
 *   2. Node.js 18+
 *   3. CocoaPods (`sudo gem install cocoapods`)
 *
 * Steps:
 *   npm run build:ios    # Build web app + sync Capacitor
 *   npx cap open ios     # Open in Xcode
 *   # In Xcode: set signing team, build to device
 */

console.log('1. Building web assets...');
require('child_process').execSync('npx vite build', { stdio: 'inherit', cwd: __dirname + '/..' });

console.log('2. Syncing Capacitor...');
require('child_process').execSync('npx cap sync', { stdio: 'inherit', cwd: __dirname + '/..' });

console.log('\n✓ Done! Open the project in Xcode:');
console.log('  cd nexus-ios');
console.log('  npx cap open ios');
console.log('\nThen select your team under Signing & Capabilities and build to your device.');
