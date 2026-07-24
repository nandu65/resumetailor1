export const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export type ValidationResult = { ok: true; error?: undefined } | { ok: false; error: string };

export function validateResumeFile(file: File): ValidationResult {
  if (!file) return { ok: false, error: "No file selected." };
  const name = file.name.toLowerCase();
  const ext = name.slice(name.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    return {
      ok: false,
      error: `Unsupported file type "${ext || "unknown"}". Please upload a PDF, DOCX, or TXT file.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "This file is empty. Please choose a valid resume." };
  }
  if (file.size > MAX_RESUME_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `File is too large (${mb} MB). Maximum size is 5 MB — try exporting a smaller PDF or removing images.`,
    };
  }
  return { ok: true };
}
