const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a Pooled Transporter (Better for cloud connections)
const transporter = nodemailer.createTransport({
    pool: true,             // Use pooled connections
    maxConnections: 1,      // Limit to 1 connection to avoid spam flags
    host: "smtp.gmail.com",
    port: 465,
    secure: true,           // Use SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false, // Bypass SSL certificate issues
    },
    family: 4,    // Force IPv4
    debug: true,  // Show verbose logs
    logger: true  // Log to console
});

const sendEmail = async (to, subject, text) => {
    try {
        console.log(`⏳ Authenticating as ${process.env.EMAIL_USER}...`);
        
        // Verify connection config first
        await transporter.verify();
        console.log("✅ Server is ready to take our messages");

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER, // Must match auth user exactly
            to,
            subject,
            text
        });

        console.log(`✅ Email sent: ${info.messageId}`);
    } catch (err) {
        console.error("❌ Email Detailed Error:", err);
        throw err;
    }
};

module.exports = { sendEmail };