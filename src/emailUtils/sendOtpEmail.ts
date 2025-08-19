import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';import { buildOtpHtmlContent } from '../emailUtils/email.util';


export const sendOtpEmail = async (email: string, otp: number) => {
  const emailUsername = process.env.EMAIL_USERNAME;
  if (!emailUsername) throw new Error('EMAIL_USERNAME env not set');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUsername,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const htmlContent = buildOtpHtmlContent(otp, 'register');

  const mailOptions: Mail.Options = {
    from: `"EMOH" <${emailUsername}>`,
    to: email,
    subject: 'Verify Your EMOH Account',
    html: htmlContent,
    text: `Your EMOH verification code is ${otp}. This code will expire in 10 minutes. Do not share it.`,
  };

  await transporter.sendMail(mailOptions);
};
