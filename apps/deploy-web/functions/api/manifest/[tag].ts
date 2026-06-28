import { fetchUnivocityReleaseManifest } from "@univocity-tools/deploy-core/fetch-release-manifest";

type PagesContext = {
  request: Request;
  params: { tag?: string };
};

/** Same-origin proxy for deploy-manifest assets (GitHub release CDN blocks browser CORS). */
export async function onRequest(context: PagesContext): Promise<Response> {
  const tag = context.params.tag;
  if (tag === undefined || tag.length === 0) {
    return Response.json({ error: "release tag required" }, { status: 400 });
  }

  try {
    const result = await fetchUnivocityReleaseManifest(
      decodeURIComponent(tag),
    );
    return Response.json(result, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 404 });
  }
}
