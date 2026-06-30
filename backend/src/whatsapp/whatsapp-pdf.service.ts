import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class WhatsappPdfService {
  private readonly logger = new Logger(WhatsappPdfService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateDevisPdfBuffer(devisId: number, companyId: number): Promise<Buffer> {
    const devis = await this.prisma.devis.findFirst({
      where: { id: devisId, companyId },
      include: {
        client: true,
        company: true,
        lignes: { orderBy: { ordre: 'asc' }, include: { prestation: true } },
        createur: true,
      },
    });

    if (!devis) {
      throw new NotFoundException(`Devis #${devisId} introuvable`);
    }

    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer | Uint8Array) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(18).text(`Devis ${devis.reference}`, { align: 'center' });
    doc.moveDown();
    
    // Client Info
    doc.fontSize(12).text(`Client: ${devis.client.nom} ${devis.client.prenom || ''}`);
    if (devis.client.adresseClient) doc.fontSize(10).text(`Adresse: ${devis.client.adresseClient}`);
    
    doc.moveDown();
    
    // Lignes
    for (const ligne of devis.lignes) {
      doc.fontSize(10).text(`- ${ligne.description || 'Prestation'} | Qte: ${ligne.quantite} ${ligne.unite} | PU: ${ligne.prixUnitaireVente.toFixed(2)} | Total HT: ${ligne.totalHT.toFixed(2)}`);
    }

    doc.moveDown();
    doc.fontSize(12).text(`Total TTC: ${devis.totalTTC.toFixed(2)} EUR`, { align: 'right' });

    doc.end();
    return bufferPromise;
  }

  async generateFacturePdfBuffer(factureId: number, companyId: number): Promise<Buffer> {
    const facture = await this.prisma.facture.findFirst({
      where: { id: factureId, devis: { companyId } },
      include: {
        lignes: { orderBy: { ordre: 'asc' } },
        devis: { include: { client: true, company: true } },
      },
    });

    if (!facture) {
      throw new NotFoundException(`Facture #${factureId} introuvable`);
    }

    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer | Uint8Array) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(18).text(`Facture ${facture.reference}`, { align: 'center' });
    doc.moveDown();
    
    // Client Info
    doc.fontSize(12).text(`Client: ${facture.nomClient || facture.devis.client.nom}`);
    if (facture.adresseClient) doc.fontSize(10).text(`Adresse: ${facture.adresseClient}`);
    
    doc.moveDown();
    
    // Lignes
    for (const ligne of facture.lignes) {
      doc.fontSize(10).text(`- ${ligne.description} | Qte: ${ligne.quantite} ${ligne.unite} | PU HT: ${ligne.prixUnitaireHT.toFixed(2)} | Montant TTC: ${ligne.montantTTC.toFixed(2)}`);
    }

    doc.moveDown();
    doc.fontSize(12).text(`Total TTC: ${facture.montantTTC.toFixed(2)} EUR`, { align: 'right' });

    doc.end();
    return bufferPromise;
  }
}
