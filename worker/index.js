// Fallback only. The asset layer serves every real file directly and never
// reaches this code, so those requests stay free and unmetered. Only
// directory-style paths land here, because html_handling is "none" so that
// /privacy.html keeps serving at that exact URL instead of being redirected.
const SECURITY = {
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; " +
    "frame-ancestors 'none'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; manifest-src 'self'",
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const last = url.pathname.split('/').pop();
    const path = url.pathname.endsWith('/') ? url.pathname + 'index.html'
      : last.includes('.') ? url.pathname
      : url.pathname + '/index.html';
    const res = await env.ASSETS.fetch(new URL(path, url));
    // _headers does not apply to responses returned from Worker code, so the
    // same headers are set here to keep the two paths identical.
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);
    if (res.status === 200) out.headers.set('Cache-Control', 'public, max-age=300, must-revalidate');
    return out;
  },
};
