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

async function isAdmin(request, env) {
  var adminPin = env.HESO_ADMIN_PIN || '';
  if (!adminPin) return false;
  var cookie = request.headers.get('Cookie') || '';
  var m = cookie.match(/(?:^|;\s*)heso_admin=([a-f0-9]{64})(?:;|$)/);
  if (!m) return false;
  try { return safeEqual(m[1], await authToken(adminPin)); } catch (e) { return false; }
}

export async function onRequestGet(context) {
  var photos = [];
  try {
    var res = await context.env.ASSETS.fetch(new URL('/assets/manifest.json', context.request.url));
    photos = await res.json();
  } catch (e) {
    try {
      var r2 = await fetch(new URL('/assets/manifest.json', context.request.url), { headers: context.request.headers });
      photos = await r2.json();
    } catch (e2) { photos = []; }
  }
  if (!Array.isArray(photos)) photos = [];

  var admin = await isAdmin(context.request, context.env);
  if (!admin && context.env.HESO_KV) {
    var hidden = [];
    try {
      var v = await context.env.HESO_KV.get('hidden');
      hidden = v ? JSON.parse(v) : [];
    } catch (e) { hidden = []; }
    if (Array.isArray(hidden) && hidden.length) {
      photos = photos.filter(function(p){ return hidden.indexOf(p.id) === -1; });
    }
  }
  return new Response(JSON.stringify(photos), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
