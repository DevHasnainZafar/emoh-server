// import * as nodemailer from 'nodemailer';
// import Mail from 'nodemailer/lib/mailer';

// export const sendOtpEmail = async (email: string, otp: number) => {
//   const emailUsername = process.env.EMAIL_USERNAME;

//   if (!emailUsername) {
//     throw new Error('EMAIL_USERNAME environment variable is not set');
//   }

//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: emailUsername,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   const htmlContent = `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <meta charset="UTF-8">
//       <meta name="viewport" content="width=device-width, initial-scale=1.0">
//       <style>
//         body {
//           font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//           line-height: 1.6;
//           color: #333333;
//           margin: 0;
//           padding: 0;
//           background-color: #f4f4f4;
//           -webkit-text-size-adjust: 100%;
//           -ms-text-size-adjust: 100%;
//         }
//         .main-container {
//           max-width: 600px;
//           margin: 0 auto;
//           background: linear-gradient(135deg, #00D089 0%, #00A56D 100%);
//           padding: 10px;
//           width: 100%;
//           box-sizing: border-box;
//         }
//         .container {
//           background-color: #ffffff;
//           border-radius: 10px;
//           padding: 20px;
//           margin: 10px;
//           box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//           box-sizing: border-box;
//         }
//         .header {
//           text-align: center;
//           margin-bottom: 20px;
//         }
//         .logo {
//           font-size: 28px;
//           font-weight: bold;
//           color: #ffffff;
//           text-transform: uppercase;
//           letter-spacing: 3px;
//           margin-bottom: 15px;
//         }
//         .content {
//           background-color: #ffffff;
//           padding: 15px;
//           border-radius: 8px;
//           word-wrap: break-word;
//           box-sizing: border-box;
//         }
//         .greeting {
//           font-size: 22px;
//           color: #2d3748;
//           margin-bottom: 15px;
//         }
//         .otp-box {
//           background: linear-gradient(145deg, #f3f4f6, #ffffff);
//           padding: 20px;
//           margin: 20px 0;
//           text-align: center;
//           border-radius: 12px;
//           border: 2px solid #e2e8f0;
//           box-sizing: border-box;
//         }
//         .otp-title {
//           font-size: 16px;
//           color: #4a5568;
//           margin-bottom: 10px;
//         }
//         .otp-code {
//           font-size: 32px;
//           font-weight: bold;
//           color: #00A56D;
//           letter-spacing: 6px;
//           padding: 8px;
//           background-color: #f8fafc;
//           border-radius: 6px;
//           display: inline-block;
//           max-width: 100%;
//           overflow: hidden;
//           text-overflow: ellipsis;
//         }
//         .timer {
//           color: #718096;
//           font-size: 14px;
//           margin-top: 8px;
//         }
//         .info {
//           background-color: #f8fafc;
//           padding: 12px;
//           border-radius: 8px;
//           margin: 15px 0;
//           box-sizing: border-box;
//         }
//         .info ul {
//           padding-left: 20px;
//           margin: 10px 0;
//         }
//         .warning {
//           background-color: #fff5f5;
//           color: #c53030;
//           padding: 12px;
//           border-radius: 8px;
//           margin: 15px 0;
//           font-size: 14px;
//           border-left: 4px solid #fc8181;
//           box-sizing: border-box;
//         }
//         .button {
//           background-color: #00A56D;
//           color: #ffffff;
//           padding: 10px 20px;
//           text-decoration: none;
//           border-radius: 5px;
//           display: inline-block;
//           margin: 15px 0;
//           font-weight: bold;
//         }
//         .footer {
//           text-align: center;
//           font-size: 12px;
//           color: #ffffff;
//           margin-top: 20px;
//           word-wrap: break-word;
//         }
//         .social-links {
//           margin: 15px 0;
//         }
//         .social-links a {
//           color: #ffffff;
//           margin: 0 8px;
//           text-decoration: none;
//           display: inline-block;
//         }
        
//         @media only screen and (max-width: 480px) {
//           .main-container {
//             width: 100% !important;
//             padding: 5px !important;
//           }
//           .container {
//             margin: 5px !important;
//             padding: 15px !important;
//           }
//           .content {
//             padding: 10px !important;
//           }
//           .otp-box {
//             padding: 15px !important;
//           }
//           .logo {
//             font-size: 24px !important;
//           }
//           .greeting {
//             font-size: 20px !important;
//           }
//           .otp-code {
//             font-size: 28px !important;
//             letter-spacing: 4px !important;
//             padding: 6px !important;
//           }
//           .info, .warning {
//             padding: 10px !important;
//           }
//         }
//       </style>
//     </head>
//     <body>
//       <div class="main-container">
//         <div class="header">
//           <div class="logo">EMOH</div>
//         </div>
        
//         <div class="container">
//           <div class="content">
//             <div class="greeting">Welcome to EMOH!</div>
            
//             <p>Thank you for choosing EMOH. To ensure the security of your account, please use the verification code below to complete your registration.</p>
            
//             <div class="otp-box">
//               <div class="otp-title">Your Verification Code</div>
//               <div class="otp-code">${otp}</div>
//               <div class="timer">Valid for 10 minutes only</div>
//             </div>
            
//             <div class="info">
//               <strong>Important:</strong>
//               <ul>
//                 <li>This code is valid for one use only</li>
//                 <li>Keep this code confidential</li>
//                 <li>Our team will never ask for this code</li>
//               </ul>
//             </div>
            
//             <div class="warning">
//               If you didn't request this code, please ignore this email or contact our support team immediately.
//             </div>
            
//             <p>Need help? Our support team is available 24/7 to assist you.</p>
//           </div>
//         </div>
        
//         <div class="footer">
//           <div class="social-links">
//            <a href="https://x.com/emohpay?t=zIZ9v_PsW3teQy9rSolSxg&s=09" target="_blank">Twitter</a> |
//             <a href="https://www.facebook.com/Emohpay/" target="_blank">Facebook</a> |
//             <a href="https://www.instagram.com/emohpay/?igsh=MXJsZ3FwczVkYnFlZw%3D%3D#" target="_blank">Instagram</a>
//           </div>
//           <p>© ${new Date().getFullYear()} EMOH. All rights reserved.</p>
//           <p>This is an automated message, please do not reply to this email.</p>
//         </div>
//       </div>
//     </body>
//     </html>
//   `;

//   const mailOptions: Mail.Options = {
//     from: `"EMOH" <${emailUsername}>`,
//     to: email,
//     subject: 'Verify Your EMOH Account',
//     html: htmlContent,
//     text: `Your EMOH verification code is ${otp}. This code will expire in 10 minutes. For security reasons, please do not share this code with anyone.`,
//   };

//   await transporter.sendMail(mailOptions);
// };



export const buildOtpHtmlContent = (otp: number, context: 'register' | 'delete') => {
  const isDelete = context === 'delete';

  const greeting = isDelete
    ? 'Account Deletion Request'
    : 'Welcome to EMOH!';

  const message = isDelete
    ? 'You requested to delete your EMOH account. Please use the OTP below to confirm this action.'
    : 'Thank you for choosing EMOH. To ensure the security of your account, please use the verification code below to complete your registration.';

  const warning = isDelete
    ? `If you didn't request this deletion, secure your account immediately or contact our support team.`
    : `If you didn't request this code, please ignore this email or contact our support team immediately.`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        .main-container {
          max-width: 600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #00D089 0%, #00A56D 100%);
          padding: 10px;
          width: 100%;
          box-sizing: border-box;
        }
        .container {
          background-color: #ffffff;
          border-radius: 10px;
          padding: 20px;
          margin: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 15px;
        }
        .content {
          background-color: #ffffff;
          padding: 15px;
          border-radius: 8px;
          word-wrap: break-word;
          box-sizing: border-box;
        }
        .greeting {
          font-size: 22px;
          color: #2d3748;
          margin-bottom: 15px;
        }
        .otp-box {
          background: linear-gradient(145deg, #f3f4f6, #ffffff);
          padding: 20px;
          margin: 20px 0;
          text-align: center;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          box-sizing: border-box;
        }
        .otp-title {
          font-size: 16px;
          color: #4a5568;
          margin-bottom: 10px;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          color: #00A56D;
          letter-spacing: 6px;
          padding: 8px;
          background-color: #f8fafc;
          border-radius: 6px;
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .timer {
          color: #718096;
          font-size: 14px;
          margin-top: 8px;
        }
        .info {
          background-color: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          margin: 15px 0;
          box-sizing: border-box;
        }
        .info ul {
          padding-left: 20px;
          margin: 10px 0;
        }
        .warning {
          background-color: #fff5f5;
          color: #c53030;
          padding: 12px;
          border-radius: 8px;
          margin: 15px 0;
          font-size: 14px;
          border-left: 4px solid #fc8181;
          box-sizing: border-box;
        }
        .button {
          background-color: #00A56D;
          color: #ffffff;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          margin: 15px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #ffffff;
          margin-top: 20px;
          word-wrap: break-word;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-links a {
          color: #ffffff;
          margin: 0 8px;
          text-decoration: none;
          display: inline-block;
        }
        
        @media only screen and (max-width: 480px) {
          .main-container {
            width: 100% !important;
            padding: 5px !important;
          }
          .container {
            margin: 5px !important;
            padding: 15px !important;
          }
          .content {
            padding: 10px !important;
          }
          .otp-box {
            padding: 15px !important;
          }
          .logo {
            font-size: 24px !important;
          }
          .greeting {
            font-size: 20px !important;
          }
          .otp-code {
            font-size: 28px !important;
            letter-spacing: 4px !important;
            padding: 6px !important;
          }
          .info, .warning {
            padding: 10px !important;
          }
        }
      </style>
  </head>
  <body>
    <div class="main-container">
      <div class="header">
        <div class="logo">EMOH</div>
      </div>
      <div class="container">
        <div class="content">
          <div class="greeting">${greeting}</div>
          <p>${message}</p>
          <div class="otp-box">
            <div class="otp-title">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="timer">Valid for 10 minutes only</div>
          </div>
          <div class="info">
            <strong>Important:</strong>
            <ul>
              <li>This code is valid for one use only</li>
              <li>Keep this code confidential</li>
              <li>Our team will never ask for this code</li>
            </ul>
          </div>
          <div class="warning">${warning}</div>
          <p>Need help? Our support team is available 24/7 to assist you.</p>
        </div>
      </div>
      <div class="footer">
        <div class="social-links">
          <a href="https://x.com/emohpay" target="_blank">Twitter</a> |
          <a href="https://www.facebook.com/Emohpay/" target="_blank">Facebook</a> |
          <a href="https://www.instagram.com/emohpay/" target="_blank">Instagram</a>
        </div>
        <p>© ${new Date().getFullYear()} EMOH. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};
