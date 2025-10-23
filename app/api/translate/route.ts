// This file was added temporarily for a custom /api/translate route.
// The user requested to revert; keep this file as a no-op placeholder to avoid accidental usage.
export async function POST() {
  return new Response(JSON.stringify({ error: 'translate endpoint disabled' }), { status: 410, headers: { 'Content-Type': 'application/json' } })
}
