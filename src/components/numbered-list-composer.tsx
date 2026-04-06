"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ClipboardPaste, ImagePlus, Plus, Trash2, X } from "lucide-react";
import type { MediaListDraftItem } from "@/lib/types";
import { createDraftMediaListItem } from "@/lib/media-items";
import { cn } from "@/lib/utils";

interface NumberedListComposerProps {
  label: string;
  helper?: string;
  items: MediaListDraftItem[];
  onChange: (items: MediaListDraftItem[]) => void;
  placeholder: string;
  addLabel: string;
  emptyLabel: string;
  dark?: boolean;
  pickPhotoLabel: string;
  cameraLabel: string;
  pastePhotoLabel: string;
  cameraReadyLabel: string;
  capturePhotoLabel: string;
  closeCameraLabel: string;
  cameraUnavailableLabel: string;
}

function ItemPhotos({
  item,
  dark,
  pickPhotoLabel,
  cameraLabel,
  pastePhotoLabel,
  cameraReadyLabel,
  capturePhotoLabel,
  closeCameraLabel,
  cameraUnavailableLabel,
  onAppendFiles,
  onRemoveFile,
}: {
  item: MediaListDraftItem;
  dark: boolean;
  pickPhotoLabel: string;
  cameraLabel: string;
  pastePhotoLabel: string;
  cameraReadyLabel: string;
  capturePhotoLabel: string;
  closeCameraLabel: string;
  cameraUnavailableLabel: string;
  onAppendFiles: (files: File[]) => void;
  onRemoveFile: (fileIndex: number) => void;
}) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const previews = useMemo(
    () =>
      item.attachments.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [item.attachments],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!isCameraOpen || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [isCameraOpen]);

  function readFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));

    if (files.length > 0) {
      onAppendFiles(files);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((entry) => entry.type.startsWith("image/"))
      .map((entry) => entry.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (files.length > 0) {
      onAppendFiles(files);
    }
  }

  async function openCamera() {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      setCameraError(cameraUnavailableLabel);
      cameraInputRef.current?.click();
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setCameraError(cameraUnavailableLabel);
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError(cameraUnavailableLabel);
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError(cameraUnavailableLabel);
      return;
    }

    onAppendFiles([
      new File([blob], `camera-${Date.now()}.jpg`, {
        type: "image/jpeg",
      }),
    ]);

    stopCamera();
  }

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      className={cn(
        "rounded-2xl border border-dashed px-3 py-3 outline-none transition",
        dark
          ? "border-white/12 bg-slate-950/25 focus:border-white/25"
          : "border-slate-200 bg-slate-50 focus:border-slate-400",
      )}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition",
            dark
              ? "bg-white text-slate-950 hover:bg-slate-100"
              : "bg-slate-950 text-white hover:bg-slate-800",
          )}
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {pickPhotoLabel}
        </button>

        <button
          type="button"
          onClick={() => void openCamera()}
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
            dark
              ? "border-white/12 text-white hover:bg-white/8"
              : "border-slate-200 text-slate-700 hover:bg-white",
          )}
        >
          <Camera className="h-3.5 w-3.5" />
          {cameraLabel}
        </button>

        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs",
            dark ? "border-white/12 text-white/65" : "border-slate-200 text-slate-500",
          )}
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          {pastePhotoLabel}
        </div>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => readFiles(event.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => readFiles(event.target.files)}
      />

      {isCameraOpen ? (
        <div
          className={cn(
            "mt-3 overflow-hidden rounded-2xl border",
            dark ? "border-white/12 bg-black/40" : "border-slate-200 bg-white",
          )}
        >
          <div className="relative aspect-[4/3] bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <p className={cn("text-xs", dark ? "text-white/65" : "text-slate-500")}>
              {cameraReadyLabel}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void captureFrame()}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold transition",
                  dark ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-slate-950 text-white hover:bg-slate-800",
                )}
              >
                {capturePhotoLabel}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold transition",
                  dark ? "border-white/12 text-white hover:bg-white/8" : "border-slate-200 text-slate-700 hover:bg-slate-100",
                )}
              >
                {closeCameraLabel}
              </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      ) : null}

      {cameraError ? (
        <p className={cn("mt-3 text-xs leading-5", dark ? "text-amber-200" : "text-amber-700")}>
          {cameraError}
        </p>
      ) : null}

      {previews.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {previews.map((preview, index) => (
            <div
              key={`${preview.name}-${index}`}
              className={cn(
                "overflow-hidden rounded-2xl border",
                dark ? "border-white/12 bg-black/20" : "border-slate-200 bg-white",
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
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <p
                  className={cn(
                    "min-w-0 flex-1 truncate text-[11px]",
                    dark ? "text-white/65" : "text-slate-500",
                  )}
                >
                  {preview.name}
                </p>
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
                    dark ? "text-white/70 hover:bg-white/8" : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NumberedListComposer({
  label,
  helper,
  items,
  onChange,
  placeholder,
  addLabel,
  emptyLabel,
  dark = false,
  pickPhotoLabel,
  cameraLabel,
  pastePhotoLabel,
  cameraReadyLabel,
  capturePhotoLabel,
  closeCameraLabel,
  cameraUnavailableLabel,
}: NumberedListComposerProps) {
  function addBlankItem() {
    onChange([...items, createDraftMediaListItem()]);
  }

  function updateItem(index: number, nextItem: MediaListDraftItem) {
    const next = [...items];
    next[index] = nextItem;
    onChange(next);
  }

  function updateText(index: number, value: string) {
    updateItem(index, { ...items[index], text: value });
  }

  function appendFiles(index: number, files: File[]) {
    updateItem(index, {
      ...items[index],
      attachments: [...items[index].attachments, ...files],
    });
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeFile(index: number, fileIndex: number) {
    updateItem(index, {
      ...items[index],
      attachments: items[index].attachments.filter((_, currentIndex) => currentIndex !== fileIndex),
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={cn("text-sm font-medium", dark ? "text-white" : "text-slate-800")}>
          {label}
        </p>
        {helper ? (
          <p className={cn("mt-1 text-xs leading-5", dark ? "text-white/55" : "text-slate-500")}>
            {helper}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "rounded-[24px] border p-4",
          dark ? "border-white/12 bg-white/8" : "border-slate-200 bg-white",
        )}
      >
        <div className="space-y-4">
          {items.length === 0 ? (
            <div
              className={cn(
                "rounded-2xl border border-dashed px-4 py-4 text-sm",
                dark ? "border-white/12 text-white/50" : "border-slate-200 text-slate-500",
              )}
            >
              {emptyLabel}
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-[24px] border p-4",
                  dark ? "border-white/12 bg-slate-950/20" : "border-slate-200 bg-slate-50",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      dark ? "bg-white text-slate-950" : "bg-slate-950 text-white",
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    <textarea
                      rows={2}
                      value={item.text}
                      onChange={(event) => updateText(index, event.target.value)}
                      placeholder={placeholder}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
                        dark
                          ? "border-white/12 bg-slate-950/35 text-white placeholder:text-white/35"
                          : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400",
                      )}
                    />

                    <ItemPhotos
                      item={item}
                      dark={dark}
                      pickPhotoLabel={pickPhotoLabel}
                      cameraLabel={cameraLabel}
                      pastePhotoLabel={pastePhotoLabel}
                      cameraReadyLabel={cameraReadyLabel}
                      capturePhotoLabel={capturePhotoLabel}
                      closeCameraLabel={closeCameraLabel}
                      cameraUnavailableLabel={cameraUnavailableLabel}
                      onAppendFiles={(files) => appendFiles(index, files)}
                      onRemoveFile={(fileIndex) => removeFile(index, fileIndex)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className={cn(
                      "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
                      dark
                        ? "border border-white/12 text-white/70 hover:bg-white/8"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          <button
            type="button"
            onClick={addBlankItem}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition",
              dark
                ? "bg-white text-slate-950 hover:bg-slate-100"
                : "bg-slate-950 text-white hover:bg-slate-800",
            )}
          >
            <Plus className="h-4 w-4" />
            {addLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
