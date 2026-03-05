"use client";

import { useState } from "react";
import * as tus from "tus-js-client";

type BunnyUploaderProps = {
  title?: string;
  videoIdInputName?: string;
  libraryIdInputName?: string;
  initialVideoId?: string | null;
  initialLibraryId?: string | null;
};

type CreateUploadResponse = {
  videoId: string;
  libraryId: string;
  expirationTime: number;
  signature: string;
};

export function BunnyUploader({
  title = "Video",
  videoIdInputName = "bunnyVideoId",
  libraryIdInputName = "bunnyLibraryId",
  initialVideoId,
  initialLibraryId,
}: BunnyUploaderProps) {
  const [videoId, setVideoId] = useState(initialVideoId ?? "");
  const [libraryId, setLibraryId] = useState(initialLibraryId ?? "");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>(initialVideoId ? "Existing video attached" : "No video uploaded");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setStatus("Preparing upload...");
    setProgress(0);

    const createResponse = await fetch("/api/bunny/create-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: file.name }),
    });

    const createPayload = (await createResponse.json()) as
      | CreateUploadResponse
      | {
          error?: string;
        };

    if (!createResponse.ok || !("videoId" in createPayload)) {
      setStatus(("error" in createPayload && createPayload.error) || "Failed to initialize upload");
      return;
    }

    const upload = new tus.Upload(file, {
      endpoint: "https://video.bunnycdn.com/tusupload",
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: createPayload.signature,
        AuthorizationExpire: String(createPayload.expirationTime),
        VideoId: createPayload.videoId,
        LibraryId: String(createPayload.libraryId),
      },
      metadata: {
        filetype: file.type || "video/mp4",
        title: file.name,
      },
      uploadSize: file.size,
      onError(error) {
        setStatus(`Upload failed: ${error.message}`);
      },
      onProgress(bytesUploaded, bytesTotal) {
        const nextProgress = Math.round((bytesUploaded / bytesTotal) * 100);
        setProgress(nextProgress);
        setStatus(`Uploading... ${nextProgress}%`);
      },
      onSuccess() {
        setVideoId(createPayload.videoId);
        setLibraryId(String(createPayload.libraryId));
        setProgress(100);
        setStatus("Upload complete");
      },
    });

    upload.start();
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <label className="block text-sm font-medium text-zinc-900">{title}</label>
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
      />
      <p className="text-xs text-zinc-700">{status}</p>
      {progress > 0 ? (
        <div className="h-2 w-full overflow-hidden rounded bg-zinc-200">
          <div className="h-full bg-zinc-900 transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <input type="hidden" name={videoIdInputName} value={videoId} />
      <input type="hidden" name={libraryIdInputName} value={libraryId} />
    </div>
  );
}
