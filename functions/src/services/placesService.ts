import axios from 'axios';

const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

export interface PlaceDetails {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_address?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  business_status?: string;
  types?: string[];
  opening_hours?: {
    weekday_text?: string[];
  };
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: any[];
  reviews?: any[];
}

export class PlacesService {
  constructor(private apiKey: string) {}

  async findPlaceFromText(query: string, language: string = 'en'): Promise<string | null> {
    const response = await axios.get(`${PLACES_API_URL}/findplacefromtext/json`, {
      params: {
        input: query,
        inputtype: 'textquery',
        fields: 'place_id,name,formatted_address',
        language,
        key: this.apiKey,
      },
    });

    const candidates = response.data.candidates;
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error(`[GOOGLE_API_ERROR] findPlaceFromText status: ${response.data.status}`, response.data.error_message);
    }
    return candidates && candidates.length > 0 ? candidates[0].place_id : null;
  }

  async getPlaceDetails(placeId: string, language: string = 'en'): Promise<PlaceDetails | null> {
    const response = await axios.get(`${PLACES_API_URL}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'name,rating,user_ratings_total,formatted_address,international_phone_number,website,url,opening_hours,business_status,types,photos,reviews,geometry',
        language,
        key: this.apiKey,
      },
    });

    return response.data.result || null;
  }

  async textSearch(query: string, language: string = 'en'): Promise<string | null> {
    const response = await axios.get(`${PLACES_API_URL}/textsearch/json`, {
      params: {
        query,
        language,
        key: this.apiKey,
      },
    });

    const results = response.data.results;
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error(`[GOOGLE_API_ERROR] textSearch status: ${response.data.status}`, response.data.error_message);
    }
    return results && results.length > 0 ? results[0].place_id : null;
  }

  async nearbySearch(location: { lat: number; lng: number }, keyword: string, language: string = 'en'): Promise<any[]> {
    let results: any[] = [];
    let nextPageToken: string | undefined;

    // We'll fetch up to 3 pages to find the business
    for (let i = 0; i < 3; i++) {
      const response = await axios.get(`${PLACES_API_URL}/nearbysearch/json`, {
        params: {
          location: `${location.lat},${location.lng}`,
          rankby: 'distance',
          keyword,
          language,
          key: this.apiKey,
          pagetoken: nextPageToken,
        },
      });

      results = [...results, ...(response.data.results || [])];
      nextPageToken = response.data.next_page_token;

      if (!nextPageToken) break;
      // Google requires a small delay before the next_page_token is valid
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  }
}
