/**
 * Simple test to call the mock /api/reminders endpoint and assert the shape.
 * Run this after starting nodeserver with USE_MOCK_DB=true.
 */

const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    const r = await get('http://localhost:5001/api/reminders');
    if (r.statusCode !== 200) {
      console.error('Expected 200, got', r.statusCode, r.body);
      process.exit(2);
    }
    const json = JSON.parse(r.body);
    if (!Array.isArray(json)) {
      console.error('Expected array response, got:', typeof json);
      process.exit(2);
    }
    if (json.length === 0) {
      console.error('Expected non-empty array');
      process.exit(2);
    }
    const first = json[0];
    const required = ['reminder_id','type','reminder_date','message_status','invoice_id','client_name','client_email'];
    for (const k of required) {
      if (!(k in first)) {
        console.error('Missing required key in first item:', k);
        process.exit(2);
      }
    }
    console.log('Mock endpoint test passed — response shape as expected');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
