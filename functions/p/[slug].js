/**
 * Cloudflare Pages Function
 * Route: /p/:slug
 *
 * The main SPA already supports direct product URLs at /:slug.
 * index.html reads window.location.pathname and opens the matching product modal.
 *
 * This function ensures shared links like /p/plywood always show the normal site
 * (no unstyled/distorted fallback page) by redirecting to /plywood.
 */

export async function onRequestGet({ request, params }) {
  const slug = String(params?.slug || "").trim();

  // If slug is missing, just go home.
  if (!slug) {
    return Response.redirect(new URL("/", request.url).toString(), 302);
  }

  // Preserve query string (utm tags etc.)
  const inUrl = new URL(request.url);
  const target = new URL(`/${encodeURIComponent(slug)}`, inUrl.origin);
  target.search = inUrl.search;

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store"
    }
  });
}
