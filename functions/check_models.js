const axios = require('axios');
// Using the key from the error logs/env
const key = process.env.GEMINI_API_KEY || 'AIzaSyAtRFS9M4hjnGP2A2bEFIwkmBgLhcVC7c4'; 

console.log('Fetching models...');
axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(res => {
    const models = res.data.models || [];
    console.log('Available models:');
    models.forEach(m => console.log(`- ${m.name}: ${m.displayName}`));
  })
  .catch(err => {
    console.error('Error fetching models:');
    if (err.response) {
        console.error(JSON.stringify(err.response.data, null, 2));
    } else {
        console.error(err.message);
    }
  });
