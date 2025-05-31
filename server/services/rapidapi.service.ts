export async function humanizeContent(content: string): Promise<string> {
  try {
    if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_HOST) {
      console.warn('RapidAPI credentials not configured, skipping humanization');
      return content;
    }

    const response = await fetch('https://api.rapidapi.com/humanize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
      },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      console.warn(`Humanization service returned ${response.status}, using original content`);
      return content;
    }

    const data = await response.json();
    return data.humanizedText || content;
  } catch (error) {
    console.error('Humanization failed:', error);
    // Fall back to original content if humanization fails
    return content;
  }
}
