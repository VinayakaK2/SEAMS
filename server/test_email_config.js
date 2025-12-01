const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const testEmail = async () => {
    console.log('Testing SMTP Configuration...');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('User:', process.env.SMTP_EMAIL);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Verify connection configuration
        await transporter.verify();
        console.log('✅ Server is ready to take our messages');

        // Send test email
        const info = await transporter.sendMail({
            from: `"SEAMS Test" <${process.env.SMTP_EMAIL}>`,
            to: process.env.SMTP_EMAIL, // Send to self
            subject: "SEAMS SMTP Test",
            text: "If you receive this, your SMTP configuration is working correctly!",
        });

        console.log("✅ Message sent: %s", info.messageId);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('❌ SMTP Response:', error.response);
        }
    }
};

testEmail();
