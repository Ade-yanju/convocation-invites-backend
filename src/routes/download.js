// server/src/routes/download.js
import express from "express";
import { pipeline } from "stream";
import { promisify } from "util";
import { AbortController } from "node-abort-controller"; // add this for timeout handling

const router = express.Router();
const pipelineAsync = promisify(pipeline);

/**
 * GET /admin/download?url=<encoded>&filename=<optional>
 * Streams remote resource (Cloudinary or other URL) and forces browser download.
 */
router.get("/admin/download", async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send("Missing url query parameter");

  // Safety timeout: 30s
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const remote = await fetch(String(url), {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

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

    // Handle streaming efficiently
    try {
      let nodeStream;
      // Convert Web ReadableStream to Node stream if needed
      if (remote.body && !remote.body.pipe) {
        const { readableStreamToNodeStream } = await import(
          "readable-stream/web"
        );
        nodeStream = readableStreamToNodeStream(remote.body);
      } else {
        nodeStream = remote.body;
      }

      await pipelineAsync(nodeStream, res);
    } catch (streamErr) {
      console.error(
        "Stream pipeline failed, falling back to buffer:",
        streamErr
      );
      const arrayBuffer = await remote.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    clearTimeout(timeout);

    // If timeout occurred, send a clear message
    if (err.name === "AbortError") {
      console.error("Download proxy error: timeout (30s)");
      return res.status(504).send("Download timeout. Please retry.");
    }

    console.error("Download proxy error:", err);
    res.status(500).send("Download failed. Please try again.");
  }
});

export default router;
