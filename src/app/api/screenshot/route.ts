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

    console.log(`Fetching screenshot for URL: ${formattedUrl}`);

    // Call the high-speed website screenshot capture service thum.io
    const screenshotServiceUrl = `https://image.thum.io/get/width/1280/crop/1000/${formattedUrl}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(screenshotServiceUrl, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to capture screenshot from service. HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      }
    });

  } catch (error: any) {
    console.error("Screenshot API Error:", error);
    
    // In case of timeout or failure, return a clean fallback SVG placeholder image 
    // simulating a premium browser window to keep the client working!
    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#f8fafc" />
        <rect width="800" height="50" fill="#f1f5f9" />
        <circle cx="20" cy="25" r="6" fill="#ef4444" />
        <circle cx="40" cy="25" r="6" fill="#f59e0b" />
        <circle cx="60" cy="25" r="6" fill="#22c55e" />
        <rect x="90" y="15" width="600" height="20" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
        <text x="300" y="29" font-family="sans-serif" font-size="11" fill="#64748b">Secure Web Capture</text>
        <rect x="50" y="100" width="700" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" />
        <rect x="80" y="130" width="200" height="30" rx="6" fill="#f1f5f9" />
        <rect x="80" y="180" width="600" height="15" rx="3" fill="#f1f5f9" />
        <rect x="80" y="210" width="500" height="15" rx="3" fill="#f1f5f9" />
        <rect x="80" y="240" width="540" height="15" rx="3" fill="#f1f5f9" />
      </svg>
    `.trim();

    return new NextResponse(fallbackSvg, {
      headers: {
        "Content-Type": "image/svg+xml",
      }
    });
  }
}
