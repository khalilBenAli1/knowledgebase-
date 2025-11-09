import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Configure nodemailer with Gmail or custom SMTP
    const emailConfig = {
      host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: parseInt(this.configService.get<string>('EMAIL_PORT', '587')),
      secure: this.configService.get<string>('EMAIL_SECURE', 'false') === 'true', // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const verificationLink = `${appUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Assurances BIAT" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Vérifiez votre adresse email - Assurances BIAT',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 30px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Assurances BIAT</h1>
            </div>
            <div class="content">
              <h2>Bienvenue, ${name}!</h2>
              <p>Merci de vous être inscrit sur la plateforme Assurances BIAT.</p>
              <p>Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous:</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Vérifier mon email</a>
              </div>
              <p>Ou copiez et collez ce lien dans votre navigateur:</p>
              <p style="word-break: break-all; color: #1e40af;">${verificationLink}</p>
              <p><strong>Ce lien expirera dans 24 heures.</strong></p>
              <p>Si vous n'avez pas créé de compte, veuillez ignorer cet email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Assurances BIAT. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Assurances BIAT" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Réinitialisation de mot de passe - Assurances BIAT',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 30px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Assurances BIAT</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${name},</h2>
              <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
              <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe:</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
              </div>
              <p>Ou copiez et collez ce lien dans votre navigateur:</p>
              <p style="word-break: break-all; color: #1e40af;">${resetLink}</p>
              <p><strong>Ce lien expirera dans 1 heure.</strong></p>
              <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Assurances BIAT. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    const mailOptions = {
      from: `"Assurances BIAT" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Bienvenue sur Assurances BIAT!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 30px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Assurances BIAT</h1>
            </div>
            <div class="content">
              <h2>Bienvenue, ${name}!</h2>
              <p>Félicitations! Votre adresse email a été vérifiée avec succès.</p>
              <p>Votre compte est maintenant actif et vous pouvez profiter de tous les services de la plateforme Assurances BIAT.</p>
              <div style="text-align: center;">
                <a href="${appUrl}/login" class="button">Se connecter</a>
              </div>
              <p>Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Assurances BIAT. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error);
      // Don't throw error - notification failure shouldn't block the verification
    }
  }

  async sendFormationRequestNotification(
    to: string,
    managerName: string,
    requesterName: string,
    formationTitle: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    const mailOptions = {
      from: `"Assurances BIAT" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Nouvelle demande de formation - Assurances BIAT',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 30px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Assurances BIAT</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${managerName},</h2>
              <p><strong>${requesterName}</strong> a soumis une demande de formation:</p>
              <p style="font-size: 18px; color: #1e40af;"><strong>${formationTitle}</strong></p>
              <p>Veuillez examiner cette demande et y répondre dans les plus brefs délais.</p>
              <div style="text-align: center;">
                <a href="${appUrl}/manager/formation-requests" class="button">Voir les demandes</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Assurances BIAT. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Formation request notification sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send formation request notification to ${to}`, error);
      // Don't throw error - notification failure shouldn't block the request
    }
  }

  async sendAdminPasswordResetEmail(to: string, name: string, tempPassword: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    const mailOptions = {
      from: `"Assurances BIAT" <${this.configService.get<string>('EMAIL_USER')}>`,
      to,
      subject: 'Réinitialisation de mot de passe - Assurances BIAT',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background-color: #f9fafb; }
            .password-box { background-color: #fff; border: 2px solid #1e40af; padding: 15px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1e40af; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Assurances BIAT</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${name},</h2>
              <p>Un administrateur a réinitialisé votre mot de passe.</p>
              <p>Votre nouveau mot de passe temporaire est:</p>
              <div class="password-box">${tempPassword}</div>
              <div class="warning">
                <strong>⚠️ Important:</strong> Pour des raisons de sécurité, veuillez changer ce mot de passe temporaire dès votre première connexion.
              </div>
              <div style="text-align: center;">
                <a href="${appUrl}/login" class="button">Se connecter</a>
              </div>
              <p>Si vous n'avez pas demandé cette réinitialisation, veuillez contacter immédiatement l'administrateur.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Assurances BIAT. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Admin password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send admin password reset email to ${to}`, error);
      throw new Error('Failed to send admin password reset email');
    }
  }
}
