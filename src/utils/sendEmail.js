import transporter from "../configs/mailer.js";


const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"IlmHub" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent to: ${to}`);
  } catch (error) {
    console.error("Email Error:", error.message);
    throw error;
  }
};

export default sendEmail;