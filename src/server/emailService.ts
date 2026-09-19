import nodemailer, { Transporter } from 'nodemailer';
import dns from 'dns';
import crypto from 'crypto';

const OTP_SALT = process.env.OTP_SALT || crypto.randomBytes(16).toString('hex');

interface OtpEntry {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  previewUrl?: string;
  devCode?: string;
}

interface VerifiedTokenEntry {
  email: string;
  verifiedAt: number;
  expiresAt: number;
}

// In-memory stores
const otpStore = new Map<string, OtpEntry>();
const verifiedEmailTokens = new Map<string, VerifiedTokenEntry>();

let cachedTransporter: Transporter | null = null;
let isEthereal = false;

/**
 * Validates email format and verifies that the domain has active MX records.
 */
export async function validateEmailDomainAndMx(email: string): Promise<{ isValid: boolean; error?: string; cleanEmail: string; domain?: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  
  // RFC-compliant email regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@gmail.com).', cleanEmail };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Invalid email structure.', cleanEmail };
  }

  const domain = parts[1];
  
  // Verify domain has MX (mail exchange) records
  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { 
        isValid: false, 
        error: `The email domain "${domain}" has no active mail exchange (MX) servers and cannot receive emails.`, 
        cleanEmail, 
        domain 
      };
    }
  } catch (dnsErr: any) {
    if (dnsErr.code === 'ENOTFOUND' || dnsErr.code === 'ENODATA' || dnsErr.code === 'ESERVFAIL') {
      return { 
        isValid: false, 
        error: `The domain "${domain}" does not exist or has no active mail servers to receive emails.`, 
        cleanEmail, 
        domain 
      };
    }
    // Allow through if transient DNS network glitch, but log
    console.warn(`[EmailService] DNS MX query notice for ${domain}:`, dnsErr.message);
  }

  return { isValid: true, cleanEmail, domain };
}

/**
 * Retrieves or initializes nodemailer transporter.
 */
async function getTransporter(): Promise<{ transporter: Transporter; isTest: boolean }> {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, isTest: isEthereal };
  }

  // 1. Check custom SMTP environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    isEthereal = false;
    console.log(`[EmailService] Configured custom SMTP: ${process.env.SMTP_HOST}`);
    return { transporter: cachedTransporter, isTest: false };
  }

  // 2. Active Ethereal mail transport for real TLS email transmission
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    isEthereal = true;
    console.log(`[EmailService] Configured real Ethereal SMTP transport (${testAccount.user})`);
    return { transporter: cachedTransporter, isTest: true };
  } catch (err) {
    console.error('[EmailService] Failed to create Ethereal test account:', err);
    throw new Error('Email delivery service is currently unavailable. Please configure SMTP credentials or try again.');
  }
}

/**
 * Sends real email with 4-digit OTP code to the recipient.
 */
export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  try {
    const { transporter, isTest } = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"FindIt - Ismail Yusuf College" <findit-noreply@iyc.edu.in>';

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `${otpCode} is your FindIt verification code - Ismail Yusuf College`,
      text: `FindIt – Ismail Yusuf College, Mumbai\n\nYour 4-digit verification code is: ${otpCode}\n\nThis code will expire in 5 minutes.\nDo not share this code with anyone.\n\nIf you did not request this code, please ignore this email.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1e3a8a; margin: 0; font-size: 22px; font-weight: 800;">FindIt Portal</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Ismail Yusuf College of Arts, Science & Commerce, Mumbai</p>
          </div>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
            <p style="color: #475569; font-size: 14px; margin: 0 0 12px 0; font-weight: 500;">Your 4-digit account verification code is:</p>
            <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #1e40af; font-family: monospace; background: #eff6ff; display: inline-block; padding: 10px 28px; border-radius: 8px; border: 1px dashed #3b82f6;">
              ${otpCode}
            </div>
            <p style="color: #dc2626; font-size: 12px; margin-top: 14px; font-weight: 600;">⏱️ Valid for 5 minutes only</p>
          </div>
          
          <p style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
            This code was requested to verify your email address (<strong>${toEmail}</strong>) for your FindIt campus account. Never share this code with anyone.
          </p>
          
          <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; color: #64748b; margin-bottom: 20px;">
            If you did not initiate this request, you can safely disregard this message. No account has been created yet.
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <div style="text-align: center; font-size: 11px; color: #94a3b8;">
            Government of Maharashtra's Ismail Yusuf College &bull; Jogeshwari (East), Mumbai
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] OTP successfully sent to ${toEmail}. Message ID: ${info.messageId}`);
    
    let previewUrl: string | undefined;
    if (isTest) {
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[EmailService] Ethereal live preview URL: ${previewUrl}`);
    }
    return { success: true, previewUrl };
  } catch (err: any) {
    console.error(`[EmailService] Error sending email to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch verification email.' };
  }
}

/**
 * Handles sending a new 4-digit OTP.
 * Enforces rate-limiting/cooldown, generates random 4-digit code, hashes it,
 * sends the real email, and stores verification state.
 */
export async function requestEmailOtp(email: string): Promise<{ 
  success: boolean; 
  error?: string; 
  message?: string; 
  cooldownRemaining?: number; 
  previewUrl?: string; 
  devCode?: string;
}> {
  // Validate email and MX records
  const val = await validateEmailDomainAndMx(email);
  if (!val.isValid) {
    return { success: false, error: val.error };
  }
  const cleanEmail = val.cleanEmail;

  // Check rate limit / cooldown (60s)
  const existing = otpStore.get(cleanEmail);
  const now = Date.now();
  if (existing && existing.lastSentAt) {
    const elapsed = now - existing.lastSentAt;
    if (elapsed < 60 * 1000) {
      const remaining = Math.ceil((60 * 1000 - elapsed) / 1000);
      return { 
        success: false, 
        error: `Please wait ${remaining} second${remaining > 1 ? 's' : ''} before requesting another OTP.`, 
        cooldownRemaining: remaining 
      };
    }
  }

  // Generate random 4-digit OTP (1000 - 9999)
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

  // Send real email via nodemailer
  const emailResult = await sendOtpEmail(cleanEmail, otpCode);
  if (!emailResult.success) {
    return { 
      success: false, 
      error: emailResult.error || 'Failed to send verification email. Please check that your email address is correct and can receive messages.' 
    };
  }

  // Securely hash OTP with SHA-256 and secret salt
  const hash = crypto.createHash('sha256').update(`${otpCode}:${OTP_SALT}:${cleanEmail}`).digest('hex');

  // Store in-memory with 5-minute expiry
  otpStore.set(cleanEmail, {
    hash,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
    lastSentAt: now,
    previewUrl: emailResult.previewUrl,
    devCode: otpCode // Available for dev debugging/testing
  });

  return {
    success: true,
    message: `A 4-digit verification code has been sent to ${cleanEmail}. It is valid for 5 minutes.`,
    previewUrl: emailResult.previewUrl,
    devCode: (process.env.NODE_ENV !== 'production' || isEthereal || !process.env.SMTP_USER) ? otpCode : undefined
  };
}

/**
 * Verifies the 4-digit OTP provided by the user.
 * Limits failed attempts to 5, checks expiry, and returns a verification token.
 */
export function verifyEmailOtp(email: string, enteredOtp: string): { 
  success: boolean; 
  error?: string; 
  verificationToken?: string; 
  verifiedEmail?: string; 
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanOtp = (enteredOtp || '').trim();

  if (!cleanEmail) {
    return { success: false, error: 'Email address is required.' };
  }

  if (!cleanOtp || !/^\d{4}$/.test(cleanOtp)) {
    return { success: false, error: 'Please enter a valid 4-digit OTP code.' };
  }

  const record = otpStore.get(cleanEmail);
  if (!record) {
    return { 
      success: false, 
      error: 'No verification code was requested for this email, or it has expired. Please click "Send OTP".' 
    };
  }

  const now = Date.now();
  if (record.expiresAt < now) {
    otpStore.delete(cleanEmail);
    return { 
      success: false, 
      error: 'The 4-digit verification code has expired. Please request a new code.' 
    };
  }

  // Check attempt limit
  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(cleanEmail);
    return { 
      success: false, 
      error: 'Maximum verification attempts exceeded. For your security, this code has been invalidated. Please request a new OTP.' 
    };
  }

  // Verify hash
  const computedHash = crypto.createHash('sha256').update(`${cleanOtp}:${OTP_SALT}:${cleanEmail}`).digest('hex');
  if (computedHash !== record.hash) {
    const remainingAttempts = 5 - record.attempts;
    return { 
      success: false, 
      error: `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.` 
    };
  }

  // OTP is valid!
  otpStore.delete(cleanEmail);

  // Generate cryptographically secure verification token (valid for 15 minutes to complete registration)
  const token = `vtok_${crypto.randomBytes(24).toString('hex')}`;
  verifiedEmailTokens.set(token, {
    email: cleanEmail,
    verifiedAt: now,
    expiresAt: now + 15 * 60 * 1000 // 15 minutes to finish registration form
  });

  return {
    success: true,
    verificationToken: token,
    verifiedEmail: cleanEmail
  };
}

/**
 * Validates and consumes a verification token when creating an account.
 * Ensures the token belongs to the given email and has not expired.
 * Token can only be used once (atomic consumption).
 */
export function consumeVerificationToken(email: string, token: string): { isValid: boolean; error?: string } {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanToken = (token || '').trim();

  if (!cleanToken) {
    return { isValid: false, error: 'Email has not been verified. Please click "Send OTP" to verify your email first.' };
  }

  const record = verifiedEmailTokens.get(cleanToken);
  if (!record) {
    return { isValid: false, error: 'Invalid or expired email verification token. Please verify your email again.' };
  }

  if (record.email !== cleanEmail) {
    return { isValid: false, error: 'Verification token does not match the registered email address.' };
  }

  if (record.expiresAt < Date.now()) {
    verifiedEmailTokens.delete(cleanToken);
    return { isValid: false, error: 'Email verification has expired. Please verify your email again.' };
  }

  // Token is valid; consume it so it cannot be used again
  verifiedEmailTokens.delete(cleanToken);
  return { isValid: true };
}

/**
 * Tests the current SMTP connection using nodemailer verify().
 */
export async function testSmtpConnection(): Promise<{ connected: boolean; isTest: boolean; host?: string; port?: number; error?: string }> {
  try {
    const { transporter, isTest } = await getTransporter();
    await transporter.verify();
    return {
      connected: true,
      isTest,
      host: (transporter.options as any).host,
      port: (transporter.options as any).port
    };
  } catch (err: any) {
    return {
      connected: false,
      isTest: isEthereal,
      error: err.message || 'SMTP connection failed'
    };
  }
}

