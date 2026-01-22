const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'in-v3.mailjet.com',
    port: 587,
    secure: false, // use true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // Your Mailjet API Key
        pass: process.env.EMAIL_PASS  // Your Mailjet Secret Key
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendEmail = async (to, subject, text) => {
    try {
        console.log(`⏳ Sending email to ${to} via Mailjet...`);
        const info = await transporter.sendMail({
            from: `"RideRevenue" <sp24-bse-069@cuilahore.edu.pk>`, // Must match Mailjet verified sender
            to,
            subject,
            text
        });
        console.log(`✅ Email sent: ${info.messageId}`);
    } catch (err) {
        console.error("❌ Email Failed:", err);
        throw err;
    }
};

module.exports = { sendEmail };