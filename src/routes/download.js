// server/src/routes/download.js
import express from "express";
const router = express.Router();
import { pipeline } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(pipeline);

/**
 * GET /admin/download?url=<encoded>&filename=<optional>
 * Streams remote resource (Cloudinary or other URL) and forces browser download.
 *
 * IMPORTANT:
 * - If remote URL is private/signed, server should create signed URL (server has secrets). This endpoint then fetches the signed URL.
 * - You can protect this route with an auth middleware (requireAdmin) if desired.
 */
router.get("/admin/download", async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send("Missing url query parameter");

  try {
    // server->server fetch (Node has global fetch)
    const remote = await fetch(String(url), { method: "GET" });

    if (!remote.ok) {
      const txt = await remote.text().catch(() => "");
      return res
        .status(remote.status)
        .send(`Remote fetch failed: ${txt || remote.status}`);
    }

    const contentType = remote.headers.get("content-type") || "application/pdf";
    const safeName = filename
      ? String(filename).replace(/["']/g, "")
      : "invite.pdf";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Cache-Control", "no-store");

    // remote.body is a ReadableStream (whatwg). Convert to node stream if necessary.
    // Node 18+ fetch returns a web ReadableStream. Use response.body as a Node stream if possible:
    if (remote.body) {
      // try Node pipeline of the body (works if body is a Node stream or has .pipe)
      try {
        // If remote.body is a web ReadableStream, convert:
        // readableStreamToNodeStream available in 'readable-stream/web' in Node 18+
        let nodeStream;
        try {
          const { readableStreamToNodeStream } = await import(
            "readable-stream/web"
          );
          nodeStream = readableStreamToNodeStream(remote.body);
        } catch (e) {
          nodeStream = remote.body; // fallback, may be a Node stream already
        }
        await pipelineAsync(nodeStream, res);
      } catch (err) {
        console.error("Stream pipeline failed, fallback to buffer:", err);
        const arrayBuffer = await remote.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } else {
      // fallback
      const arrayBuffer = await remote.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    console.error("Download proxy error:", err);
    res.status(500).send("Download failed");
  }
});

export default router;
