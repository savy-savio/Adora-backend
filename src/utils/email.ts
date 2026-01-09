import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email: string, code: string, name: string) => {
  try {
    // <CHANGE> Using Resend instead of Nodemailer for reliable email delivery
    const response = await resend.emails.send({
      from: process.env.SMTP_FROM_EMAIL || "onboarding@resend.dev",
      to: email,
      subject: "Verify your email - Adora",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome, ${name}!</h2>
          <p style="color: #666; font-size: 16px;">Thank you for signing up with Adora. Please verify your email using the code below:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
            <p style="font-size: 36px; font-weight: bold; color: #4F46E5; margin: 0; letter-spacing: 5px;">${code}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          
          <br/>
          <p style="color: #666; margin-top: 40px;">Best regards,<br/><strong>The Adora Team</strong></p>
        </div>
      `,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log("[v0] Verification email sent successfully to:", email);
    return response;
  } catch (error) {
    console.error("[v0] Email sending error:", error);
    throw error;
  }
};
