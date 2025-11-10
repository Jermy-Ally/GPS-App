const fs = require('fs');
const path = require('path');

console.log('🔍 Checking GPS Navigation App setup...\n');

let allGood = true;

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 16) {
  console.log('❌ Node.js version must be 16 or higher. Current:', nodeVersion);
  allGood = false;
} else {
  console.log('✅ Node.js version:', nodeVersion);
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('⚠️  Backend node_modules not found. Run: npm install');
  allGood = false;
} else {
  console.log('✅ Backend dependencies installed');
}

if (!fs.existsSync('web-app/node_modules')) {
  console.log('⚠️  Web app node_modules not found. Run: npm run install-all');
  allGood = false;
} else {
  console.log('✅ Web app dependencies installed');
}

// Check for Mapbox token
const envPath = path.join('web-app', '.env');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found in web-app folder');
  console.log('   Create it with: VITE_MAPBOX_TOKEN=your_token_here');
  allGood = false;
} else {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('YOUR_MAPBOX_TOKEN') || envContent.includes('your_mapbox_token_here')) {
    console.log('⚠️  Mapbox token not configured in .env file');
    console.log('   Get your token at: https://account.mapbox.com/access-tokens/');
    allGood = false;
  } else if (envContent.includes('VITE_MAPBOX_TOKEN=')) {
    console.log('✅ Mapbox token configured');
  } else {
    console.log('⚠️  .env file exists but may not have VITE_MAPBOX_TOKEN');
    allGood = false;
  }
}

// Check data directory
const dataDir = path.join('data');
if (!fs.existsSync(dataDir)) {
  console.log('ℹ️  Data directory will be created automatically when server starts');
} else {
  console.log('✅ Data directory exists');
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ Setup looks good! You can run: npm run dev');
} else {
  console.log('⚠️  Please fix the issues above before starting the app');
}
console.log('='.repeat(50));


