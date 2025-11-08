# 📧 Email System - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Setup Instructions](#setup-instructions)
4. [Email Templates](#email-templates)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The email system sends professional HTML emails for:
1. ✉️ **Email verification** when users sign up
2. 🔑 **Password reset** requests
3. 📋 **Formation request notifications** to managers

### Technology Stack
- **Nodemailer** - Email sending library
- **Gmail SMTP** - Email delivery service (can use any SMTP)
- **HTML Templates** - Professional, responsive emails

---

## 🔄 How It Works

### Architecture

```
User Action
    ↓
Backend Service (EmailService)
    ↓
Nodemailer
    ↓
SMTP Server (Gmail)
    ↓
Recipient's Email
```

### Detailed Flow

#### 1. **Email Verification Flow**

```
User signs up
    ↓
AuthService creates user
    ↓
Generate verification token (random 32 bytes)
    ↓
Save token to database with expiration (24 hours)
    ↓
EmailService.sendVerificationEmail()
    ↓
Email sent with verification link
    ↓
User clicks link in email
    ↓
Backend verifies token
    ↓
Mark user as verified
    ↓
User can login
```

**Code Flow**:
```typescript
// 1. User signs up
POST /api/auth/signup
  ↓
// 2. AuthService creates user
const user = await usersRepository.save({
  email: 'user@example.com',
  isEmailVerified: false,
  emailVerificationToken: crypto.randomBytes(32).toString('hex'),
  emailVerificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
});
  ↓
// 3. Send email
await emailService.sendVerificationEmail(
  user.email,
  user.name,
  user.emailVerificationToken
);
  ↓
// 4. User receives email with link:
// http://localhost:3000/verify-email?token=abc123...
  ↓
// 5. User clicks link
GET /api/auth/verify-email?token=abc123
  ↓
// 6. Backend checks token
const user = await usersRepository.findOne({
  where: {
    emailVerificationToken: token,
    emailVerificationTokenExpires: MoreThan(new Date())
  }
});
  ↓
// 7. Mark as verified
user.isEmailVerified = true;
user.emailVerificationToken = null;
await usersRepository.save(user);
```

#### 2. **Formation Request Notification Flow**

```
User requests formation
    ↓
FormationRequestService creates request
    ↓
Get manager's email from database
    ↓
EmailService.sendFormationRequestNotification()
    ↓
Manager receives email
    ↓
Manager clicks link to review
    ↓
Manager approves/declines
```

---

## ⚙️ Setup Instructions

### Step 1: Install Dependencies

Already done if you followed previous guides:
```bash
npm install nodemailer @types/nodemailer
```

### Step 2: Get Gmail App Password

**Important**: You CANNOT use your regular Gmail password. You need an "App Password".

#### How to Get Gmail App Password:

1. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow setup wizard

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other" → Enter "Assurances BIAT"
   - Click "Generate"
   - Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

3. **Save to .env**
   ```bash
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcdefghijklmnop  # App password (no spaces)
   ```

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
# ============================================
# EMAIL CONFIGURATION
# ============================================

# SMTP Settings (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false  # false for port 587 (STARTTLS)

# Your Gmail credentials
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here  # 16-char app password

# Application URL (for email links)
APP_URL=http://localhost:3000  # Change to your domain in production
```

### Step 4: Alternative SMTP Providers

If you don't want to use Gmail, you can use:

#### **SendGrid** (Free: 100 emails/day)
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

#### **Mailgun** (Free: 5,000 emails/month)
```bash
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password
```

#### **Mailtrap** (Free - for testing only)
```bash
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-username
EMAIL_PASSWORD=your-mailtrap-password
```

---

## 📧 Email Templates

### 1. Verification Email

**When sent**: User signs up

**Template** (in `src/modules/email/email.service.ts`):
```html
Subject: Vérifiez votre adresse email - Assurances BIAT

Body:
┌─────────────────────────────────┐
│    Assurances BIAT (logo)       │
└─────────────────────────────────┘

Bienvenue, [Name]!

Merci de vous être inscrit sur la plateforme Assurances BIAT.

Pour activer votre compte, veuillez vérifier votre adresse email:

    [Vérifier mon email] (button)

Ou copiez ce lien:
http://localhost:3000/verify-email?token=abc123...

⚠ Ce lien expirera dans 24 heures.

Si vous n'avez pas créé de compte, ignorez cet email.

© 2025 Assurances BIAT
```

### 2. Formation Request Notification

**When sent**: User requests formation from manager

**Template**:
```html
Subject: Nouvelle demande de formation - Assurances BIAT

Body:
┌─────────────────────────────────┐
│    Assurances BIAT (logo)       │
└─────────────────────────────────┘

Bonjour [Manager Name],

[Employee Name] a soumis une demande de formation:

    Formation Leadership
    Date: 15/02/2025

Veuillez examiner cette demande dans les plus brefs délais.

    [Voir les demandes] (button)

© 2025 Assurances BIAT
```

### 3. Password Reset Email

**When sent**: User requests password reset

**Template**:
```html
Subject: Réinitialisation de mot de passe - Assurances BIAT

Body:
Vous avez demandé la réinitialisation de votre mot de passe.

    [Réinitialiser mon mot de passe] (button)

⚠ Ce lien expirera dans 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
```

---

## 🧪 Testing

### Test 1: Check SMTP Connection

Create a test file `test-email.js`:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password',
  },
});

transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ SMTP Error:', error);
  } else {
    console.log('✅ SMTP Server is ready to send emails');
  }
});
```

Run:
```bash
node test-email.js
```

### Test 2: Send Test Email

```bash
# Start your backend
npm run start:dev

# Sign up a new user (this will send verification email)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "your-email@gmail.com",
    "password": "Test1234!"
  }'

# Check your email inbox!
```

### Test 3: Test Formation Notification

```bash
# Create a formation request (after logging in)
curl -X POST http://localhost:3000/api/formation-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "formationId": "formation-uuid",
    "requesterMessage": "I need this training"
  }'

# Manager should receive email
```

---

## 🔍 How to Check If Emails Are Sent

### 1. Check Backend Logs

```bash
# In your terminal where backend is running, you'll see:
[EmailService] Verification email sent to user@example.com
[EmailService] Formation request notification sent to manager@example.com
```

### 2. Check Email Inbox

- Check **Inbox**
- Check **Spam/Junk** folder (emails might go there initially)
- Check **Promotions** tab (in Gmail)

### 3. Gmail "Sent" Folder

If using Gmail SMTP, emails will appear in your Gmail "Sent" folder.

---

## 🐛 Troubleshooting

### Issue 1: "Invalid login" Error

**Cause**: Using regular Gmail password instead of App Password

**Solution**:
1. Generate App Password (see Step 2 above)
2. Use App Password in `EMAIL_PASSWORD`
3. Remove spaces from App Password

```bash
# Wrong
EMAIL_PASSWORD=abcd efgh ijkl mnop

# Correct
EMAIL_PASSWORD=abcdefghijklmnop
```

### Issue 2: "Connection timeout"

**Cause**: Firewall blocking port 587

**Solution**:
1. Check firewall settings
2. Try port 465 with `EMAIL_SECURE=true`
3. Try different network (not corporate network with restrictions)

```bash
# Alternative configuration
EMAIL_PORT=465
EMAIL_SECURE=true
```

### Issue 3: Emails go to Spam

**Cause**: Gmail doesn't recognize sender

**Solution**:
1. **Short term**: Check spam folder
2. **Long term**: Use custom domain with SPF/DKIM records
3. **For testing**: Use Mailtrap (catches all emails, doesn't deliver)

### Issue 4: "Self-signed certificate" Error

**Solution**: Add to email service:
```typescript
const transporter = nodemailer.createTransporter({
  // ... other config
  tls: {
    rejectUnauthorized: false  // Only for development!
  }
});
```

### Issue 5: Emails not sending but no errors

**Check**:
1. Email service is imported in module
2. Environment variables are loaded
3. Backend logs show email attempt
4. Check email provider's sending limits

---

## 📊 Email Service Architecture

### File Structure

```
src/
└── modules/
    └── email/
        ├── email.module.ts        ← Module definition
        └── email.service.ts       ← Email templates & sending logic
```

### EmailService Methods

```typescript
class EmailService {
  // Send verification email to new users
  async sendVerificationEmail(
    to: string,
    name: string,
    token: string
  ): Promise<void>

  // Send password reset email
  async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string
  ): Promise<void>

  // Send formation request notification to manager
  async sendFormationRequestNotification(
    to: string,
    managerName: string,
    requesterName: string,
    formationTitle: string
  ): Promise<void>
}
```

### How to Use in Your Code

```typescript
// In any service, inject EmailService
import { EmailService } from '../email/email.service';

@Injectable()
export class YourService {
  constructor(private emailService: EmailService) {}

  async yourMethod() {
    // Send email
    await this.emailService.sendVerificationEmail(
      'user@example.com',
      'John Doe',
      'token123'
    );
  }
}
```

---

## 🔐 Security Best Practices

### 1. Never Commit Credentials

```bash
# Add to .gitignore
.env
.env.local
.env.production
```

### 2. Use Environment Variables

```bash
# ✅ Good
EMAIL_PASSWORD=process.env.EMAIL_PASSWORD

# ❌ Bad - Never hardcode!
EMAIL_PASSWORD="abcdefghijklmnop"
```

### 3. Validate Email Addresses

```typescript
// Already done in DTOs with class-validator
@IsEmail()
email: string;
```

### 4. Rate Limiting

Consider adding rate limiting for email sending:
```typescript
// Prevent spam
if (userEmailsSentToday > 10) {
  throw new Error('Email limit reached');
}
```

### 5. Production Considerations

For production:
1. Use dedicated email service (SendGrid, AWS SES)
2. Implement email queue (Bull, BullMQ)
3. Add retry logic for failed sends
4. Monitor email delivery rates
5. Set up SPF, DKIM, DMARC records

---

## 📈 Email Delivery Flow Diagram

```
┌─────────────┐
│   User      │
│   Signs Up  │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│  Auth Service       │
│  - Create user      │
│  - Generate token   │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  Email Service      │
│  - Build HTML       │
│  - Add variables    │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  Nodemailer         │
│  - Connect SMTP     │
│  - Send email       │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  Gmail SMTP         │
│  - Deliver email    │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  User's Inbox       │
│  ✉️  Email received │
└─────────────────────┘
```

---

## 🎯 Quick Setup Checklist

- [ ] Install nodemailer (`npm install nodemailer`)
- [ ] Enable 2FA on Gmail
- [ ] Generate Gmail App Password
- [ ] Add EMAIL_* variables to .env
- [ ] Import EmailModule in app.module.ts
- [ ] Test with `node test-email.js`
- [ ] Sign up test user to get verification email
- [ ] Check inbox (and spam folder)
- [ ] Verify emails are being sent successfully

---

## 💡 Tips & Tricks

### Tip 1: Use Mailtrap for Testing

During development, use Mailtrap to catch all emails without actually sending them:

```bash
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-user
EMAIL_PASSWORD=your-mailtrap-pass
```

All emails will be caught in Mailtrap inbox. Perfect for testing!

### Tip 2: Email Preview

You can preview emails before sending by logging the HTML:

```typescript
const html = this.buildEmailTemplate();
console.log(html); // Copy to file and open in browser
```

### Tip 3: Customization

To customize email templates, edit `email.service.ts`:
- Change colors in `<style>` section
- Modify text content
- Add company logo URL
- Change button styles

---

## 📞 Support

**Email not working?**

1. Check backend logs for errors
2. Verify .env variables are loaded (`console.log(process.env.EMAIL_USER)`)
3. Test SMTP connection with test script
4. Check Gmail "Less secure apps" is NOT needed (we use App Password)
5. Try different SMTP provider (Mailtrap for testing)

**Still stuck?**

Check the error message carefully - it usually tells you exactly what's wrong:
- "Invalid login" → Wrong App Password
- "Connection timeout" → Firewall or wrong port
- "EAUTH" → Authentication failed
- "ENOTFOUND" → Wrong SMTP host

---

**Last Updated**: 2025-01-08
**Status**: ✅ Production Ready
**Dependencies**: nodemailer, @types/nodemailer
