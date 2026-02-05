import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as logger from 'firebase-functions/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { AUDIT_SYSTEM_PROMPT as systemPrompt } from './prompts/auditPrompt';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

interface GenerateRequest {
  gmbUrl: string;
  fallbackText?: string;
  language?: 'pt-BR' | 'en-US';
}

// Helper to fetch JSON
async function fetchJson(url: string, method: 'GET' | 'POST' = 'GET', body?: any, fieldMask?: string) {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  const headers: any = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey, 
  };
  
  if (fieldMask) {
    headers['X-Goog-FieldMask'] = fieldMask;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    logger.error('Google Places API Error:', JSON.stringify(data, null, 2));
    throw new Error(`Fetch failed: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
  }
  return data;
}

// 1. Resolve Place ID from URL or Fallback
async function resolvePlaceId(gmbUrl: string, fallbackText?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_PLACES_KEY');

  let searchQuery = '';

  // Try to parse URL
  try {
    const urlObj = new URL(gmbUrl);
    if (urlObj.pathname.includes('/maps/place/')) {
       // Extract raw name from path
       const parts = urlObj.pathname.split('/maps/place/');
       if (parts[1]) {
         searchQuery = parts[1].split('/')[0].replace(/\+/g, ' ');
       }
    } else if (urlObj.searchParams.get('q')) {
      searchQuery = urlObj.searchParams.get('q') || '';
    } else if (urlObj.searchParams.get('query')) {
        searchQuery = urlObj.searchParams.get('query') || '';
    }
  } catch (e) {
    logger.warn('URL parsing failed', e);
  }

  // Use fallback if extraction failed
  if ((!searchQuery || searchQuery.length < 3) && fallbackText) {
    searchQuery = fallbackText;
  }

  if (!searchQuery) {
    throw new Error('URL_PARSE_FAILED: Could not extract query from URL and no fallback provided.');
  }

  searchQuery = decodeURIComponent(searchQuery);

  // Call Text Search (New)
  // https://places.googleapis.com/v1/places:searchText
  const findUrl = `https://places.googleapis.com/v1/places:searchText`;
  
  const data = await fetchJson(findUrl, 'POST', {
    textQuery: searchQuery
  }, 'places.id,places.name');

  if (!data.places || data.places.length === 0) {
    logger.error('Google Places API Error (Zero Results):', JSON.stringify(data, null, 2));
    throw new Error(`PLACE_NOT_FOUND: Could not find place from query: ${searchQuery}`);
  }

  return data.places[0].id;
}

// 2. Fetch Place Details
async function fetchPlaceDetails(placeId: string) {
  // https://places.googleapis.com/v1/places/{placeId}
  const fields = [
    'id',
    'name',
    'displayName',
    'rating',
    'userRatingCount',
    'formattedAddress',
    'internationalPhoneNumber',
    'websiteUri',
    'googleMapsUri',
    'regularOpeningHours',
    'businessStatus',
    'types',
    'photos',
    'reviews'
  ].join(',');

  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=en`;
  
  const data = await fetchJson(url, 'GET', undefined, fields);
  
  if (!data.name && !data.displayName) { 
     // Truncate error message to avoid flooding UI
     const errorStr = JSON.stringify(data).substring(0, 200) + '...';
     throw new Error('PLACE_DETAILS_FAILED: ' + errorStr);
  }
  return data;
}

// 3. Normalize Data
function normalizePlaceData(place: any) {
  return {
    name: place.displayName ? place.displayName.text : 'Unknown Business',
    rating: place.rating || 0,
    reviewsCount: place.userRatingCount || 0,
    address: place.formattedAddress || '',
    phone: place.internationalPhoneNumber || '',
    website: place.websiteUri || '',
    googleMapsUrl: place.googleMapsUri || '',
    businessStatus: place.businessStatus || '',
    categories: place.types || [],
    hours: place.regularOpeningHours ? place.regularOpeningHours.weekdayDescriptions : [],
    photosCount: place.photos ? place.photos.length : 0,
    recentReviews: place.reviews ? place.reviews.slice(0, 5).map((r: any) => ({
      rating: r.rating,
      text: r.text ? r.text.text : (r.originalText ? r.originalText.text : ''),
      time: r.relativePublishTimeDescription,
      author: r.authorAttribution ? r.authorAttribution.displayName : 'Unknown'
    })) : []
  };
}

// 4. Generate Audit with Gemini
async function generateAuditContent(placeData: any, language: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: { responseMimeType: "application/json" } });

  const prompt = `
    ${systemPrompt}
    
    LANGUAGE: ${language}
    
    PLACE DATA:
    ${JSON.stringify(placeData, null, 2)}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    // Clean up potential markdown code blocks (```json ... ```)
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const json = JSON.parse(cleanText);

    // Enforce Scoring Limits (Defensive Coding)
    if (json.subscores) {
      const keys = ['completeness', 'trust', 'conversion', 'media', 'localSeo'];
      let calcTotal = 0;
      
      keys.forEach(key => {
        let val = typeof json.subscores[key] === 'number' ? json.subscores[key] : 0;
        // Clamp 0-20
        if (val < 0) val = 0;
        if (val > 20) val = 20;
        
        json.subscores[key] = val;
        calcTotal += val;
      });

      // Override overall score with calculated sum (max 100)
      json.overallScore = Math.min(100, Math.max(0, calcTotal));
    }

    return json;
  } catch (e) {
    logger.error('Gemini JSON parse failed', text);
    throw new Error('GEMINI_FAILED: Invalid JSON response');
  }
}

// Main Logic
export async function generateReport(data: GenerateRequest) {
  const { gmbUrl, fallbackText, language = 'pt-BR' } = data;

  // 1. Check for existing recent report (Cache)
  // Need to resolve Place ID first to check cache, or check by URL (unreliable).
  // Let's resolve Place ID first.
  
  const placeId = await resolvePlaceId(gmbUrl, fallbackText);
  
  // Check Cache
  const recentThreshold = new Date();
  recentThreshold.setDate(recentThreshold.getDate() - 7);
  
  const existingQuery = await db.collection('reports')
    .where('placeId', '==', placeId)
    .where('createdAt', '>=', recentThreshold)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    // const doc = existingQuery.docs[0];
    // const data = doc.data(); 
    // FORCE REFRESH: Ignore cache to test new prompt
    // return { 
    //   reportId: doc.id, 
    //   ...data, 
    //   createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    //   cached: true 
    // };
  }

  // 2. Fetch and Generate
  const placeDetails = await fetchPlaceDetails(placeId);
  const normalizedPlace = normalizePlaceData(placeDetails);
  
  const auditResult = await generateAuditContent(normalizedPlace, language);
  
  // 3. Save to Firestore
  const reportPayload = {
    createdAt: FieldValue.serverTimestamp(),
    gmbUrl,
    language,
    placeId,
    normalizedPlace,
    ...auditResult,
    status: 'completed'
  };
  
  const docRef = await db.collection('reports').add(reportPayload);
  
  // Return ISO string for the immediate response (serverTimestamp is an object)
  return { reportId: docRef.id, ...reportPayload, createdAt: new Date().toISOString() };
}

export async function getReport(reportId: string) {
  const doc = await db.collection('reports').doc(reportId).get();
  if (!doc.exists) {
    throw new Error('REPORT_NOT_FOUND');
  }
  
  const data = doc.data() as any;
  
  return { 
    reportId: doc.id, 
    ...data,
    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString() 
  };
}

export async function getRecentReports() {
  const snapshot = await db.collection('reports')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      reportId: doc.id,
      name: data.normalizedPlace?.name || 'Unknown Business',
      overallScore: data.overallScore || 0,
      createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
    };
  });
}
