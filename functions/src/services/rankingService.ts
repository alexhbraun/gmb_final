
export interface RankingResult {
  rank: number | null; // null if not in top N
  title: string;
  address: string;
}

export interface RankingService {
  /**
   * Performs a location-biased search to find the target business rank.
   */
  getRank(
    keyword: string, 
    lat: number, 
    lng: number, 
    targetPlaceId: string,
    language: string
  ): Promise<number | null>;
}

// Placeholder implementation for SerpApi
import axios from 'axios';

export class SerpApiRankingService implements RankingService {
  constructor(private apiKey: string) {}

  async getRank(
    keyword: string, 
    lat: number, 
    lng: number, 
    targetPlaceId: string,
    language: string
  ): Promise<number | null> {
    if (!this.apiKey) {
      console.warn('[RankingService] No SERPAPI_KEY provided. Returning mock data.');
      return Math.floor(Math.random() * 21); // Mock for structure setup
    }

    try {
      // https://serpapi.com/google-maps-search-api
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google_maps',
          q: keyword,
          ll: `@${lat},${lng},15z`, // 15z zoom
          hl: language.split('-')[0],
          gl: language.split('-')[1]?.toLowerCase() || 'br',
          type: 'search',
          api_key: this.apiKey
        }
      });

      const results = response.data.local_results || [];
      const index = results.findIndex((r: any) => r.place_id === targetPlaceId || r.title?.toLowerCase().includes('sample')); // Basic fuzzy fallback for now
      
      return index === -1 ? null : index + 1;
    } catch (error: any) {
      console.error('[RankingService] SerpApi error:', error.message);
      return null;
    }
  }
}
