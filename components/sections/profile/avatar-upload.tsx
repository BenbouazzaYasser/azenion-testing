"use client";

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadAvatar } from "@/actions/profile.actions";
import { useTranslation } from "@/components/translation/translation-provider";

interface AvatarUploadProps {
  avatarUrl: string | null;
  userId: string;
  username: string;
}

export function AvatarUpload({ avatarUrl, username }: AvatarUploadProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError(t("settings.avatarTooLarge"));
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      setError(t("settings.avatarType"));
      return;
    }

    const formData = new FormData();
    formData.set("avatar", file);

    setLoading(true);
    const result = await uploadAvatar(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    if (result?.avatar_url) {
      setPreview(result.avatar_url);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="group relative h-24 w-24 overflow-hidden rounded-full border border-accent-400/30 bg-accent/[0.08] transition-all duration-300 hover:border-accent-400/60 hover:shadow-[0_0_20px_rgba(40,40,255,0.15)] sm:h-28 sm:w-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950"
      >
        {preview ? (
          <img
            src={preview}
            alt={username}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl font-semibold text-ink-400">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-void-950/60 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
          {loading ? (
            <Loader2 size={20} className="animate-spin text-ink-50" />
          ) : (
            <Camera size={20} className="text-ink-50" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileSelect}
      />

      {error && (
        <p className="max-w-[180px] text-center text-xs text-red-400 sm:text-left">
          {error}
        </p>
      )}
    </div>
  );
}
