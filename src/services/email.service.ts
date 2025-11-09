import nodemailer from 'nodemailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    // Validate required credentials
    if (!smtpUser || !smtpPassword) {
      this.logger.error('⚠️  SMTP CONFIGURATION ERROR: Missing required environment variables');
      this.logger.error(`SMTP_USER: ${smtpUser ? '✓ Set' : '✗ Missing'}`);
      this.logger.error(`SMTP_PASSWORD: ${smtpPassword ? '✓ Set' : '✗ Missing'}`);
      this.logger.warn('Email functionality will not work without proper credentials!');
    } else {
      this.logger.log('✓ SMTP credentials loaded successfully');
      this.logger.log(`SMTP Host: ${process.env.SMTP_HOST || 'Not set'}`);
      this.logger.log(`SMTP Port: ${process.env.SMTP_PORT || '587'}`);
      this.logger.log(`SMTP User: ${smtpUser}`);
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  private getEmailTemplate(content: string, title: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #D4002A 0%, #8B0000 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      background-color: white;
      width: 60px;
      height: 60px;
      margin: 0 auto 15px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-title {
      color: white;
      font-size: 24px;
      font-weight: bold;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .content h1 {
      color: #D4002A;
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      margin: 15px 0;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 15px 35px;
      background: linear-gradient(135deg, #D4002A 0%, #8B0000 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      margin: 25px 0;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #D4002A;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666666;
      font-size: 14px;
      border-top: 1px solid #e0e0e0;
    }
    .footer p {
      margin: 5px 0;
    }
    .divider {
      height: 1px;
      background-color: #e0e0e0;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#D4002A">
          <path d="M12 2C10.9 2 10 2.9 10 4V5H8C6.9 5 6 5.9 6 7V9C4.9 9 4 9.9 4 11V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V11C20 9.9 19.1 9 18 9V7C18 5.9 17.1 5 16 5H14V4C14 2.9 13.1 2 12 2M10 7H14V9H10V7M9 11C9.6 11 10 11.4 10 12C10 12.6 9.6 13 9 13C8.4 13 8 12.6 8 12C8 11.4 8.4 11 9 11M15 11C15.6 11 16 11.4 16 12C16 12.6 15.6 13 15 13C14.4 13 14 12.6 14 12C14 11.4 14.4 11 15 11M8.5 15H15.5C15.8 15 16 15.2 16 15.5C16 16.9 14.4 18 12 18C9.6 18 8 16.9 8 15.5C8 15.2 8.2 15 8.5 15Z"/>
        </svg>
      </div>
      <h1 class="header-title">Assurances BIAT</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Assurances BIAT</strong></p>
      <p>Plateforme d'Assistant RH Intelligent</p>
      <p style="margin-top: 15px; font-size: 12px; color: #999;">
        Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    this.logger.log(`Preparing verification email for ${email} (user: ${name})`);

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const content = `
      <h1>Bienvenue ${name} ! 🎉</h1>
      <p>Merci de vous être inscrit sur la plateforme Assurances BIAT.</p>
      <p>Pour activer votre compte et commencer à utiliser nos services, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>

      <div style="text-align: center;">
        <a href="${verificationLink}" class="button">Vérifier mon adresse email</a>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>⏰ Important :</strong> Ce lien expire dans 24 heures.</p>
      </div>

      <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :</p>
      <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationLink}</p>

      <div class="divider"></div>

      <p style="color: #666; font-size: 14px;">
        Si vous n'avez pas créé de compte sur Assurances BIAT, vous pouvez ignorer cet email en toute sécurité.
      </p>
    `;

    await this.sendEmail(
      email,
      'Vérifiez votre adresse email - Assurances BIAT',
      content,
      'Vérification Email'
    );
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    this.logger.log(`Preparing password reset email for ${email} (user: ${name})`);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const content = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Bonjour ${name},</p>
      <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
      <p>Pour définir un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>

      <div style="text-align: center;">
        <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
      </div>

      <div class="info-box">
        <p style="margin: 0;"><strong>⏰ Important :</strong> Ce lien expire dans 1 heure.</p>
      </div>

      <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :</p>
      <p style="word-break: break-all; color: #666; font-size: 14px;">${resetLink}</p>

      <div class="divider"></div>

      <p style="color: #666; font-size: 14px;">
        <strong>Vous n'avez pas demandé cette réinitialisation ?</strong><br>
        Si vous n'avez pas effectué cette demande, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe ne sera pas modifié.
      </p>
    `;

    await this.sendEmail(
      email,
      'Réinitialisation de votre mot de passe - Assurances BIAT',
      content,
      'Réinitialisation Mot de Passe'
    );
  }

  async sendPasswordChangedNotification(email: string, name: string): Promise<void> {
    this.logger.log(`Preparing password changed notification for ${email} (user: ${name})`);

    const content = `
      <h1>Votre mot de passe a été modifié</h1>
      <p>Bonjour ${name},</p>
      <p>Nous vous confirmons que le mot de passe de votre compte a été modifié avec succès.</p>

      <div class="info-box">
        <p style="margin: 0;">
          <strong>📅 Date :</strong> ${new Date().toLocaleString('fr-FR')}<br>
        </p>
      </div>

      <p>Si vous êtes à l'origine de cette modification, aucune action n'est requise.</p>

      <div class="divider"></div>

      <p style="color: #D4002A; font-weight: bold;">
        ⚠️ Vous n'avez pas effectué cette modification ?
      </p>
      <p>
        Si vous n'avez pas modifié votre mot de passe, votre compte pourrait être compromis.
        Veuillez contacter immédiatement votre administrateur IT.
      </p>
    `;

    await this.sendEmail(
      email,
      'Votre mot de passe a été modifié - Assurances BIAT',
      content,
      'Notification Sécurité'
    );
  }

  async sendAdminPasswordResetEmail(email: string, name: string, tempPassword: string): Promise<void> {
    this.logger.log(`Preparing admin password reset email for ${email} (user: ${name})`);

    const content = `
      <h1>Réinitialisation de mot de passe par l'administrateur</h1>
      <p>Bonjour ${name},</p>
      <p>Votre administrateur IT a réinitialisé votre mot de passe.</p>

      <div class="info-box">
        <p style="margin: 0;">
          <strong>🔑 Mot de passe temporaire :</strong><br>
          <code style="background: #f0f0f0; padding: 8px 12px; border-radius: 4px; font-size: 18px; display: inline-block; margin-top: 8px; color: #D4002A; font-weight: bold;">${tempPassword}</code>
        </p>
      </div>

      <p><strong>⚠️ Important :</strong> Ce mot de passe est temporaire. Pour des raisons de sécurité, vous devez le changer lors de votre prochaine connexion.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/login" class="button">Se connecter maintenant</a>
      </div>

      <p style="color: #666; font-size: 14px;">
        <strong>Comment changer votre mot de passe :</strong><br>
        1. Connectez-vous avec le mot de passe temporaire ci-dessus<br>
        2. Allez dans Paramètres → Mot de passe<br>
        3. Définissez un nouveau mot de passe sécurisé
      </p>
    `;

    await this.sendEmail(
      email,
      'Votre mot de passe a été réinitialisé - Assurances BIAT',
      content,
      'Réinitialisation Admin'
    );
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    this.logger.log(`Preparing welcome email for ${email} (user: ${name})`);

    const content = `
      <h1>Bienvenue sur Assurances BIAT ! 🎉</h1>
      <p>Bonjour ${name},</p>
      <p>Votre adresse email a été vérifiée avec succès. Bienvenue dans la plateforme d'Assistant RH Intelligent !</p>

      <p><strong>Découvrez nos fonctionnalités :</strong></p>
      <ul style="line-height: 2;">
        <li>💬 Assistant RH intelligent basé sur l'IA</li>
        <li>📚 Catalogue de formations</li>
        <li>📰 Actualités et événements</li>
        <li>📄 Gestion documentaire</li>
        <li>👥 Gestion d'équipe (pour managers)</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}" class="button">Accéder à la plateforme</a>
      </div>

      <p>Si vous avez des questions, n'hésitez pas à contacter votre administrateur.</p>
    `;

    await this.sendEmail(
      email,
      'Bienvenue sur Assurances BIAT ! 🎉',
      content,
      'Bienvenue'
    );
  }

  private async sendEmail(to: string, subject: string, content: string, title: string): Promise<void> {
    this.logger.log(`Attempting to send email to ${to} with subject: "${subject}"`);

    try {
      const htmlContent = this.getEmailTemplate(content, title);

      await this.transporter.sendMail({
        from: `"Assurances BIAT" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlContent,
      });

      this.logger.log(`✓ Email sent successfully to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(
        `✗ Failed to send email to ${to} with subject "${subject}"`,
        error instanceof Error ? error.stack : error
      );
      this.logger.error(`Email error details: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      throw new Error('Failed to send email');
    }
  }
}
