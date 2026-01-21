const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS  // The 16-char App Password
    }
});

const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: `"RideRevenue Security" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text
        });
        console.log(`📧 Email sent to ${to}`);
    } catch (err) {
        console.error("❌ Email failed:", err);
    }
};

module.exports = { sendEmail };