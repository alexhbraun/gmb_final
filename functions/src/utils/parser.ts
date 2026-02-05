import axios from 'axios';

/**
 * Resolves short Google Maps URLs to their final destination.
 */
export async function resolveUrl(url: string): Promise<string> {
  if (!url.includes('maps.app.goo.gl') && !url.includes('goo.gl/maps') && !url.includes('g.page')) {
    return url;
  }

  try {
    const response = await axios.get(url, {
      maxRedirects: 10,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    return response.request.res.responseUrl || url;
  } catch (error) {
    console.error('Error resolving URL:', error);
    return url;
  }
}

/**
 * Extracts a search query from a Google Maps URL.
 */
export function parseGmbUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // 1. Check for specific IDs first (Ludocid, CID, KGID)
    const ludocid = parsed.searchParams.get('ludocid');
    if (ludocid) return `ludocid:${ludocid}`;

    const cid = parsed.searchParams.get('cid');
    if (cid) return `cid:${cid}`;

    const kgmid = parsed.searchParams.get('kgmid');
    if (kgmid) return `kgmid:${kgmid}`;

    // 2. /maps/place/ format
    if (parsed.pathname.includes('/maps/place/')) {
      const parts = parsed.pathname.split('/');
      const placeIndex = parts.indexOf('place');
      if (placeIndex !== -1 && parts[placeIndex + 1]) {
        return decodeURIComponent(parts[placeIndex + 1].replace(/\+/g, ' '));
      }
    }

    // 3. Search queries (?q=, ?query=, /maps/search/)
    const q = parsed.searchParams.get('q') || parsed.searchParams.get('query');
    if (q) return q;

    if (parsed.pathname.includes('/maps/search/')) {
        const parts = parsed.pathname.split('/');
        const searchIndex = parts.indexOf('search');
        if (searchIndex !== -1 && parts[searchIndex + 1]) {
          return decodeURIComponent(parts[searchIndex + 1].replace(/\+/g, ' '));
        }
    }

    return null;
  } catch (error) {
    return null;
  }
}
