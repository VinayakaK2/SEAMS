const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const newPassword = 'xsmtpsib-4ee60ca0e013980f55b2c8bbb628c90abf49111894b51a617909456e59f503bb-J1uEzfQTNHy19Tei';

try {
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Replace the password line
    // Regex looks for SMTP_PASSWORD= followed by anything until end of line
    const updatedContent = envContent.replace(/SMTP_PASSWORD=.*/g, `SMTP_PASSWORD=${newPassword}`);

    fs.writeFileSync(envPath, updatedContent);
    console.log('Successfully updated SMTP_PASSWORD in .env');

} catch (error) {
    console.error('Error updating .env:', error);
}
