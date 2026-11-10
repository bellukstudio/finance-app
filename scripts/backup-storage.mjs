// Salin seluruh bucket 'receipts' ke ./storage-backup (dipakai workflow backup).
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises"; import { dirname } from "node:path";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let n = 0;
async function walk(prefix) {
  for (let off = 0; ; off += 100) {
    const { data, error } = await sb.storage.from("receipts").list(prefix, { limit: 100, offset: off });
    if (error) throw error; if (!data.length) return;
    for (const it of data) {
      const p = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) { await walk(p); continue; }
      const d = await sb.storage.from("receipts").download(p); if (d.error) throw d.error;
      const out = `storage-backup/${p}`; await mkdir(dirname(out), { recursive: true }); await writeFile(out, Buffer.from(await d.data.arrayBuffer())); n++;
    }
  }
}
await mkdir("storage-backup", { recursive: true }); await walk(""); console.log(`Backed up ${n} files`);
