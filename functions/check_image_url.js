
const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:5099/gmb-audit-generator/us-central1/api';

async function diagnose() {
    console.log('--- DIAGNOSIS START ---');
    
    // 1. Check Env
    const key = process.env.GOOGLE_STATIC_MAPS_KEY || process.env.GOOGLE_PLACES_KEY;
    console.log('1. API Key Present:', !!key);
    if (key) console.log('   Key Length:', key.length);

    try {
        // 2. Check History
        console.log('2. checking History...');
        let reportId;
        
        const histRes = await axios.get(`${API_BASE}/history`);
        const reports = histRes.data;
        
        if (!reports || reports.length === 0) {
            console.log('⚠ No reports found. Generating one now...');
            try {
                const genRes = await axios.post(`${API_BASE}/generate`, {
                    url: 'https://www.google.com/maps/place/Googleplex/@37.4220656,-122.0840897,17z',
                    language: 'en'
                });
                console.log('   Generation triggered. Status:', genRes.status);
                if (genRes.data.reportId) {
                    reportId = genRes.data.reportId;
                    console.log('   Generated Report ID:', reportId);
                } else {
                    console.error('❌ Generation returned no reportId');
                    return;
                }
            } catch (genErr) {
                console.error('❌ Generation Failed:', genErr.message);
                if (genErr.response) console.error('   Data:', genErr.response.data);
                return;
            }
        } else {
            reportId = reports[0].reportId;
            console.log('   Latest Report ID from history:', reportId);
        }

        // 3. Test Report
        await testReport(reportId);

    } catch (err) {
        console.error('❌ Diagnostics Crashing Error:', err.message);
        if (err.response) console.error('   Response Data:', err.response.data);
    }
    console.log('--- DIAGNOSIS END ---');
}

async function testReport(reportId) {
    if (!reportId) return;
    
    // 3. Get Report JSON
    console.log(`3. Fetching Report JSON for ${reportId}...`);
    try {
        const repRes = await axios.get(`${API_BASE}/report?id=${reportId}`);
        const report = repRes.data;
        
        console.log('   Report Fetched.');
        console.log('   visibilityImageUrl:', report.visibilityImageUrl);
        
        if (!report.visibilityImageUrl) {
            console.error('❌ visibilityImageUrl is MISSING or null.');
            return;
        }

        // 4. Test Image URL
        console.log(`4. Testing Image URL: ${report.visibilityImageUrl} ...`);
        try {
            const imgRes = await axios.get(report.visibilityImageUrl, { responseType: 'arraybuffer' });
            console.log('✅ Image Fetch Success!');
            console.log('   Status:', imgRes.status);
            console.log('   Content-Type:', imgRes.headers['content-type']);
            console.log('   Size:', imgRes.data.length, 'bytes');
        } catch (imgErr) {
            console.error('❌ Image Fetch FAILED');
            if (imgErr.response) {
                console.error('   Status:', imgErr.response.status);
                // console.error('   Data:', imgErr.response.data.toString());
            } else {
                console.error('   Error:', imgErr.message);
            }
        }
    } catch (err) {
        console.error('❌ Failed to fetch report details:', err.message);
    }
}

diagnose();
