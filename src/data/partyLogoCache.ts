import { PartyConfig } from '../types/election';

const rawSvgTextCache: Partial<Record<string, string>> = {};
const logoPromiseCache: Partial<Record<string, Promise<string | null>>> = {};
const coloredDataUriCache: Partial<Record<string, string>> = {};
let kalkulusLogoLightDataUri: string | null = null;
let kalkulusLogoDarkDataUri: string | null = null;
let kalkulusLogoPromise: Promise<void> | null = null;

function encodeSvgBase64(svgXml: string): string {
  try {
    const bytes = new TextEncoder().encode(svgXml);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
  } catch {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgXml)}`;
  }
}

export async function loadPartyLogoRaw(logoUrl: string): Promise<string | null> {
  if (rawSvgTextCache[logoUrl]) return rawSvgTextCache[logoUrl]!;
  const existing = logoPromiseCache[logoUrl];
  if (existing) return existing;

  const baseUrl = import.meta.env?.BASE_URL ?? './';
  const promise = fetch(`${baseUrl}${logoUrl}`)
    .then((r) => {
      if (!r.ok) return null;
      return r.text();
    })
    .then((txt) => {
      if (txt) rawSvgTextCache[logoUrl] = txt;
      return txt;
    })
    .catch(() => {
      delete logoPromiseCache[logoUrl];
      return null;
    });

  logoPromiseCache[logoUrl] = promise;
  return promise;
}

export function loadKalkulusLogo(): Promise<void> {
  if (kalkulusLogoLightDataUri) return Promise.resolve();
  if (kalkulusLogoPromise) return kalkulusLogoPromise;

  const baseUrl = import.meta.env?.BASE_URL ?? './';
  kalkulusLogoPromise = fetch(`${baseUrl}kalkulus-logo.png`)
    .then((r) => (r.ok ? r.blob() : null))
    .then(
      (blob) =>
        new Promise<void>((resolve) => {
          if (!blob) {
            resolve();
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : null;
            if (!dataUrl) {
              resolve();
              return;
            }
            kalkulusLogoLightDataUri = dataUrl;
            // Also produce light-ink PNG variant for Dark theme via offscreen canvas
            const img = new Image();
            img.onload = () => {
              try {
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0);
                  const imgData = ctx.getImageData(0, 0, c.width, c.height);
                  const d = imgData.data;
                  for (let i = 0; i < d.length; i += 4) {
                    if (d[i + 3] > 0) {
                      d[i] = 248;
                      d[i + 1] = 250;
                      d[i + 2] = 252;
                    }
                  }
                  ctx.putImageData(imgData, 0, 0);
                  kalkulusLogoDarkDataUri = c.toDataURL('image/png');
                }
              } catch {
                // ignore canvas errors in headless environments
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = dataUrl;
          };
          reader.readAsDataURL(blob);
        })
    )
    .catch(() => {
      kalkulusLogoPromise = null;
    });

  return kalkulusLogoPromise;
}

export function getKalkulusLogoDataUri(isDark: boolean): string | null {
  return isDark ? kalkulusLogoDarkDataUri || kalkulusLogoLightDataUri : kalkulusLogoLightDataUri;
}

export async function preloadAllPartyLogos(parties: PartyConfig[]): Promise<void> {
  await Promise.all([
    loadKalkulusLogo(),
    ...parties.filter((p) => Boolean(p.logoUrl)).map((p) => loadPartyLogoRaw(p.logoUrl!)),
  ]);
}

/**
 * Recolors a cached monochrome party SVG (`#ffffff`) into `targetColor` and returns
 * a self-contained data URI suitable for embedded `<svg><image>` and `<canvas>` PNG export.
 */
export function getColoredPartyLogoDataUri(
  logoUrl: string | undefined,
  targetColor: string
): string | null {
  if (!logoUrl) return null;
  const raw = rawSvgTextCache[logoUrl];
  if (!raw) return null;

  const cacheKey = `${logoUrl}::${targetColor}`;
  if (coloredDataUriCache[cacheKey]) return coloredDataUriCache[cacheKey];

  const recolored = raw.replace(/#ffffff|#fff\b/gi, targetColor);
  const dataUri = encodeSvgBase64(recolored);
  coloredDataUriCache[cacheKey] = dataUri;
  return dataUri;
}
