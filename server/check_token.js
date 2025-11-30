const jwt = require('jsonwebtoken');

// Get token from command line argument
const token = process.argv[2];

if (!token) {
    console.log('Usage: node check_token.js <your_token>');
    process.exit(1);
}

try {
    const decoded = jwt.decode(token);
    console.log('\n=== Token Payload ===');
    console.log(JSON.stringify(decoded, null, 2));
    console.log('\n=== User ID Field ===');
    console.log('_id:', decoded._id);
    console.log('id:', decoded.id);
    console.log('\n=== Has correct _id? ===', decoded._id ? '✅ YES' : '❌ NO');
} catch (error) {
    console.error('Error decoding token:', error.message);
}
