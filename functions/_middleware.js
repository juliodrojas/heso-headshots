function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function authToken(pin) {
  var key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode('heso-gallery|' + pin),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  var sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('heso-auth'));
  return Array.from(new Uint8Array(sig)).map(function(b){ return b.toString(16).padStart(2, '0'); }).join('');
}

var PUBLIC_PATHS = ['/', '/index.html', '/styles.css', '/app.js', '/api/verify', '/favicon.ico', '/robots.txt', '/assets/logo-badge.png'];

export async function onRequest(context) {
  var url = new URL(context.request.url);
  var path = url.pathname;
  if (PUBLIC_PATHS.indexOf(path) !== -1) return context.next();

  var pin = context.env.HESO_PIN || '';
  var authed = false;
  if (pin) {
    var cookie = context.request.headers.get('Cookie') || '';
    var m = cookie.match(/(?:^|;\s*)heso_auth=([a-f0-9]{64})(?:;|$)/);
    if (m) {
      try { authed = safeEqual(m[1], await authToken(pin)); } catch (e) { authed = false; }
    }
  }
  if (authed) return context.next();
  return Response.redirect(url.origin + '/', 302);
}
