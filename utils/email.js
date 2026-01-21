const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail', // Built-in configuration for Gmail
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // CRITICAL FIX: Force IPv4. Render/Cloud often hangs on IPv6 lookups.
    family: 4, 
});

const sendEmail = async (to, subject, text) => {
    try {
        console.log(`⏳ Sending email to ${to}...`);
        
        const info = await transporter.sendMail({
            from: `"RideRevenue Security" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text
        });

        console.log(`✅ Email sent! ID: ${info.messageId}`);
    } catch (err) {
        console.error("❌ Email failed:", err.message);
        throw err; // Stop execution so frontend knows it failed
    }
};

module.exports = { sendEmail };