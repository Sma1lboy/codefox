import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
    });
    const page = await browser.newPage();

    // Set viewport to a reasonable size
    await page.setViewport({
      width: 1280,
      height: 720,
    });

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Take screenshot
    const screenshot = await page.screenshot({
      path: `dsadas.png`,
      type: 'png',
      fullPage: true,
    });

    await browser.close();

    // Return the screenshot as a PNG image
    return new Response(screenshot, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 's-maxage=3600',
      },
    });
  } catch (error: any) {
    console.error('Screenshot error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture screenshot' },
      { status: 500 }
    );
  }
}
