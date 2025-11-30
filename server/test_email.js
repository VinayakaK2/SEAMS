const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const testEmail = async () => {
    console.log('=== Testing Email Configuration ===\n');
    console.log('SMTP Settings:');
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);
    console.log('Email:', process.env.SMTP_EMAIL);
    console.log('Password:', process.env.SMTP_PASSWORD ? '***configured***' : 'NOT SET');
    console.log('\n');

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully!\n');

        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: process.env.SMTP_EMAIL, // Send to yourself
            subject: 'Test Email from SEAMS',
            text: 'This is a test email to verify SMTP configuration.',
            html: '<b>This is a test email to verify SMTP configuration.</b>'
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        if (error.command) console.error('Command:', error.command);
    }
};

testEmail();
