const MAX_BODY_BYTES = 400 * 1024;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 12000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function isPublicIPv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function isPublicIPv6(address) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized.includes('.')) {
    const embedded = normalized.slice(normalized.lastIndexOf(':') + 1);
    return isPublicIPv4(embedded);
  }
  if (!/^[0-9a-f:]+$/.test(normalized)) return false;
  if (!/^[23]/.test(normalized)) return false;
  if (normalized.startsWith('2001:db8:')) return false;
  return true;
}

async function resolvePublicHost(hostname) {
  if (hostname === 'localhost' || hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') || hostname.endsWith('.internal') ||
      hostname.endsWith('.home') || hostname.endsWith('.lan')) {
    throw new Error('Local and private hostnames cannot be scanned.');
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    if (!isPublicIPv4(hostname)) throw new Error('Private or reserved IP addresses cannot be scanned.');
    return;
  }

  if (hostname.includes(':')) {
    if (!isPublicIPv6(hostname)) throw new Error('Private or reserved IP addresses cannot be scanned.');
    return;
  }

  const answers = [];
  for (const type of ['A', 'AAAA']) {
    const dnsUrl = new URL('https://cloudflare-dns.com/dns-query');
    dnsUrl.searchParams.set('name', hostname);
    dnsUrl.searchParams.set('type', type);
    const response = await fetch(dnsUrl, {
      headers: { Accept: 'application/dns-json' }
    });
    if (!response.ok) continue;
    const data = await response.json();
    for (const answer of data.Answer || []) {
      if (answer.type === 1 || answer.type === 28) answers.push(answer.data);
    }
  }

  if (answers.length === 0) throw new Error('The hostname did not resolve to a public address.');
  for (const address of answers) {
    const isPublic = address.includes(':') ? isPublicIPv6(address) : isPublicIPv4(address);
    if (!isPublic) throw new Error('The hostname resolves to a private or reserved address.');
  }
}

async function validateTarget(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    throw new Error('Enter a valid absolute URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not supported.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard web ports 80 and 443 are supported.');
  await resolvePublicHost(url.hostname);
  return url;
}

async function readTextSample(response) {
  if (!response.body) return { text: '', truncated: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let bytesRead = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = MAX_BODY_BYTES - bytesRead;
    if (value.byteLength > remaining) {
      text += decoder.decode(value.slice(0, remaining), { stream: true });
      truncated = true;
      await reader.cancel();
      break;
    }
    bytesRead += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return { text, truncated };
}

function getOrigin(url) {
  try {
    return new URL(url).origin;
  } catch (_) {
    return '';
  }
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
}

function hasAttribute(tag, name) {
  return new RegExp(`\\s${name}(?:\\s*=|\\s|\/?>)`, 'i').test(tag);
}

function inspectHtml(html, pageUrl) {
  const pageOrigin = getOrigin(pageUrl);
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  const stylesheetLinks = (html.match(/<link\b[^>]*>/gi) || [])
    .filter(tag => /\brel\s*=\s*["']?stylesheet/i.test(tag));
  const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form\s*>/gi) || [];
  const passwordInputs = html.match(/<input\b[^>]*\btype\s*=\s*["']?password["']?[^>]*>/gi) || [];
  const mixedContent = [];
  const insecureUrlPattern = /(?:src|href|action)\s*=\s*["'](http:\/\/[^"']+)/gi;
  let insecureMatch;
  while ((insecureMatch = insecureUrlPattern.exec(html)) && mixedContent.length < 12) {
    mixedContent.push(insecureMatch[1]);
  }

  const externalAssetsWithoutSri = [...scripts, ...stylesheetLinks].filter(tag => {
    const source = getAttribute(tag, tag.toLowerCase().startsWith('<script') ? 'src' : 'href');
    if (!source) return false;
    try {
      const assetUrl = new URL(source, pageUrl);
      return assetUrl.origin !== pageOrigin && !hasAttribute(tag, 'integrity');
    } catch (_) {
      return false;
    }
  }).length;

  let formsWithoutCsrfToken = 0;
  let passwordFormsUsingGet = 0;
  for (const form of forms) {
    const openingTag = form.match(/^<form\b[^>]*>/i)?.[0] || '';
    const method = (getAttribute(openingTag, 'method') || 'get').toLowerCase();
    const hasPassword = /<input\b[^>]*\btype\s*=\s*["']?password/i.test(form);
    const hasCsrf = /<input\b[^>]*\bname\s*=\s*["'][^"']*(?:csrf|xsrf|authenticity|requesttoken|nonce)[^"']*["']/i.test(form);
    if (!['get', 'head'].includes(method) && !hasCsrf) formsWithoutCsrfToken += 1;
    if (hasPassword && method === 'get') passwordFormsUsingGet += 1;
  }

  const generator = html.match(/<meta\b[^>]*\bname\s*=\s*["']generator["'][^>]*>/i)?.[0] || '';
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]
    ?.replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || '';
  const libraryVersions = [...new Set(
    (html.match(/(?:jquery|bootstrap|angular|react|vue|lodash)[-.](?:v)?\d+(?:\.\d+){1,3}/gi) || [])
      .map(value => value.toLowerCase())
  )].slice(0, 12);

  return {
    title,
    scriptCount: scripts.length,
    formCount: forms.length,
    passwordInputCount: passwordInputs.length,
    passwordFormsUsingGet,
    formsWithoutCsrfToken,
    externalAssetsWithoutSri,
    mixedContent,
    inlineEventHandlerCount: (html.match(/\son[a-z]+\s*=/gi) || []).length,
    documentWriteCount: (html.match(/\bdocument\.write\s*\(/gi) || []).length,
    evalCount: (html.match(/\beval\s*\(/gi) || []).length,
    exposedSourceMapCount: (html.match(/\/\/[#@]\s*sourceMappingURL\s*=/gi) || []).length,
    directoryListing: /<title>\s*index of\s*\//i.test(html) || /<h1>\s*index of\s*\//i.test(html),
    stackTrace: /(?:traceback \(most recent call last\)|at [\w.$]+ \([^\n]+:\d+:\d+\)|stack trace:|uncaught (?:exception|error))/i.test(html),
    generator: getAttribute(generator, 'content').slice(0, 180),
    libraryVersions
  };
}

async function fetchTarget(initialUrl, followRedirects) {
  const redirects = [];
  let currentUrl = await validateTarget(initialUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(currentUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5',
          'User-Agent': 'Browser-Tools-Security-Check/1.0 (+https://tools.j4ck.xyz/)'
        },
        signal: controller.signal,
        cf: { cacheTtl: 0, cacheEverything: false }
      });
    } finally {
      clearTimeout(timer);
    }

    const location = response.headers.get('location');
    if (location && response.status >= 300 && response.status < 400) {
      const nextUrl = new URL(location, currentUrl);
      redirects.push({
        from: currentUrl.toString(),
        to: nextUrl.toString(),
        status: response.status
      });
      if (!followRedirects) {
        return { response, finalUrl: currentUrl.toString(), redirects, sample: { text: '', truncated: false } };
      }
      if (hop === MAX_REDIRECTS) throw new Error('The redirect limit was exceeded.');
      currentUrl = await validateTarget(nextUrl.toString());
      continue;
    }

    const contentType = response.headers.get('content-type') || '';
    const isText = /(?:text\/|application\/(?:json|javascript|xml|xhtml\+xml))/i.test(contentType);
    const sample = isText ? await readTextSample(response) : { text: '', truncated: false };
    return { response, finalUrl: currentUrl.toString(), redirects, sample };
  }

  throw new Error('The redirect limit was exceeded.');
}

export async function onRequestPost(context) {
  let payload;
  try {
    payload = await context.request.json();
  } catch (_) {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  if (payload.authorized !== true) {
    return json({ error: 'Confirm that you are authorized to assess this target.' }, 403);
  }

  const rawUrl = String(payload.url || '').trim();
  if (!rawUrl || rawUrl.length > 2048) return json({ error: 'A valid URL is required.' }, 400);

  try {
    const startedAt = Date.now();
    const { response, finalUrl, redirects, sample } = await fetchTarget(rawUrl, payload.followRedirects !== false);
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return json({
      requestedUrl: rawUrl,
      finalUrl,
      redirects,
      status: response.status,
      statusText: response.statusText,
      headers,
      bodyBytesInspected: new TextEncoder().encode(sample.text).byteLength,
      bodyTruncated: sample.truncated,
      html: inspectHtml(sample.text, finalUrl),
      elapsedMs: Date.now() - startedAt,
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'The target did not respond within 12 seconds.'
      : error.message || 'The scan could not be completed.';
    return json({ error: message }, 422);
  }
}
