
try {
  console.log('Attempting to require ./lib/index.js...');
  const index = require('./lib/index.js');
  console.log('Successfully required index.');
  require('dotenv').config();
  console.log('Env Check:', { 
    PLACES_KEY: !!process.env.GOOGLE_PLACES_KEY, 
    STATIC_KEY: !!process.env.GOOGLE_STATIC_MAPS_KEY 
  });
  console.log('Exports:', Object.keys(index));
} catch (error) {
  console.error('Failed to load index.js:', error);
}
