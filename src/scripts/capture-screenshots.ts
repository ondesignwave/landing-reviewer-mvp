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

  // Uploaded files are already screenshots — the API route seeds
  // screenshot_urls on the version row itself, so there's nothing to
  // capture. Skip launching a browser entirely for this source type.
  if (sourceType === "files") {
    if (!version.screenshot_urls?.length) {
      await markFailed(VERSION_ID, "No uploaded files found");
      process.exit(1);
    }
    console.log(`[${VERSION_ID}] Files already uploaded, skipping capture: ${version.screenshot_urls.length}`);
    return;
  }

  let screenshotUrls: string[] = [];

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    if (sourceType === "url" && sourceUrl) {
      screenshotUrls = await captureUrl(context, sourceUrl);
    } else if (sourceType === "figma" && figmaFileKey) {
      screenshotUrls = await captureFigma(context, figmaFileKey);
    } else {
      throw new Error("Unsupported source type or missing URL/Figma key");
    }

    await browser.close();

    // Update version with screenshot URLs
    const { error: updateError } = await supabase
      .from("versions")
      .update({ screenshot_urls: screenshotUrls })
      .eq("id", VERSION_ID);

    if (updateError) throw updateError;

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
      await page.goto(url, { waitUntil: "load", timeout: 60000 });
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

      // Cap capture height so very long pages don't blow up the vision
      // model's context (and local Ollama's available RAM for KV cache).
      // Report thumbnails are cropped to 16:10 anyway (see preview page),
      // so a lower cap only trims what goes to the model, not what's shown.
      const MAX_CAPTURE_HEIGHT = 2400;
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      const captureHeight = Math.min(pageHeight, MAX_CAPTURE_HEIGHT);
      const screenshot = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: vp.width, height: captureHeight },
      });
      const path = `${VERSION_ID}/${vp.name}.png`;
      
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

async function captureFigma(context: any, fileKey: string): Promise<string[]> {
  // Use Figma REST API to get image URLs for nodes. Public files only —
  // we don't collect account-wide Figma access tokens from users.
  // For MVP: render the first page at 3 viewports via Figma's image API
  const figmaApiUrl = `https://api.figma.com/v1/files/${fileKey}`;

  const fileRes = await fetch(figmaApiUrl);
  if (!fileRes.ok) throw new Error("Failed to fetch Figma file");
  const fileData = await fileRes.json();

  // Get first page ID
  const firstPage = fileData.document.children[0];
  if (!firstPage) throw new Error("No pages in Figma file");

  // Get image URLs for the page at 3 scales
  const imageRes = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${firstPage.id}&scale=2&format=png`
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
    const path = `${VERSION_ID}/figma-${i}.png`;
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