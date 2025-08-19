import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { buildOtpHtmlContent } from '../emailUtils/email.util';
export const sendDeleteOtpEmail = async (email: string, otp: number) => {
  const emailUsername = process.env.EMAIL_USERNAME;
  if (!emailUsername) throw new Error('EMAIL_USERNAME env not set');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUsername,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const htmlContent = buildOtpHtmlContent(otp, 'delete');

  const mailOptions: Mail.Options = {
    from: `"EMOH" <${emailUsername}>`,
    to: email,
    subject: 'Confirm EMOH Account Deletion',
    html: htmlContent,
    text: `You requested to delete your EMOH account. Your OTP is ${otp}. It expires in 10 minutes. If this wasn’t you, contact our support immediately.`,
  };

  await transporter.sendMail(mailOptions);
};
