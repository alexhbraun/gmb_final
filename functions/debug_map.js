
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const key = process.env.GOOGLE_PLACES_KEY || ''; // In app.ts it falls back to placesKey if staticMapsKey is missing
const url = `https://maps.googleapis.com/maps/api/staticmap?center=40.7128,-74.0060&zoom=12&size=1000x500&key=${key}`;

console.log('Testing Static Maps API with key:', key ? 'Key Present' : 'Key Missing');

axios.get(url, { responseType: 'arraybuffer' })
  .then(response => {
    console.log('Success! Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    fs.writeFileSync('test_map.png', response.data);
    console.log('Saved test_map.png');
  })
  .catch(error => {
    console.error('Failure!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data.toString());
    } else {
      console.error('Error:', error.message);
    }
  });
