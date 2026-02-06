import puppeteer from 'puppeteer';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export class PdfService {
  async generatePdf(report: any): Promise<Buffer> {
    const html = await this.buildHtml(report);
    
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new',
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private async buildHtml(report: any): Promise<string> {
    const reportHtml = purify.sanitize(await marked.parse(report.reportMarkdown));
    const date = new Date().toLocaleDateString('pt-BR');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Gochi+Hand&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; 
            color: #334155; 
            line-height: 1.75; 
            margin: 0; 
            padding: 50px 60px;
            background: #ffffff;
            position: relative;
          }
          
          /* Watermark removed as per new supportive tone guidelines */

          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 60px; 
          }
          .logo { height: 50px; width: auto; }
          .report-meta { text-align: right; }
          .report-type { 
            font-size: 11px; 
            text-transform: uppercase; 
            letter-spacing: 0.1em; 
            color: #94a3b8; 
            font-weight: 700;
          }
          .report-date { font-size: 13px; color: #64748b; }

          .brand-divider { 
            height: 3px; 
            background: #d7b27e; 
            margin: 20px 0 40px 0; 
            border-radius: 2px;
          }

          /* Advisor Notes / Handwritten */
          .advisor-note {
            font-family: 'Gochi Hand', cursive;
            background: rgba(254, 240, 138, 0.4); /* soft highlighter yellow */
            padding: 24px 32px;
            margin: 40px 0;
            border-left: 4px solid #d7b27e;
            font-size: 18px;
            color: #1e293b;
            border-radius: 4px;
            transform: rotate(-0.5deg);
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .hero-section { 
            display: grid; 
            grid-template-columns: 1fr 2fr; 
            gap: 40px; 
            margin-bottom: 80px; 
          }
          
          .score-card { 
            background: #f8fafc; 
            border: 1px solid #f1f5f9; 
            padding: 40px 20px; 
            border-radius: 32px; 
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .score-value { 
            font-size: 84px; 
            font-weight: 800; 
            color: #0f172a; 
            line-height: 1; 
            margin-bottom: 5px;
          }
          .score-max { font-size: 18px; color: #94a3b8; font-weight: 600; }
          .score-label { 
            font-size: 12px; 
            color: #64748b; 
            text-transform: uppercase; 
            letter-spacing: 0.1em; 
            margin-top: 15px;
            font-weight: 700;
          }

          .business-info { padding-top: 10px; }
          .business-name { 
            font-size: 32px; 
            font-weight: 800; 
            color: #0f172a; 
            line-height: 1.2;
            margin-bottom: 8px;
          }
          .business-address { font-size: 14px; color: #64748b; margin-bottom: 25px; }

          .metrics-grid { 
            display: grid; 
            grid-template-columns: 1fr; 
            gap: 15px; 
          }
          .metric-box { 
            background: #ffffff; 
            border: 1px solid #f1f5f9; 
            padding: 15px 20px; 
            border-radius: 16px; 
          }
          .metric-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
          .metric-value { font-size: 14px; font-weight: 700; color: #334155; }

          .markdown-content { margin-top: 60px; }
          .markdown-content h1, .markdown-content h2 { 
            font-size: 24px; 
            color: #0f172a; 
            margin-top: 48px; 
            margin-bottom: 32px;
            display: flex;
            align-items: center;
          }
          .markdown-content h1::before, .markdown-content h2::before {
            content: "";
            display: inline-block;
            width: 4px;
            height: 24px;
            background: #d7b27e;
            margin-right: 12px;
            border-radius: 2px;
          }
          .markdown-content h3 { font-size: 18px; color: #1e293b; margin-top: 32px; margin-bottom: 20px; }
          .markdown-content p { font-size: 14px; color: #475569; margin-bottom: 24px; }
          .markdown-content li { font-size: 14px; color: #475569; margin-bottom: 20px; }
          .markdown-content strong { color: #0f172a; font-weight: 700; }

          .signature-container {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-top: 20px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .signature-photo {
            height: 60px;
            width: 60px;
            border-radius: 50%;
            object-fit: cover;
            object-position: center 15%;
            border: 2px solid #f1f5f9;
          }
          .signature-info {
            display: flex;
            flex-direction: column;
            line-height: 1.4;
          }
          .signature-info strong {
            font-size: 16px;
            color: #0f172a;
          }
          .signature-info span {
            font-size: 13px;
            color: #64748b;
          }
          .signature-brand {
            font-weight: 700;
            color: #d7b27e !important;
          }
          
          /* Prevent signature and key blocks from breaking across pages */
          .markdown-content h1, .markdown-content h2, .markdown-content h3 { page-break-after: avoid; }
          .markdown-content p:has(img), .markdown-content p:last-child { page-break-inside: avoid; break-inside: avoid; }

          .footer { 
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 60px; 
            padding-top: 30px; 
            border-top: 1px solid #f1f5f9; 
            font-size: 11px; 
            color: #94a3b8; 
            display: flex; 
            justify-content: space-between;
          }
          .footer-brand { font-weight: 700; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://ik.imagekit.io/rgqefde41/Gemini_Generated_Image_xxxfi3xxxfi3xxxf.png?updatedAt=1770123148703" class="logo" />
          <div class="report-meta">
            <div class="report-type">Estratégia de Posicionamento Local</div>
            <div class="report-date">${date}</div>
          </div>
        </div>

        <div class="brand-divider"></div>

        <div class="hero-section">
          <div class="score-card">
            <div class="score-value">
              ${report.overallScore}<span class="score-max">/100</span>
            </div>
            <div class="score-label">Pontuação de Visibilidade</div>
          </div>
          
          <div class="business-info">
            <div class="business-name">${report.normalizedPlace.name}</div>
            <div class="business-address">${report.normalizedPlace.address}</div>
            
            <div class="metrics-grid">
              <div className="metric-box">
                <div className="metric-label">Nota Google</div>
                <div className="metric-value">★ ${report.normalizedPlace.rating || 'N/A'}</div>
              </div>
              <div className="metric-box">
                <div className="metric-label">Total Avaliações</div>
                <div className="metric-value">${report.normalizedPlace.reviewsCount}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="markdown-content">
          ${reportHtml}
        </div>

        <div class="footer">
          <div>Nexo Estratégia Digital</div>
          <div>Relatório gerado a partir de dados públicos do Google Maps.</div>
        </div>
      </body>
      <html>
    `;
  }
}
