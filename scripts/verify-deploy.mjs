const target = process.argv[2];

if (!target) {
  console.error("Usage: node scripts/verify-deploy.mjs https://your-site.example");
  process.exit(1);
}

const baseUrl = new URL(target);

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractAssetUrl(html, type) {
  const pattern = type === "js"
    ? /<script[^>]+src="([^"]*\/assets\/[^"']+\.js)"/i
    : /<link[^>]+href="([^"]*\/assets\/[^"']+\.css)"/i;
  const match = html.match(pattern);
  return match ? new URL(match[1], baseUrl).toString() : null;
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  const text = await response.text();
  return { response, text };
}

async function fetchHeaders(url) {
  const response = await fetch(url, { method: "HEAD", redirect: "follow" });
  return response.headers;
}

async function main() {
  const { text: html } = await fetchText(baseUrl.toString());

  expect(html.includes("/assets/"), "HTML does not reference Vite assets");
  expect(!html.includes("/src/main.ts"), "HTML still references /src/main.ts");

  const jsAsset = extractAssetUrl(html, "js");
  const cssAsset = extractAssetUrl(html, "css");
  expect(Boolean(jsAsset), "Could not find JS asset reference in HTML");
  expect(Boolean(cssAsset), "Could not find CSS asset reference in HTML");

  const docHeaders = await fetchHeaders(baseUrl.toString());
  const jsHeaders = await fetchHeaders(jsAsset);
  const cssHeaders = await fetchHeaders(cssAsset);

  const csp = docHeaders.get("content-security-policy") || "";
  expect(csp.includes("script-src 'self'"), "CSP is missing strict script-src 'self'");

  const hasNonce = /script-src[^;]*'nonce-[^']+'/i.test(csp);
  const hasCloudflareChallenge =
    html.includes("/cdn-cgi/challenge-platform") || html.includes("window.__CF");

  if (hasCloudflareChallenge) {
    expect(hasNonce, "Cloudflare challenge injection present but CSP nonce is missing");
  }

  const docCache = docHeaders.get("cache-control") || "";
  expect(docCache.includes("must-revalidate"), "Document cache-control should revalidate");

  const jsCache = jsHeaders.get("cache-control") || "";
  expect(jsCache.includes("immutable"), "JS asset cache-control should be immutable");

  const cssCache = cssHeaders.get("cache-control") || "";
  expect(cssCache.includes("immutable"), "CSS asset cache-control should be immutable");

  console.log("Deploy verification passed:");
  console.log(`- HTML references hashed assets`);
  console.log(`- No /src/main.ts in HTML`);
  console.log(`- CSP script-src is strict${hasNonce ? " with nonce" : ""}`);
  if (hasCloudflareChallenge) {
    console.log(`- Cloudflare challenge injection detected and covered by CSP nonce`);
  } else {
    console.log(`- No Cloudflare challenge injection detected`);
  }
  console.log(`- Document cache-control revalidates`);
  console.log(`- Asset cache-control is immutable`);
}

main().catch(error => {
  console.error(`Deploy verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
