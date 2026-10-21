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

function cookieVal(request, name) {
  var cookie = request.headers.get('Cookie') || '';
  var m = cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([a-f0-9]{64})(?:;|$)'));
  return m ? m[1] : '';
}

async function isAdmin(request, env) {
  var adminPin = env.HESO_ADMIN_PIN || '';
  if (!adminPin) return false;
  var tok = cookieVal(request, 'heso_admin');
  if (!tok) return false;
  try { return safeEqual(tok, await authToken(adminPin)); } catch (e) { return false; }
}

async function hiddenIds(env) {
  if (!env.HESO_KV) return [];
  try {
    var v = await env.HESO_KV.get('hidden');
    var arr = v ? JSON.parse(v) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

var PUBLIC_PATHS = ['/', '/index.html', '/styles.css', '/app.js', '/api/verify', '/favicon.ico', '/robots.txt', '/assets/logo-badge.png', '/assets/og-preview.jpg'];

export async function onRequest(context) {
  var url = new URL(context.request.url);
  var path = url.pathname;
  if (PUBLIC_PATHS.indexOf(path) !== -1) return context.next();

  var pin = context.env.HESO_PIN || '';
  var authed = false;
  if (pin) {
    var tok = cookieVal(context.request, 'heso_auth');
    if (tok) {
      try { authed = safeEqual(tok, await authToken(pin)); } catch (e) { authed = false; }
    }
  }
  if (!authed) return Response.redirect(url.origin + '/', 302);

  var admin = await isAdmin(context.request, context.env);
  if (admin) return context.next();

  // Members never see the raw manifest (it would list hidden photos too).
  if (path === '/assets/manifest.json') {
    return Response.redirect(url.origin + '/api/manifest', 302);
  }
  // Hidden photos are blocked for everyone except the admin.
  if (path.indexOf('/assets/photos/') === 0) {
    var file = path.slice('/assets/photos/'.length);
    var id = file.replace(/\.jpg$/i, '');
    var hidden = await hiddenIds(context.env);
    if (hidden.indexOf(id) !== -1) return Response.redirect(url.origin + '/', 302);
  }
  return context.next();
}
