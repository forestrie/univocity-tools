import type { Plugin } from "vite";

/** Dev-only same-origin proxy for GitHub release manifest assets (avoids browser CORS). */
export function manifestApiPlugin(): Plugin {
  return {
    name: "deploy-web-manifest-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/manifest\/([^/?#]+)/);
        if (match === undefined || match === null) {
          next();
          return;
        }

        try {
          const tag = decodeURIComponent(match[1]!);
          const { fetchUnivocityReleaseManifest } = await import(
            "@univocity-tools/deploy-core/fetch-release-manifest"
          );
          const result = await fetchUnivocityReleaseManifest(tag);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: (error as Error).message }));
        }
      });
    },
  };
}
