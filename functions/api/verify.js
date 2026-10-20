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

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost(context) {
  var body = {};
  try { body = await context.request.json(); } catch (e) { return json({ ok: false }, 400); }
  var pin = context.env.HESO_PIN || '';
  if (!pin) return json({ ok: false, error: 'not configured' }, 500);
  if (!safeEqual(body.pin, pin)) return json({ ok: false }, 401);
  var token = await authToken(pin);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': 'heso_auth=' + token + '; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000'
    }
  });
}
