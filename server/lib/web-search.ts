interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export async function web_search(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`https://api.serper.dev/search`, {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: 10 // Get top 10 results
      })
    });

    if (!response.ok) {
      throw new Error(`Search API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform the response into our SearchResult format
    return data.organic.map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet
    }));
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
} 