import { RankingService } from './rankingService';

export interface GridPoint {
  id: string; // "i,j"
  i: number;
  j: number;
  lat: number;
  lng: number;
  rank: number | null;
  label: string;
  bucket: 'TOP3' | 'TOP10' | 'TOP20' | '20PLUS' | 'NA';
}

export class GridService {
  constructor(private rankingService: RankingService) {}

  async generateGrid(
    center: { lat: number; lng: number },
    targetPlaceId: string,
    keyword: string,
    language: string,
    radiusMeters: number = 1000,
    gridSize: number = 5
  ): Promise<GridPoint[]> {
    const stepMeters = (2 * radiusMeters) / (gridSize - 1);
    
    // Constants for degree to meter conversion
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(center.lat * (Math.PI / 180));

    const tasks = [];

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // Calculate offsets relative to center
        const offsetNorth = (radiusMeters - (i * stepMeters));
        const offsetEast = ((j * stepMeters) - radiusMeters);

        const lat = center.lat + (offsetNorth / metersPerDegreeLat);
        const lng = center.lng + (offsetEast / metersPerDegreeLng);

        tasks.push(this.getRankForPoint(i, j, lat, lng, targetPlaceId, keyword, language));
      }
    }

    return await Promise.all(tasks);
  }

  private async getRankForPoint(
    i: number,
    j: number,
    lat: number,
    lng: number,
    targetPlaceId: string,
    keyword: string,
    language: string
  ): Promise<GridPoint> {
    try {
      const rank = await this.rankingService.getRank(keyword, lat, lng, targetPlaceId, language);
      
      const label = rank === null ? 'NR' : rank > 20 ? '20+' : rank.toString();
      let bucket: GridPoint['bucket'] = '20PLUS';

      if (rank !== null && rank > 0) {
        if (rank <= 3) bucket = 'TOP3';
        else if (rank <= 10) bucket = 'TOP10';
        else if (rank <= 20) bucket = 'TOP20';
      } else {
        bucket = 'NA';
      }

      return { 
        id: `${i},${j}`, 
        i, j, 
        lat, lng, 
        rank, label, bucket 
      };
    } catch (error) {
      console.error(`[GridService] Error ranking point ${i},${j}:`, error);
      return { 
        id: `${i},${j}`, 
        i, j, 
        lat, lng, 
        rank: null, label: 'ERR', bucket: 'NA' 
      };
    }
  }
}
