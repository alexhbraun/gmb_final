'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [fallbackText, setFallbackText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Fetch History on Mount
  useEffect(() => {
    const fetchHistory = async () => {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5099/gmb-audit-generator/us-central1/api';
            const apiUrl = `${baseUrl}/history`;
            
            const res = await fetch(apiUrl);
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (e) {
            console.error('Failed to fetch history', e);
        }
    };
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5099/gmb-audit-generator/us-central1/api';
    const apiUrl = `${baseUrl}/generate`;
    console.log('Submitting to:', apiUrl);

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmbUrl: url,
          fallbackText: fallbackText || undefined,
          language: 'pt-BR'
        }),
      });

      const responseText = await res.text();
      console.log('Raw API Response:', responseText);

      let data;
      try {
          data = JSON.parse(responseText);
      } catch (jsonError) {
          throw new Error('Invalid JSON response from server: ' + responseText.substring(0, 100));
      }

      if (!res.ok) {
        console.error('API Error:', data);
        if (data.errorCode === 'URL_PARSE_FAILED') {
            setShowFallback(true);
            throw new Error('Não foi possível identificar a URL automaticamente. Por favor, insira o Nome e a Cidade abaixo.');
        }
        // Show specific backend message if available
        throw new Error(data.message || data.errorCode || 'Algo deu errado no servidor');
      }

      // Success
      if (!data.reportId) {
          throw new Error('API returned success but missing reportId');
      }

      console.log('Navigating to:', `/r/${data.reportId}`);
      router.push(`/r/${data.reportId}`);

    } catch (err: any) {
      console.error('Catch Error:', err);
      setError(err.message);
      // alert('Error: ' + err.message); // Force visibility
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Gerador de Auditoria GMB</h1>
          <p className="mt-2 text-gray-600">Insira um link do Google Maps para gerar um relatório completo de auditoria.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="sr-only">URL do Google Maps</label>
              <input
                id="url"
                name="url"
                type="url"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Cole o link do Google Maps ou Perfil da Empresa"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            {showFallback && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label htmlFor="fallback" className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa + Cidade</label>
                <input
                  id="fallback"
                  name="fallback"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="ex: Pizzaria do João, São Paulo"
                  value={fallbackText}
                  onChange={(e) => setFallbackText(e.target.value)}
                />
                <p className="text-xs text-yellow-600 mt-1">Não conseguimos extrair a busca da URL. Por favor, forneça os detalhes manualmente.</p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Erro</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Gerando Auditoria...
                </>
              ) : (
                'Gerar Auditoria'
              )}
            </button>
          </div>
        </form>

        {/* History Section */}
        {history.length > 0 && (
            <div className="mt-12 border-t pt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas Auditorias</h2>
                <div className="space-y-3">
                    {history.map((item) => (
                        <Link key={item.reportId} href={`/r/${item.reportId}`} className="block group">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 group-hover:border-blue-300 transition-colors">
                                <div>
                                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                    <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className={`text-sm font-bold ${item.overallScore >= 70 ? 'text-green-600' : item.overallScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {item.overallScore}/100
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div className="mt-8 text-xs text-gray-400 text-center max-w-xs">
        Baseado em dados públicos do Google Maps. 100% automatizado com IA Gemini.
      </div>
    </main>
  );
}
