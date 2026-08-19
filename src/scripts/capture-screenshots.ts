import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const VERSION_ID = process.argv[2];

if (!VERSION_ID) {
  console.error("Usage: tsx capture-screenshots.ts <versionId>");
  process.exit(1);
}

async function main() {
  console.log(`[${VERSION_ID}] Starting screenshot capture...`);

  // Fetch version data
  const { data: version, error } = await supabase
    .from("versions")
    .select("*, projects(*)")
    .eq("id", VERSION_ID)
    .single();

  if (error || !version) {
    console.error("Version not found:", error);
    await markFailed(VERSION_ID, "Version not found");
    process.exit(1);
  }

  const project = version.projects;
  const sourceType = project.source_type;
  const sourceUrl = project.source_url;
  const figmaFileKey = project.figma_file_key;

  let screenshotUrls: string[] = [];

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    if (sourceType === "url" && sourceUrl) {
      screenshotUrls = await captureUrl(context, sourceUrl);
    } else if (sourceType === "figma" && figmaFileKey) {
      screenshotUrls = await captureFigma(context, figmaFileKey, project.figma_token);
    } else {
      throw new Error("Unsupported source type or missing URL/Figma key");
    }

    await browser.close();

    // Update version with screenshot URLs
    await supabase
      .from("versions")
      .update({
        screenshot_urls: screenshotUrls,
        status: "screenshots_ready",
      })
      .eq("id", VERSION_ID);

    console.log(`[${VERSION_ID}] Screenshots captured: ${screenshotUrls.length}`);
  } catch (err) {
    console.error(`[${VERSION_ID}] Capture failed:`, err);
    await markFailed(VERSION_ID, err instanceof Error ? err.message : "Capture failed");
    process.exit(1);
  }
}

async function captureUrl(context: any, url: string): Promise<string[]> {
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];

  const urls: string[] = [];

  for (const vp of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(2000); // Wait for lazy content
      
      // Scroll to capture full page
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve(void 0);
            }
          }, 50);
        });
      });
      await page.waitForTimeout(1000);

      const screenshot = await page.screenshot({ fullPage: true, type: "png" });
      const path = `screenshots/${VERSION_ID}/${vp.name}.png`;
      
      const { error } = await supabase.storage
        .from("screenshots")
        .upload(path, screenshot, { contentType: "image/png", upsert: true });
      
      if (error) throw error;
      
      const { data } = supabase.storage.from("screenshots").getPublicUrl(path);
      urls.push(data.publicUrl);
    } finally {
      await page.close();
    }
  }

  return urls;
}

async function captureFigma(context: any, fileKey: string, token?: string): Promise<string[]> {
  // Use Figma REST API to get image URLs for nodes
  // For MVP: render the first page at 3 viewports via Figma's image API
  const figmaApiUrl = `https://api.figma.com/v1/files/${fileKey}`;
  const headers: Record<string, string> = {};
  if (token) headers["X-Figma-Token"] = token;

  const fileRes = await fetch(figmaApiUrl, { headers });
  if (!fileRes.ok) throw new Error("Failed to fetch Figma file");
  const fileData = await fileRes.json();

  // Get first page ID
  const firstPage = fileData.document.children[0];
  if (!firstPage) throw new Error("No pages in Figma file");

  // Get image URLs for the page at 3 scales
  const imageRes = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${firstPage.id}&scale=2&format=png`,
    { headers }
  );
  if (!imageRes.ok) throw new Error("Failed to fetch Figma images");
  const imageData = await imageRes.json();

  const figmaImageUrl = imageData.images[firstPage.id];
  if (!figmaImageUrl) throw new Error("No image URL returned from Figma");

  // For different viewports, we'd need to render specific frames
  // MVP: use the same image for all 3 (user can upload screenshots for better results)
  const urls = [
    figmaImageUrl,
    figmaImageUrl,
    figmaImageUrl,
  ];

  // Download and re-upload to our storage for consistency
  const uploadedUrls: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const resp = await fetch(urls[i]);
    const blob = await resp.blob();
    const path = `screenshots/${VERSION_ID}/figma-${i}.png`;
    const { error } = await supabase.storage
      .from("screenshots")
      .upload(path, blob, { contentType: "image/png", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("screenshots").getPublicUrl(path);
    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

async function markFailed(versionId: string, message: string) {
  await supabase
    .from("versions")
    .update({ status: "failed", error_message: message })
    .eq("id", versionId);
}

main();