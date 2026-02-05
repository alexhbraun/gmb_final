'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ReportDisplay } from '@/components/ReportDisplay';

interface ReportData {
  id: string;
  reportId: string;
  normalizedPlace: any;
  overallScore: number;
  subscores: any;
  whatsappTeaser: string;
  reportMarkdown: string;
  createdAt: string;
  visibilityImageUrl: string;
  keyword: string;
}

export default function ReportPage() {
  const params = useParams();
  const reportId = params.reportId as string;
  
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5099/gmb-audit-generator/us-central1/api';
        const res = await fetch(`${apiBase}/report?id=${reportId}`);
        if (!res.ok) throw new Error('Relatório não encontrado');
        
        const json = await res.json();
        // Backend returns visibilityImageUrl as /api/report/...
        // We need to absolute-ize it if it's relative
        if (json.visibilityImageUrl && json.visibilityImageUrl.startsWith('/')) {
            json.visibilityImageUrl = `${apiBase}${json.visibilityImageUrl}`;
        }

        setData(json);
        document.title = `Relatório GMB - ${json.normalizedPlace.name}`;
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-red-600 font-medium">Erro ao carregar relatório: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow print:hidden">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">
            Audit Generator
          </h1>
          <div className="text-sm text-gray-500">
            {new Date(data.createdAt).toLocaleDateString()}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <ReportDisplay report={data} />
      </main>
    </div>
  );
}
