export async function onRequestPost() {
  return new Response(
    JSON.stringify({ ok: true, test: "function reached" }),
    { headers: { "content-type": "application/json" } }
  );
}
