import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const sender = { email: "no-reply@octa-investment.com", name: "Octa Invest" }; // Adjust as needed

export const sendEmail = async (subject, htmlContent, toEmail, toName) => {
    if (!process.env.BREVO_API_KEY) {
        console.log("⚠️ No BREVO_API_KEY found, skipping email.");
        console.log(`[Mock Email] To: ${toEmail}, Subject: ${subject}`);
        return;
    }

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = sender;
    sendSmtpEmail.to = [{ email: toEmail, name: toName }];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully:', data);
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export const mailAdmins = async (subject, message) => {
    // Hardcoded admin email for now or env
    const adminEmail = process.env.ADMIN_EMAIL || "admin@octa-investment.com"; 
    await sendEmail(subject, `<p>${message}</p>`, adminEmail, "Admin");
};
