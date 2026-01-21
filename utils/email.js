const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,              // Switch to STARTTLS port
    secure: false,          // Must be false for port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // CRITICAL FIXES FOR CLOUD TIMEOUTS:
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds max wait
    greetingTimeout: 5000,    // 5 seconds max greeting
    socketTimeout: 10000      // 10 seconds max socket idle
});

const sendEmail = async (to, subject, text) => {
    try {
        console.log(`⏳ Attempting to send email to ${to}...`);
        const info = await transporter.sendMail({
            from: `"RideRevenue Security" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text
        });
        console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    } catch (err) {
        console.error("❌ Email failed:", err);
        throw err; 
    }
};

module.exports = { sendEmail };