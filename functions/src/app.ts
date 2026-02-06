import express from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import axios from 'axios';
import { resolveUrl, parseGmbUrl } from './utils/parser';
import { PlacesService } from './services/placesService';
import { GeminiService } from './services/geminiService';
import { CacheService } from './services/cacheService';
import { GridService } from './services/gridService';
import { PdfService } from './services/pdfService';
import { SerpApiRankingService } from './services/rankingService';
import { RankingService } from './services/rankingService';

const app = express();
// Enable CORS for all origins in development and production to resolve persistent fetch issues
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const placesKey = process.env.GOOGLE_PLACES_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';
const serpApiKey = process.env.SERPAPI_KEY || '';
const staticMapsKey = process.env.GOOGLE_STATIC_MAPS_KEY || placesKey;

const placesService = new PlacesService(placesKey);
const geminiService = new GeminiService(geminiKey);
const cacheService = new CacheService();
const rankingService: RankingService = new SerpApiRankingService(serpApiKey);
const gridService = new GridService(rankingService);
const pdfService = new PdfService();

// GET /history (Added for GMB II parity)
app.get('/history', async (req, res) => {
  try {
    const db = require('firebase-admin').firestore();
    const snapshot = await db.collection('reports')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const results = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        reportId: doc.id,
        name: data.normalizedPlace?.name || 'Unknown Business',
        overallScore: data.overallScore || 0,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
      };
    });
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /generate
app.post('/generate', async (req, res): Promise<any> => {
  try {
    const { gmbUrl, fallbackText, language = 'pt-BR', keyword } = req.body;
    // const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';

    /* 
    if (!(await cacheService.checkRateLimit(ip))) {
      return res.status(429).json({ errorCode: 'RATE_LIMITED', message: 'Too many requests. Try again later.' });
    }
    */

    let queryText = fallbackText;
    if (gmbUrl) {
      const finalUrl = await resolveUrl(gmbUrl);
      const parsed = parseGmbUrl(finalUrl);
      if (parsed) queryText = parsed;
      else if (!fallbackText) {
          // Attempt to extract at least something if parsing failed but it looks like a valid URL or search
          try {
              const urlObj = new URL(finalUrl);
              if (urlObj.pathname.includes('/maps/search/')) {
                  queryText = decodeURIComponent(urlObj.pathname.split('/maps/search/')[1].split('/')[0].replace(/\+/g, ' '));
              }
          } catch(e) {}
      }
    }

    if (!queryText || queryText.length < 3) {
      return res.status(400).json({ errorCode: 'URL_PARSE_FAILED', message: 'Could not parse URL. Please provide fallback text.' });
    }

    let placeId = await placesService.findPlaceFromText(queryText, language);
    
    if (!placeId) {
      console.log(`[DEBUG] findPlaceFromText failed for "${queryText}". Trying textSearch...`);
      placeId = await placesService.textSearch(queryText, language);
    }

    if (!placeId) {
      console.log(`[DEBUG] Both search methods failed for "${queryText}"`);
      return res.status(404).json({ errorCode: 'PLACE_NOT_FOUND', message: 'Business not found on Google Maps.' });
    }

    // Fetch Details (moved up to be available for keyword normalization)
    const details = await placesService.getPlaceDetails(placeId, language);
    if (!details) {
      return res.status(500).json({ errorCode: 'PLACE_DETAILS_FAILED', message: 'Failed to fetch business details.' });
    }

    // Fetched details are now available for keyword normalization
    const primaryCategory = details.types?.[0]?.replace(/_/g, ' ') || 'business';

    // Use queryText as the baseline for the keyword if not explicitly provided
    let normalizedKeyword = (keyword || queryText || primaryCategory).toLowerCase().trim();
    
    // If the keyword contains the business name, try to use just the search intent (category)
    // e.g., "padaria bell" -> "padaria" (if business is "Padaria Bell")
    try {
        const lowerName = details.name.toLowerCase();
        if (normalizedKeyword.includes(lowerName) && normalizedKeyword.length > lowerName.length) {
            normalizedKeyword = normalizedKeyword.replace(lowerName, '').trim();
        }
        // If keyword ended up being empty after stripping or is just the name, use category
        if (normalizedKeyword.length < 3 || normalizedKeyword === lowerName) {
            normalizedKeyword = primaryCategory;
        }
    } catch (e) {
        normalizedKeyword = primaryCategory;
    }

    console.log(`[DEBUG] Final Keyword for Audit & Grid: "${normalizedKeyword}" (Extracted from: ${queryText} | Category: ${primaryCategory})`);

    // Construct absolute URL for the image (needed for cache hit)
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host');
    const baseUrl = req.originalUrl.replace('/generate', ''); 
    const fullBaseUrl = `${protocol}://${host}${baseUrl}`;

    // Check Cache
    const cached = await cacheService.getCachedReport(placeId, language, normalizedKeyword);
    if (cached) {
      console.log(`[DEBUG] Cache hit for ${placeId} with keyword "${normalizedKeyword}"`);
      const keywordCandidates = Array.from(new Set([
        normalizedKeyword,
        primaryCategory,
        details.types?.[1]?.replace(/_/g, ' '),
        details.types?.[2]?.replace(/_/g, ' '),
      ])).filter(Boolean);

      return res.json({ 
        ...cached, 
        reportId: cached.id,
        keywordCandidates,
        visibilityImageUrl: `${fullBaseUrl}/report/${cached.id}/visibility.png`
      });
    }



    const normalizedPlace = {
      name: details.name,
      rating: details.rating || 0,
      reviewsCount: details.user_ratings_total || 0,
      address: details.formatted_address || '',
      phone: details.international_phone_number || null,
      website: details.website || null,
      googleMapsUrl: details.url || '',
      businessStatus: details.business_status || 'OPERATIONAL',
      categories: details.types || [],
      hours: details.opening_hours?.weekday_text || [],
      photosCount: details.photos?.length || 0,
      recentReviews: (details.reviews || []).slice(0, 5).map(r => ({
        rating: r.rating,
        text: r.text || '',
        relative_time_description: r.relative_time_description || '',
        author_name: r.author_name || 'Anonymous'
      }))
    };

    // Generate Audit
    const audit = await geminiService.generateAudit(normalizedPlace, language);
    if (!audit) {
      return res.status(500).json({ errorCode: 'GEMINI_FAILED', message: 'Audit generation failed.' });
    }

    // Generate Visibility Grid
    const visibilityGrid = await gridService.generateGrid(
      details.geometry.location,
      placeId,
      normalizedKeyword,
      language
    );

    const reportId = nanoid(21);
    const reportData = {
      id: reportId,
      placeId,
      language,
      keyword: normalizedKeyword,
      normalizedPlace,
      ...audit,
      visibilityGrid: {
        radiusMeters: 1000,
        points: visibilityGrid
      },
      businessLocation: details.geometry.location,
      status: 'completed' as const
    };

    await cacheService.saveReport(reportId, reportData);

    // Use already declared baseUrl and fullBaseUrl
    console.log('DEBUG: Generated Image URL:', `${fullBaseUrl}/report/${reportId}/visibility.png`);

    const keywordCandidates = Array.from(new Set([
      normalizedKeyword,
      primaryCategory,
      details.types?.[1]?.replace(/_/g, ' '),
      details.types?.[2]?.replace(/_/g, ' '),
    ])).filter(Boolean);

    return res.json({
      ...reportData,
      reportId,
      keywordCandidates,
      visibilityImageUrl: `${fullBaseUrl}/report/${reportId}/visibility.png`
    });
  } catch (error: any) {
    console.error('Crash in /generate:', error);
    return res.status(500).json({ 
      errorCode: 'INTERNAL_SERVER_ERROR', 
      message: error.message || 'An unexpected error occurred.' 
    });
  }
});

// GET /report?id=...
app.get('/report', async (req, res): Promise<any> => {
  const id = req.query.id as string;
  const report = await cacheService.getCachedReportById(id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  // Robustly get the base API path (e.g., /.../api) by removing the known route segment and everything after
  const protocol = req.secure ? 'https' : 'http';
  const baseUrl = req.originalUrl.split('/report')[0]; 
  const visibilityImageUrl = `${protocol}://${req.get('host')}${baseUrl}/report/${id}/visibility.png`;

  return res.json({ 
    ...report, 
    reportId: report.id,
    visibilityImageUrl 
  });
});

// GET /report/:id/pdf
app.get('/report/:id/pdf', async (req, res): Promise<any> => {
  const id = req.params.id;
  const report = await cacheService.getCachedReportById(id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  try {
    const pdfBuffer = await pdfService.generatePdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="gmb-audit-${id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF Error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// POST /report/:id/pdf (Accepts overrides for edited content)
app.post('/report/:id/pdf', async (req, res): Promise<any> => {
    const id = req.params.id;
    const body = req.body;
    let report = await cacheService.getCachedReportById(id);
    
    if (!report) {
        // If we don't have it in cache but they provided the full object, we can still generate
        if (body.normalizedPlace) {
            report = body;
        } else {
            return res.status(404).json({ message: 'Report not found and no data provided' });
        }
    }

    // Apply overrides from frontend editor
    const mergedReport = {
        ...report,
        ...body
    };

    try {
      const pdfBuffer = await pdfService.generatePdf(mergedReport);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="gmb-audit-${id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error('PDF Error:', err);
      return res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// GET /report/:id/visibility.png
app.get('/report/:id/visibility.png', async (req, res): Promise<any> => {
  const id = req.params.id;
  console.log(`DEBUG: [ImageEndpoint] Request for ID: "${id}"`);
  
  const report = await cacheService.getCachedReportById(id);
  console.log(`DEBUG: [ImageEndpoint] Report found: ${!!report}`);
  
  if (!report) {
    console.log(`DEBUG: [ImageEndpoint] Report not found in cache for ID: "${id}"`);
    return res.status(404).json({ message: 'Report not found' });
  }

  const { businessLocation, visibilityGrid } = report;
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  
  const markers = visibilityGrid.points.map((p: any) => {
    const color = p.bucket === 'TOP3' ? 'green' : p.bucket === 'TOP10' ? 'orange' : 'red';
    const label = p.label === '20+' ? 'X' : p.label;
    return `markers=color:${color}|label:${label}|${p.lat},${p.lng}`;
  }).join('&');

  // Use safer 600x300 size (becomes 1200x600 with scale=2)
  const staticMapUrl = `${baseUrl}?center=${businessLocation.lat},${businessLocation.lng}&zoom=15&size=600x300&scale=2&maptype=roadmap&markers=color:blue|label:B|${businessLocation.lat},${businessLocation.lng}&${markers}&key=${staticMapsKey}`;

  console.log('DEBUG: Fetching Static Map. Key Present:', !!staticMapsKey);

  try {
    const response = await axios.get(staticMapUrl, { responseType: 'arraybuffer' });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(response.data);
  } catch (error: any) {
    console.error('Static Map Error:', error.response?.data?.toString() || error.message);
    return res.status(500).send('Map error');
  }
});

export default app;
