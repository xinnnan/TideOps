"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { Camera, ClipboardPaste, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoCapturePanelProps {
  title: string;
  helper: string;
  files: File[];
  onChange: (files: File[]) => void;
  dark?: boolean;
  pickLabel: string;
  cameraLabel: string;
  pasteLabel: string;
}

export function PhotoCapturePanel({
  title,
  helper,
  files,
  onChange,
  dark = false,
  pickLabel,
  cameraLabel,
  pasteLabel,
}: PhotoCapturePanelProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const previews = useMemo(
    () =>
      files.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function appendFiles(nextFiles: File[]) {
    if (nextFiles.length === 0) {
      return;
    }

    onChange([...files, ...nextFiles]);
  }

  function handleFileList(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    appendFiles(
      Array.from(fileList).filter((file) => file.type.startsWith("image/")),
    );
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const pastedFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    appendFiles(pastedFiles);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={cn("text-sm font-medium", dark ? "text-white" : "text-slate-800")}>
          {title}
        </p>
        <p className={cn("mt-1 text-xs leading-5", dark ? "text-white/55" : "text-slate-500")}>
          {helper}
        </p>
      </div>

      <div
        tabIndex={0}
        onPaste={handlePaste}
        className={cn(
          "rounded-[24px] border border-dashed p-4 outline-none transition",
          dark
            ? "border-white/16 bg-white/8 focus:border-white/30"
            : "border-slate-300 bg-white focus:border-slate-500",
        )}
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
              dark
                ? "bg-white text-slate-950 hover:bg-slate-100"
                : "bg-slate-950 text-white hover:bg-slate-800",
            )}
          >
            <ImagePlus className="h-4 w-4" />
            {pickLabel}
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
              dark
                ? "border-white/12 text-white hover:bg-white/8"
                : "border-slate-200 text-slate-700 hover:bg-slate-100",
            )}
          >
            <Camera className="h-4 w-4" />
            {cameraLabel}
          </button>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm",
              dark ? "border-white/12 text-white/70" : "border-slate-200 text-slate-600",
            )}
          >
            <ClipboardPaste className="h-4 w-4" />
            {pasteLabel}
          </div>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleFileList(event.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(event) => handleFileList(event.target.files)}
        />

        {previews.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {previews.map((preview, index) => (
              <div
                key={`${preview.name}-${index}`}
                className={cn(
                  "overflow-hidden rounded-[24px] border",
                  dark ? "border-white/12 bg-slate-950/35" : "border-slate-200 bg-slate-50",
                )}
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={preview.url}
                    alt={preview.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-3">
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs",
                      dark ? "text-white/70" : "text-slate-600",
                    )}
                  >
                    {preview.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full transition",
                      dark ? "text-white/70 hover:bg-white/8" : "text-slate-500 hover:bg-slate-200",
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
