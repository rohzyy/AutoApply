import "server-only";
import { serverEnv } from "@/lib/env";
import { memoryStore } from "@/lib/data/memory";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/** Validates by magic bytes, not just the client-declared MIME type. */
export function sniffDocumentType(bytes: Uint8Array, declared: string): string | null {
  const head = Array.from(bytes.slice(0, 4));
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return "application/pdf"; // %PDF
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04 && declared.includes("wordprocessingml")) return declared; // zip (docx)
  if (declared === "text/plain" && !bytes.slice(0, 2048).some((b) => b === 0)) return "text/plain";
  return null;
}

export async function putDocument(path: string, bytes: Uint8Array, mime: string) {
  const env = serverEnv();
  if (env.dataMode === "demo") {
    memoryStore().blobs.set(path, { bytes, mime });
    return;
  }
  // Uploads go through the user's session so storage RLS enforces the "<uid>/..." folder rule.
  const supabase = await createSessionClient();
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function removeDocument(path: string) {
  const env = serverEnv();
  if (env.dataMode === "demo") {
    memoryStore().blobs.delete(path);
    return;
  }
  await createAdminClient().storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]);
}

/** Returns either a short-lived signed URL (Supabase) or the raw bytes (demo). */
export async function readDocument(path: string): Promise<{ url: string } | { bytes: Uint8Array; mime: string } | null> {
  const env = serverEnv();
  if (env.dataMode === "demo") return memoryStore().blobs.get(path) ?? null;
  const { data, error } = await createAdminClient().storage.from(env.SUPABASE_STORAGE_BUCKET).createSignedUrl(path, 60);
  if (error || !data) return null;
  return { url: data.signedUrl };
}

export async function extractText(bytes: Uint8Array, mime: string): Promise<string | null> {
  try {
    if (mime === "text/plain") return new TextDecoder().decode(bytes).slice(0, 60_000);
    if (mime === "application/pdf") {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await pdfText(pdf, { mergePages: true });
      return (Array.isArray(text) ? text.join("\n") : text).slice(0, 60_000);
    }
  } catch {
    return null;
  }
  return null;
}
