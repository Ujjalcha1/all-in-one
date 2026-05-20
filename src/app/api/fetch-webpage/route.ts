import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Verify protocol
    let formattedUrl = targetUrl;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log(`Fetching webpage: ${formattedUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second fetch timeout

    const response = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch webpage. Server returned HTTP ${response.status}` }, { status: 500 });
    }

    let htmlText = await response.text();

    // Inject base element in <head> to resolve all relative links and resource paths to the source domain
    const baseTag = `<base href="${formattedUrl}" />`;
    if (/<head[^>]*>/i.test(htmlText)) {
      htmlText = htmlText.replace(/<head[^>]*>/i, (match) => `${match}\n    ${baseTag}`);
    } else if (/<html[^>]*>/i.test(htmlText)) {
      htmlText = htmlText.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${baseTag}</head>`);
    } else {
      htmlText = `${baseTag}\n${htmlText}`;
    }

    return new NextResponse(htmlText, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error: any) {
    console.error("Webpage Fetch Error:", error);
    return NextResponse.json({ 
      error: "Failed to load webpage content.",
      details: error.message || String(error)
    }, { status: 500 });
  }
}
