const MAX_REQUEST_BYTES = 2_800_000;
const MAX_PAYLOAD_CHARS = 2_700_000;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYLOAD_PATTERN = /^[A-Za-z0-9_-]+$/;
const TRANSFER_TTL_SECONDS = 300;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function readLimited(request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) throw new RangeError('Transfer is too large.');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function onRequestPost({ request, env }) {
  if (!env.CAMPUS_TRANSFER_KV) return json({ error: 'Transfer storage is not configured.' }, 503);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origin not allowed.' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'JSON is required.' }, 415);
  }
  const declaredSize = Number(request.headers.get('Content-Length') || 0);
  if (declaredSize > MAX_REQUEST_BYTES) return json({ error: 'Transfer is too large.' }, 413);
  let input;
  try {
    input = JSON.parse(await readLimited(request));
  } catch (error) {
    return json({ error: error instanceof RangeError ? 'Transfer is too large.' : 'Invalid JSON.' },
      error instanceof RangeError ? 413 : 400);
  }
  if (!input || !ID_PATTERN.test(input.id || '')) return json({ error: 'Invalid transfer ID.' }, 400);
  const storageKey = `campus-transfer:${input.id.toLowerCase()}`;
  if (input.action === 'upload') {
    if (typeof input.payload !== 'string' || input.payload.length < 40 ||
        input.payload.length > MAX_PAYLOAD_CHARS || !PAYLOAD_PATTERN.test(input.payload)) {
      return json({ error: 'Invalid encrypted transfer.' }, 400);
    }
    await env.CAMPUS_TRANSFER_KV.put(storageKey, input.payload,
      { expirationTtl: TRANSFER_TTL_SECONDS });
    return json({ ok: true }, 201);
  }
  if (input.action === 'claim') {
    const payload = await env.CAMPUS_TRANSFER_KV.get(storageKey);
    if (!payload) return json({ error: 'Transfer not found or expired.' }, 404);
    await env.CAMPUS_TRANSFER_KV.delete(storageKey);
    return json({ payload });
  }
  return json({ error: 'Unknown transfer action.' }, 400);
}
