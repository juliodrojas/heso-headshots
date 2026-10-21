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

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestGet(context) {
  if (!(await isAdmin(context.request, context.env))) return json({ admin: false }, 403);
  var hidden = [];
  if (context.env.HESO_KV) {
    try {
      var v = await context.env.HESO_KV.get('hidden');
      hidden = v ? JSON.parse(v) : [];
    } catch (e) { hidden = []; }
  }
  return json({ admin: true, hidden: Array.isArray(hidden) ? hidden : [] });
}
