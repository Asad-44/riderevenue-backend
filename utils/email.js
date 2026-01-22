const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'in-v3.mailjet.com',
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER, // Your Mailjet API Key
        pass: process.env.EMAIL_PASS  // Your Mailjet Secret Key
    },
    // CRITICAL NETWORK FIXES:
    family: 4,                // Forces IPv4 (Fixes the Timeout)
    connectionTimeout: 10000, // Wait max 10 seconds
    greetingTimeout: 5000,    // Wait max 5 seconds for server hello
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
});

const sendEmail = async (to, subject, text) => {
    try {
        console.log(`⏳ Sending email to ${to} via Mailjet...`);
        
        // IMPORTANT: Replace the email below with the ACTUAL Gmail you verified in Mailjet
        // Do NOT use process.env.EMAIL_USER here because that is now your API Key!
        const senderEmail = "sp24-bse-069@cuilahore.edu.pk"; 

        const info = await transporter.sendMail({
            from: `"RideRevenue Security" <${senderEmail}>`, 
            to,
            subject,
            text
        });
        console.log(`✅ Email sent: ${info.messageId}`);
    } catch (err) {
        console.error("❌ Email Failed:", err.message);
        throw err;
    }
};

module.exports = { sendEmail };