const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    let transporter;

    try {
        if (process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
            // Use configured SMTP
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_PORT == '465', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_EMAIL,
                    pass: process.env.SMTP_PASSWORD,
                },
                tls: {
                    rejectUnauthorized: false // Accept self-signed certificates
                }
            });
            console.log('Using configured SMTP server:', process.env.SMTP_HOST);
        } else {
            // No SMTP configured - use Ethereal for testing
            console.log('⚠️  SMTP not configured. Using Ethereal test account...');
            try {
                const testAccount = await nodemailer.createTestAccount();
                transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
                console.log('✅ Ethereal test account created successfully.');
            } catch (etherealError) {
                console.error('❌ Failed to create Ethereal account:', etherealError.message);
                console.log('📧 Email will not be sent. Check console for verification links.');
                // Do not throw, just return. The controller has already logged the link.
                return;
            }
        }

        if (!transporter) {
            console.log('No transporter available. Email not sent (Console log only).');
            return;
        }

        const message = {
            from: `${process.env.FROM_NAME || 'SEAMS Support'} <${process.env.FROM_EMAIL || 'noreply@seams.com'}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html
        };

        const info = await transporter.sendMail(message);

        console.log('Message sent: %s', info.messageId);
        if (!process.env.SMTP_HOST) {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
    } catch (error) {
        console.error('Error in sendEmail:', error.message);
        // Do NOT throw error here. Just log it.
        // This ensures the controller continues and returns 200 OK.
        console.log('Email sending failed, but continuing flow (Link is in console).');
    }
};

module.exports = sendEmail;
