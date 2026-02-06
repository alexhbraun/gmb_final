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
            line-height: 1.6; 
            margin: 0; 
            padding: 40px;
            background: #ffffff;
            position: relative;
          }
          
          /* Watermark */
          body::before {
            content: "CONFIDENCIAL - DIAGNÓSTICO ESTRATÉGICO";
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 40px;
            font-weight: 900;
            color: rgba(15, 23, 42, 0.03);
            white-space: nowrap;
            z-index: -1;
            width: 100%;
            text-align: center;
          }

          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 40px; 
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
            background: linear-gradient(to right, #0f172a, #334155); 
            margin: 20px 0 40px 0; 
            border-radius: 2px;
          }

          /* Advisor Notes / Handwritten */
          .advisor-note {
            font-family: 'Gochi Hand', cursive;
            background: rgba(254, 240, 138, 0.4); /* soft highlighter yellow */
            padding: 15px 25px;
            margin: 30px 0;
            border-left: 4px solid #eab308;
            font-size: 18px;
            color: #1e293b;
            border-radius: 2px;
            transform: rotate(-0.5deg);
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .hero-section { 
            display: grid; 
            grid-template-columns: 1fr 2fr; 
            gap: 40px; 
            margin-bottom: 50px; 
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
            font-size: 72px; 
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
            grid-template-columns: 1fr 1fr; 
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

          .markdown-content { margin-top: 40px; }
          .markdown-content h1, .markdown-content h2 { 
            font-size: 20px; 
            color: #0f172a; 
            margin-top: 45px; 
            margin-bottom: 20px;
            display: flex;
            align-items: center;
          }
          .markdown-content h1::before, .markdown-content h2::before {
            content: "";
            display: inline-block;
            width: 4px;
            height: 20px;
            background: #0f172a;
            margin-right: 12px;
            border-radius: 2px;
          }
          .markdown-content h3 { font-size: 16px; color: #1e293b; margin-top: 30px; }
          .markdown-content p { font-size: 14px; color: #475569; margin-bottom: 16px; }
          .markdown-content li { font-size: 14px; color: #475569; margin-bottom: 8px; }
          
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
              <div class="metric-box">
                <div class="metric-label">Nota Google</div>
                <div class="metric-value">★ ${report.normalizedPlace.rating || 'N/A'}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Total Avaliações</div>
                <div class="metric-value">${report.normalizedPlace.reviewsCount}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Website</div>
                <div class="metric-value">${report.normalizedPlace.website ? 'Configurado' : 'Pendente'}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Status do Perfil</div>
                <div class="metric-value">${report.normalizedPlace.businessStatus}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="markdown-content">
          ${reportHtml}
        </div>

        <div class="footer">
          <div><span class="footer-brand">Alexander Braun</span> • Nexo Estratégia Digital</div>
          <div>Auditoria baseada em dados públicos do Google Maps.</div>
        </div>
      </body>
      <html>
    `;
  }
}
