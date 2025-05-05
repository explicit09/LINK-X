"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface UploadPdfProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  moduleId: string;
}

export default function UploadPdf({
  onUpload,
  uploading,
  moduleId,
}: UploadPdfProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [pdfToUpload, setPdfToUpload] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfToUpload(file);
      setPreviewPdfUrl(URL.createObjectURL(file));
    }
  };

  const handleCancelPreview = () => {
    setPreviewPdfUrl(null);
    setPdfToUpload(null);
  };

  const handleConfirmUpload = async () => {
    if (pdfToUpload) {
      await onUpload(pdfToUpload);
      handleCancelPreview();
    }
  };

  return (
    <div className="border p-4 rounded shadow space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Upload a PDF</h3>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!previewPdfUrl && (
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "Choose PDF"}
        </Button>
      )}

      {previewPdfUrl && (
        <div className="space-y-4">
          <iframe
            src={previewPdfUrl}
            className="w-full h-[400px] border rounded-md"
            title="PDF Preview"
          ></iframe>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelPreview}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={uploading}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              {uploading ? "Uploading…" : "Confirm Upload"}
            </Button>
          </div>
        </div>
      )}

      {uploading && !previewPdfUrl && (
        <p className="text-sm text-blue-600">Uploading and processing…</p>
      )}
    </div>
  );
}
