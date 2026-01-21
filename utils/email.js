const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',  // Explicitly state Google's server
    port: 465,               // Use Secure SSL port (Prevents timeouts)
    secure: true,            // Must be true for port 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        // Helps prevent handshake errors in cloud environments
        rejectUnauthorized: false 
    }
});

const sendEmail = async (to, subject, text) => {
    try {
        const info = await transporter.sendMail({
            from: `"RideRevenue Security" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text
        });
        console.log(`✅ Email sent to ${to}. ID: ${info.messageId}`);
    } catch (err) {
        console.error("❌ Email failed:", err);
        // We throw the error so the controller knows it failed
        throw err; 
    }
};

module.exports = { sendEmail };