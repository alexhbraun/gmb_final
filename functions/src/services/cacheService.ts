import * as admin from 'firebase-admin';
import { Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

export interface ReportDoc {
  id: string;
  createdAt: Timestamp | FieldValue;
  placeId: string;
  language: string;
  keyword: string;
  normalizedPlace: any;
  overallScore: number;
  subscores: any;
  whatsappTeaser: string;
  reportMarkdown: string;
  visibilityGrid: any;
  businessLocation: { lat: number; lng: number };
  status: 'completed' | 'failed';
}

export class CacheService {
  private _db: Firestore | undefined;

  private get db(): Firestore {
    if (!this._db) {
      this._db = admin.firestore();
      this._db.settings({ ignoreUndefinedProperties: true });
    }
    return this._db;
  }

  constructor() {}

  async getCachedReport(placeId: string, language: string, keyword: string): Promise<ReportDoc | null> {
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const snapshot = await this.db.collection('reports')
      .where('placeId', '==', placeId)
      .where('language', '==', language)
      .where('keyword', '==', keyword)
      .where('status', '==', 'completed')
      .where('createdAt', '>', sevenDaysAgo)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ReportDoc;
  }

  async getCachedReportById(id: string): Promise<ReportDoc | null> {
    const doc = await this.db.collection('reports').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as ReportDoc;
  }

  async saveReport(id: string, data: Partial<ReportDoc>): Promise<void> {
    await this.db.collection('reports').doc(id).set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  async checkRateLimit(ip: string): Promise<boolean> {
    const hourBucket = new Date().toISOString().substring(0, 13); // YYYY-MM-DDTHH
    const limitDoc = await this.db.collection('rateLimits').doc(`${ip}_${hourBucket}`).get();

    if (!limitDoc.exists) {
      await limitDoc.ref.set({ count: 1 });
      return true;
    }

    const count = (limitDoc.data()?.count || 0) + 1;
    if (count > 10) return false;

    await limitDoc.ref.update({ count });
    return true;
  }
}
