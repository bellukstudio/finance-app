import test from "node:test";
import assert from "node:assert/strict";
import { formatBytes } from "../../src/lib/client-compress.ts";
import sharp from "sharp";

test("formatBytes", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(500), "1 KB");
  assert.equal(formatBytes(150_000), "150 KB");
  assert.equal(formatBytes(2_400_000), "2.4 MB");
});

test("server image compression with sharp", async () => {
  // Generate a large 2000x2000 uncompressed test image buffer
  const rawImage = await sharp({
    create: {
      width: 2000,
      height: 2000,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .png()
    .toBuffer();

  // Compress using the pipeline used in /api/attachments
  const compressed = await sharp(rawImage)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  assert.ok(compressed.length > 0);
  assert.ok(compressed.length < rawImage.length, "Compressed size should be smaller than raw PNG");

  const metadata = await sharp(compressed).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1920);
  assert.equal(metadata.height, 1920);
});
