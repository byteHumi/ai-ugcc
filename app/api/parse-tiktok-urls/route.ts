import { NextRequest, NextResponse } from 'next/server';

// TikTok URL patterns
const TIKTOK_PATTERNS = [
  /https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/gi,
  /https?:\/\/(vm|vt)\.tiktok\.com\/[\w]+/gi,
  /https?:\/\/(www\.)?tiktok\.com\/t\/[\w]+/gi,
];

/**
 * Extract valid TikTok URLs from text
 */
function extractTikTokUrls(text: string): { urls: string[]; invalid: string[] } {
  const urls: string[] = [];
  const invalid: string[] = [];

  // Split by common delimiters
  const lines = text.split(/[\n\r,;]+/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    // Check if line matches any TikTok pattern
    let matched = false;

    for (const pattern of TIKTOK_PATTERNS) {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      const matches = line.match(pattern);
      if (matches) {
        urls.push(...matches);
        matched = true;
        break;
      }
    }

    // If line looks like a URL but didn't match TikTok patterns
    if (!matched && line.startsWith('http')) {
      invalid.push(line);
    }
  }

  return { urls, invalid };
}

/**
 * Parse CSV content for TikTok URLs
 * Expects first column to contain URLs, or a column named 'url', 'tiktok', or 'link'
 */
function parseCSV(content: string): { urls: string[]; invalid: string[] } {
  const lines = content.split(/[\n\r]+/).filter(Boolean);
  if (lines.length === 0) return { urls: [], invalid: [] };

  // Check for header row
  const firstLine = lines[0].toLowerCase();
  let urlColumnIndex = 0;

  if (firstLine.includes(',')) {
    const headers = firstLine.split(',').map((h) => h.trim());
    const urlHeaders = ['url', 'tiktok', 'link', 'tiktok_url', 'video_url'];
    for (let i = 0; i < headers.length; i++) {
      if (urlHeaders.some((h) => headers[i].includes(h))) {
        urlColumnIndex = i;
        break;
      }
    }
    // Skip header row if detected
    if (urlHeaders.some((h) => firstLine.includes(h))) {
      lines.shift();
    }
  }

  const urls: string[] = [];
  const invalid: string[] = [];

  for (const line of lines) {
    const columns = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const potentialUrl = columns[urlColumnIndex];

    if (potentialUrl) {
      const result = extractTikTokUrls(potentialUrl);
      urls.push(...result.urls);
      invalid.push(...result.invalid);
    }
  }

  return { urls, invalid };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let urls: string[] = [];
    let invalid: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle CSV file upload
      const formData = await request.formData();
      const file = formData.get('csv') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No CSV file uploaded' }, { status: 400 });
      }

      const content = await file.text();
      const result = parseCSV(content);
      urls = result.urls;
      invalid = result.invalid;
    } else {
      // Handle JSON body with text
      const body = await request.json();
      const { text } = body as { text?: string };

      if (!text) {
        return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
      }

      const result = extractTikTokUrls(text);
      urls = result.urls;
      invalid = result.invalid;
    }

    // Remove duplicates
    const uniqueUrls = [...new Set(urls)];
    const duplicates = urls.length - uniqueUrls.length;

    return NextResponse.json({
      urls: uniqueUrls,
      count: uniqueUrls.length,
      duplicates,
      invalid,
    });
  } catch (err) {
    console.error('Parse TikTok URLs error:', err);
    return NextResponse.json({ error: 'Failed to parse URLs' }, { status: 500 });
  }
}
