
const axios = require('axios');
const reportId = 'vBUGkG6Y56XlC26nt9DTV'; // Use the ID I found earlier
const url = `http://localhost:5099/gmb-audit-generator/us-central1/api/report/${reportId}`;

axios.get(url)
  .then(res => {
    console.log('Report JSON Fetched.');
    console.log('Visibility Image URL:', res.data.visibilityImageUrl);
  })
  .catch(err => console.error('Error:', err.message));
