import type { ChatActionState } from "@/hooks/useAgentStream";

export type DocumentScanResult = {
  document_type: string;
  summary: string;
  proposals: Array<{
    id: number;
    tool: string;
    args: Record<string, unknown>;
    human_summary: string;
    diff_preview: Record<string, unknown>;
  }>;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Sends a statement/receipt photo to the qwen3-vl scan endpoint.
 * Throws with a user-presentable message on failure. */
export async function scanDocument(file: File): Promise<DocumentScanResult> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Please upload a JPEG, PNG, or WebP image of your document.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 8MB). Try a smaller photo.");
  }
  const data_b64 = await fileToBase64(file);
  const res = await fetch("/api/django/wealth/documents/scan/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mime: file.type, data_b64 }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(body.error || body.detail || "Document scan failed."));
  }
  return body as unknown as DocumentScanResult;
}

export function scanProposalsToActions(result: DocumentScanResult): ChatActionState[] {
  return result.proposals.map((p) => ({
    id: p.id,
    tool: p.tool,
    args: p.args,
    human_summary: p.human_summary,
    diff_preview: p.diff_preview,
    status: "pending" as const,
  }));
}
