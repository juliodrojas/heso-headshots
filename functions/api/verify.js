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

function cookie(name, token) {
  return name + '=' + token + '; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000';
}

export async function onRequestPost(context) {
  var body = {};
  try { body = await context.request.json(); } catch (e) { return json({ ok: false }, 400); }
  var memberPin = context.env.HESO_PIN || '';
  var adminPin = context.env.HESO_ADMIN_PIN || '';
  if (!memberPin) return json({ ok: false, error: 'not configured' }, 500);
  var pin = String(body.pin || '');

  if (safeEqual(pin, memberPin)) {
    var h1 = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    h1.append('Set-Cookie', cookie('heso_auth', await authToken(memberPin)));
    return new Response(JSON.stringify({ ok: true, role: 'member' }), { status: 200, headers: h1 });
  }
  if (adminPin && safeEqual(pin, adminPin)) {
    var h2 = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    h2.append('Set-Cookie', cookie('heso_auth', await authToken(memberPin)));
    h2.append('Set-Cookie', cookie('heso_admin', await authToken(adminPin)));
    return new Response(JSON.stringify({ ok: true, role: 'admin' }), { status: 200, headers: h2 });
  }
  return json({ ok: false }, 401);
}
