const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/agent/token', { userId: 'test' });
    console.log('SUCCESS:', res.data);
  } catch (e) {
    console.error('FAILED:', e.response ? e.response.data : e.message);
  }
}
test();
