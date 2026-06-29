import nodemailer from "nodemailer";

// Support both easy "service" config and custom SMTP hosts for better delivery rates
export const transporter = nodemailer.createTransport(
  process.env.EMAIL_SERVICE 
    ? {
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER || "your_email@gmail.com",
          pass: process.env.EMAIL_PASS || "your_app_password"
        }
      }
    : {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 465,
        secure: process.env.EMAIL_SECURE !== "false", // true for 465, false for 587
        auth: {
          user: process.env.EMAIL_USER || "your_email@gmail.com",
          pass: process.env.EMAIL_PASS || "your_app_password"
        }
      }
);

export const fromEmail = process.env.EMAIL_USER 
  ? `"Global Chess Arena" <${process.env.EMAIL_USER}>` 
  : `"Global Chess Arena" <no-reply@chessarena.com>`;

// Reusable function that appends standard anti-spam & transactional headers
export async function sendMailWithHeaders({ to, subject, html }) {
  if (!to) return;
  return transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    html,
    headers: {
      "X-Auto-Response-Suppress": "OOF, AutoReply, DR, NDR, RN, NRN",
      "X-Priority": "3", // Normal priority
      "Priority": "normal",
      "Precedence": "list" // Indicates individual transactional communication
    }
  });
}

export async function sendWelcomeEmail(toEmail, username) {
  const subject = "Welcome to Global Chess Arena! ♟️";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; text-align: center;">
      <h1 style="color: #4CAF50;">Welcome to Chess Arena, ${username}!</h1>
      <p>We are thrilled to have you on board. Get ready to challenge players from around the world and climb the leaderboard.</p>
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Play Now</a>
    </div>
  `;

  try {
    if (toEmail) {
      await sendMailWithHeaders({ to: toEmail, subject, html });
    }
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
}

export async function sendTournamentEmail(toEmail, username, tournamentName) {
  const subject = `You're invited to ${tournamentName}! 🏆`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; text-align: center;">
      <h1 style="color: #FFC107;">Tournament Alert!</h1>
      <p>Hello ${username},</p>
      <p>A new tournament "<strong>${tournamentName}</strong>" has been announced! Check the dashboard and reserve your spot before it fills up.</p>
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/tournaments" style="display: inline-block; padding: 10px 20px; background-color: #FFC107; color: black; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">View Tournaments</a>
    </div>
  `;

  try {
    if (toEmail) {
      const { queueEmail } = await import("./emailQueueService.js");
      await queueEmail(toEmail, subject, html);
    }
  } catch (error) {
    console.error("Failed to queue tournament email:", error);
  }
}

export async function sendOtpEmail(toEmail, username, otpCode) {
  const subject = "Verify Your Global Chess Arena Account ♟️";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h1 style="color: #4CAF50; margin-bottom: 20px;">Email Verification</h1>
      <p style="font-size: 16px; color: #333;">Hello <strong>${username}</strong>,</p>
      <p style="font-size: 16px; color: #666; margin-bottom: 30px;">Thank you for registering at Global Chess Arena. Please use the following One-Time Password (OTP) to verify your account. This code is valid for 15 minutes:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; background-color: #f4fbf4; padding: 15px; border-radius: 5px; display: inline-block; margin-bottom: 30px;">
        ${otpCode}
      </div>
      <p style="font-size: 14px; color: #999;">If you didn't request this verification code, please ignore this email.</p>
    </div>
  `;

  try {
    if (toEmail) {
      await sendMailWithHeaders({ to: toEmail, subject, html });
    }
  } catch (error) {
    console.error("Failed to send OTP verification email:", error);
  }
}

export async function sendForgotPasswordEmail(toEmail, username, otpCode) {
  const subject = "Reset Your Global Chess Arena Password 🔑";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h1 style="color: #FF9800; margin-bottom: 20px;">Password Reset Request</h1>
      <p style="font-size: 16px; color: #333;">Hello <strong>${username}</strong>,</p>
      <p style="font-size: 16px; color: #666; margin-bottom: 30px;">We received a request to reset your password. Use the code below to reset it. This code is valid for 15 minutes:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #FF9800; background-color: #fff9f2; padding: 15px; border-radius: 5px; display: inline-block; margin-bottom: 30px;">
        ${otpCode}
      </div>
      <p style="font-size: 14px; color: #999;">If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
    </div>
  `;

  try {
    if (toEmail) {
      await sendMailWithHeaders({ to: toEmail, subject, html });
    }
  } catch (error) {
    console.error("Failed to send forgot password email:", error);
  }
}

export async function sendMatchNotificationEmail(toEmail, username, opponentName, tournamentName) {
  const subject = `Your Tournament Match is Ready! ⚔️`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; text-align: center; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h1 style="color: #2196F3; margin-bottom: 20px;">Tournament Match Alert</h1>
      <p style="font-size: 16px; color: #333;">Hello <strong>${username}</strong>,</p>
      <p style="font-size: 16px; color: #666; margin-bottom: 20px;">Your match in the tournament "<strong>${tournamentName}</strong>" is ready!</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; width: 80%; margin: 20px auto;">
        <p style="margin: 5px 0;"><strong>Opponent:</strong> ${opponentName}</p>
        <p style="margin: 5px 0;"><strong>Tournament:</strong> ${tournamentName}</p>
      </div>
      <p style="font-size: 16px; color: #333; margin-top: 20px;">Please head over to the platform to start your game.</p>
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/tournaments" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">Go to Tournament</a>
    </div>
  `;
  try {
    if (toEmail) {
      const { queueEmail } = await import("./emailQueueService.js");
      await queueEmail(toEmail, subject, html);
    }
  } catch (error) {
    console.error("Failed to queue match notification email:", error);
  }
}

export async function sendAdminDirectEmail(toEmail, username, adminMessage) {
  const subject = "Message from Global Chess Arena Admin ✉️";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4CAF50; text-align: center;">Message from Platform Admin</h2>
      <p>Hello <strong>${username}</strong>,</p>
      <p>The system administrator has sent you a direct message:</p>
      <div style="background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; font-style: italic; white-space: pre-wrap;">
        ${adminMessage}
      </div>
      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Global Chess Arena</a>
      </p>
    </div>
  `;
  try {
    if (toEmail) {
      const { queueEmail } = await import("./emailQueueService.js");
      await queueEmail(toEmail, subject, html);
    }
  } catch (error) {
    console.error("Failed to queue admin direct email:", error);
  }
}

export async function sendPremiumActivationEmail(toEmail, username) {
  const subject = "Your Global Chess Arena Premium Account is Active! 👑";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #0d0d12; color: #ffffff;">
      <h2 style="color: #fbbf24; text-align: center;">Account Upgraded to Premium!</h2>
      <p>Hello <strong>${username}</strong>,</p>
      <p>We are excited to inform you that your request has been reviewed, and your account has been upgraded to <strong>Premium Member</strong>!</p>
      <p>You now have unlimited access to:</p>
      <ul>
        <li>Tactical puzzles database</li>
        <li>Stockfish deep game analysis</li>
        <li>AI Chess Coach assistant</li>
      </ul>
      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/puzzles" style="display: inline-block; padding: 10px 20px; background-color: #fbbf24; color: black; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Playing Puzzles</a>
      </p>
    </div>
  `;
  try {
    if (toEmail) {
      const { queueEmail } = await import("./emailQueueService.js");
      await queueEmail(toEmail, subject, html);
    }
  } catch (error) {
    console.error("Failed to queue premium activation email:", error);
  }
}

export async function sendAdminPremiumRequestEmail(username, sessionId) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || "zizoelsadany5@gmail.com";
  const subject = "طلب تفعيل حساب بريميوم جديد 👑";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #0d0d12; color: #ffffff; direction: rtl; text-align: right;">
      <h2 style="color: #fbbf24; text-align: center;">طلب تفعيل بريميوم جديد</h2>
      <p>مرحباً يا مسؤول المنصة،</p>
      <p>لقد قام اللاعب <strong>${username}</strong> بإرسال طلب لتفعيل الاشتراك المميز (Premium) ودفع مبلغ $9.99.</p>
      <p><strong>رقم الجلسة (Session ID):</strong> ${sessionId}</p>
      <p style="background-color: #1e1b4b; border-right: 4px solid #fbbf24; padding: 15px; margin: 20px 0; border-radius: 4px;">
        يرجى الدخول إلى لوحة التحكم، والتأكد من المحفظة أو بوابة الدفع، وتفعيل صلاحيات الحساب إذا كان الدفع صحيحاً.
      </p>
      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/admin/users" style="display: inline-block; padding: 10px 20px; background-color: #fbbf24; color: black; text-decoration: none; border-radius: 5px; font-weight: bold;">الانتقال إلى إدارة المستخدمين</a>
      </p>
    </div>
  `;
  try {
    const { queueEmail } = await import("./emailQueueService.js");
    await queueEmail(adminEmail, subject, html);
  } catch (error) {
    console.error("Failed to queue admin premium request email:", error);
  }
}
