const Mailjet = require('node-mailjet');
require('dotenv').config();

// Connect using API Keys (stored in Render Env Variables)
const mailjet = Mailjet.apiConnect(
    process.env.EMAIL_USER, // Your API Key
    process.env.EMAIL_PASS  // Your Secret Key
);

const sendEmail = async (to, subject, text) => {
    try {
        console.log(`⏳ Sending email via API to ${to}...`);

        // IMPORTANT: The "From" email MUST be verified in your Mailjet account
        const senderEmail = "asad.shafiq411@gmail.com"; 

        const request = await mailjet
            .post("send", { 'version': 'v3.1' })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": senderEmail,
                            "Name": "Asad from RideRevenue Tracker"
                        },
                        "To": [
                            {
                                "Email": to,
                                "Name": "User"
                            }
                        ],
                        "Subject": subject,
                        "TextPart": text,
                        "HTMLPart": `<p>${text}</p>`
                    }
                ]
            });

        console.log(`✅ Email sent! Status: ${request.response.status}`);
    } catch (err) {
        console.error("❌ Email Failed:", err.statusCode, err.message);
        throw new Error("Email sending failed");
    }
};

module.exports = { sendEmail };