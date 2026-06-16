import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface DevisValidationEmailPayload {
  to: string;
  clientName: string;
  devisReference: string;
  totalTTC: number;
  conseillerName: string;
  companyName: string;
  validationUrl: string;
  acceptUrl: string;
  rejectUrl: string;
}

interface SupplierOrderEmailPayload {
  to: string;
  supplierName: string;
  reference: string;
  companyName: string;
  devisReference: string;
  lines: {
    materiauNom: string;
    quantite: number;
    unite: string;
    prixUnitaire: number;
    totalHT: number;
  }[];
}

interface InvoiceEmailPayload {
  to: string;
  clientName: string;
  invoiceReference: string;
  devisReference: string;
  companyName: string;
  amountTTC: number;
  dueDate?: string;
  customMessage?: string;
  lines: {
    description: string;
    quantite: number;
    unite: string;
    prixUnitaireHT: number;
    montantHT: number;
    tauxTVA: number;
  }[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly appEnv: string;
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.appEnv = (
      this.configService.get<string>('APP_ENV') || 'development'
    ).toLowerCase();

    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');
    const hasPlaceholderCredentials =
      !user ||
      !pass ||
      pass.includes('votre_') ||
      pass.includes('your_') ||
      pass.includes('16_caracteres');

    if (host && port && !hasPlaceholderCredentials) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
      });
      return;
    }

    this.logger.warn(
      'Configuration email absente ou incomplete, les emails seront affiches dans la console',
    );
  }

  async sendTemporaryPassword(
    to: string,
    nom: string,
    prenom: string,
    tempPassword: string,
  ): Promise<void> {
    const subject = 'CRM Batiment - Votre compte a ete cree';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Bienvenue sur CRM Batiment</h2>
        <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
        <p>Votre compte a ete cree par l'administrateur. Voici vos identifiants de connexion :</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email :</strong> ${to}</p>
          <p style="margin: 5px 0;"><strong>Mot de passe temporaire :</strong> <code style="background:#e9ecef; padding:4px 8px; border-radius:4px;">${tempPassword}</code></p>
        </div>
        <p style="color: #e74c3c;"><strong>Important :</strong> Vous devrez changer ce mot de passe lors de votre premiere connexion.</p>
        <p>Connectez-vous a l'adresse : <a href="${this.configService.get('APP_URL', 'http://localhost:5173')}">CRM Batiment</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">Cet email a ete envoye automatiquement. Ne repondez pas a ce message.</p>
      </div>
    `;

    await this.sendOrLog({
      to,
      subject,
      html,
      devLogs: [`Mot de passe temporaire : ${tempPassword}`],
    });
  }

  async sendDevisValidationEmail(
    payload: DevisValidationEmailPayload,
  ): Promise<void> {
    const subject = `Votre devis ${payload.devisReference} est pret a etre valide`;
    const totalFormatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(payload.totalTTC);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #0f172a;">
        <div style="padding: 28px; background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 20px 20px 0 0; color: white;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #cbd5e1;">${payload.companyName}</p>
          <h1 style="margin: 12px 0 0; font-size: 28px;">Validation de devis</h1>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 20px 20px; padding: 28px; background: #ffffff;">
          <p>Bonjour <strong>${payload.clientName}</strong>,</p>
          <p>Votre devis <strong>${payload.devisReference}</strong> est disponible pour validation.</p>
          <div style="margin: 24px 0; padding: 20px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px;"><strong>Reference :</strong> ${payload.devisReference}</p>
            <p style="margin: 0 0 8px;"><strong>Conseiller :</strong> ${payload.conseillerName}</p>
            <p style="margin: 0;"><strong>Montant TTC :</strong> ${totalFormatted}</p>
          </div>
          <p>Vous pouvez consulter le devis complet puis choisir de l'accepter ou de le refuser.</p>
          <div style="margin: 28px 0 18px;">
            <a href="${payload.validationUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #0f172a; color: white; text-decoration: none; font-weight: bold;">Voir le devis</a>
          </div>
          <div style="margin: 18px 0 0;">
            <a href="${payload.acceptUrl}" style="display: inline-block; margin-right: 12px; padding: 12px 18px; border-radius: 12px; background: #059669; color: white; text-decoration: none; font-weight: bold;">Accepter le devis</a>
            <a href="${payload.rejectUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #dc2626; color: white; text-decoration: none; font-weight: bold;">Refuser le devis</a>
          </div>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            Si les boutons ne s'affichent pas, utilisez ce lien :
            <a href="${payload.validationUrl}">${payload.validationUrl}</a>
          </p>
        </div>
      </div>
    `;

    await this.sendOrLog({
      to: payload.to,
      subject,
      html,
      devLogs: [
        `Voir devis   : ${payload.validationUrl}`,
        `Accepter     : ${payload.acceptUrl}`,
        `Refuser      : ${payload.rejectUrl}`,
      ],
    });
  }

  async sendSupplierOrderEmail(
    payload: SupplierOrderEmailPayload,
  ): Promise<void> {
    const subject = `Nouvelle commande fournisseur ${payload.reference}`;
    const linesHtml = payload.lines
      .map(
        (line) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${line.materiauNom}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${line.quantite} ${line.unite}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(line.prixUnitaire)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(line.totalHT)}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #0f172a;">
        <div style="padding: 28px; background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 20px 20px 0 0; color: white;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #cbd5e1;">${payload.companyName}</p>
          <h1 style="margin: 12px 0 0; font-size: 28px;">Commande fournisseur</h1>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 20px 20px; padding: 28px; background: #ffffff;">
          <p>Bonjour <strong>${payload.supplierName}</strong>,</p>
          <p>Une nouvelle commande fournisseur a ete generee automatiquement depuis le devis <strong>${payload.devisReference}</strong>.</p>
          <div style="margin: 20px 0; padding: 16px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <p style="margin: 0;"><strong>Reference commande :</strong> ${payload.reference}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #0f172a; color: white;">
                <th style="padding: 10px; text-align: left;">Materiau</th>
                <th style="padding: 10px; text-align: right;">Quantite</th>
                <th style="padding: 10px; text-align: right;">Prix U.</th>
                <th style="padding: 10px; text-align: right;">Total HT</th>
              </tr>
            </thead>
            <tbody>${linesHtml}</tbody>
          </table>
        </div>
      </div>
    `;

    await this.sendOrLog({
      to: payload.to,
      subject,
      html,
      devLogs: [
        `Commande fournisseur : ${payload.reference}`,
        ...payload.lines.map(
          (line) =>
            `${line.materiauNom} - ${line.quantite} ${line.unite} - ${new Intl.NumberFormat(
              'fr-FR',
              {
                style: 'currency',
                currency: 'EUR',
              },
            ).format(line.totalHT)}`,
        ),
      ],
    });
  }

  async sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void> {
    const subject = `Facture ${payload.invoiceReference}`;
    const amountFormatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(payload.amountTTC);

    const dueDateLabel = payload.dueDate
      ? new Date(payload.dueDate).toLocaleDateString('fr-FR')
      : 'A reception';

    const linesHtml = payload.lines
      .map(
        (line) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${line.description}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${line.quantite} ${line.unite}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(line.prixUnitaireHT)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${line.tauxTVA.toFixed(2)}%</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(line.montantHT)}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; color: #0f172a;">
        <div style="padding: 28px; background: linear-gradient(135deg, #0f172a, #1e293b); border-radius: 20px 20px 0 0; color: white;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #cbd5e1;">${payload.companyName}</p>
          <h1 style="margin: 12px 0 0; font-size: 28px;">Votre facture</h1>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 20px 20px; padding: 28px; background: #ffffff;">
          <p>Bonjour <strong>${payload.clientName}</strong>,</p>
          <p>Veuillez trouver ci-dessous les informations de votre facture.</p>
          <div style="margin: 18px 0; padding: 16px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 6px;"><strong>Facture:</strong> ${payload.invoiceReference}</p>
            <p style="margin: 0 0 6px;"><strong>Devis origine:</strong> ${payload.devisReference}</p>
            <p style="margin: 0 0 6px;"><strong>Montant TTC:</strong> ${amountFormatted}</p>
            <p style="margin: 0;"><strong>Echeance:</strong> ${dueDateLabel}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #0f172a; color: white;">
                <th style="padding: 10px; text-align: left;">Description</th>
                <th style="padding: 10px; text-align: right;">Quantite</th>
                <th style="padding: 10px; text-align: right;">PU HT</th>
                <th style="padding: 10px; text-align: right;">TVA</th>
                <th style="padding: 10px; text-align: right;">Total HT</th>
              </tr>
            </thead>
            <tbody>${linesHtml}</tbody>
          </table>

          ${
            payload.customMessage
              ? `<p style="margin-top: 20px; white-space: pre-line; color: #334155;"><strong>Message:</strong><br/>${payload.customMessage}</p>`
              : ''
          }
        </div>
      </div>
    `;

    await this.sendOrLog({
      to: payload.to,
      subject,
      html,
      devLogs: [
        `Facture: ${payload.invoiceReference}`,
        `Devis origine: ${payload.devisReference}`,
        `Montant TTC: ${amountFormatted}`,
      ],
    });
  }

  private async sendOrLog({
    to,
    subject,
    html,
    devLogs = [],
  }: {
    to: string;
    subject: string;
    html: string;
    devLogs?: string[];
  }) {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.configService.get(
            'MAIL_FROM',
            '"CRM Batiment" <noreply@crm-batiment.fr>',
          ),
          to,
          subject,
          html,
        });
        this.logger.log(`Email envoye a ${to}`);
        return;
      } catch (error) {
        if (this.appEnv === 'production') {
          throw error;
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Envoi email impossible (${message}). Email simule en mode developpement.`,
        );
      }
    }

    this.logger.log('===============================================');
    this.logger.log('EMAIL SIMULE (mode developpement)');
    this.logger.log(`Destinataire : ${to}`);
    this.logger.log(`Sujet        : ${subject}`);
    devLogs.forEach((line) => this.logger.log(line));
    this.logger.log('===============================================');
  }
}
