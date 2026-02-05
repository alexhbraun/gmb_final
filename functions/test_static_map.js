
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

// Mimic the exact logic from app.ts
const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
const businessLocation = { lat: -23.550520, lng: -46.633308 }; // Sample Sao Paulo
const staticMapsKey = process.env.GOOGLE_STATIC_MAPS_KEY || process.env.GOOGLE_PLACES_KEY;

// Original size: 1000x500 is technically allowed for Premium Plan, but Standard is 640x640.
// Let's test the EXACT URL causing issues in the app vs the "safe" one.

const safeUrl = `${baseUrl}?center=${businessLocation.lat},${businessLocation.lng}&zoom=15&size=600x300&scale=2&maptype=roadmap&markers=color:blue|label:B|${businessLocation.lat},${businessLocation.lng}&key=${staticMapsKey}`;

console.log('Testing Key:', staticMapsKey ? 'PRESENT' : 'MISSING');
console.log('Testing URL:', safeUrl);

async function testMap() {
    try {
        const response = await axios.get(safeUrl, { responseType: 'arraybuffer' });
        console.log('✅ SUCCESS! Map fetched. Size:', response.data.length);
        fs.writeFileSync('debug_map_safe.png', response.data);
    } catch (error) {
        console.error('❌ FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data.toString());
        } else {
            console.error('Error:', error.message);
        }
    }
}

testMap();
