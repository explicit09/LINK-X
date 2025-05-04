"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

interface Module {
  id: string;
  title: string;
}

interface UploadPdfProps {
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  modules: Module[];
  selectedModuleId: string | null;
  setSelectedModuleId: (id: string) => void;
}

export default function UploadPdf({
  onUpload,
  uploading,
  modules,
  selectedModuleId,
  setSelectedModuleId,
}: UploadPdfProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border p-4 rounded shadow space-y-4">
      <h3 className="text-lg font-semibold">Upload a PDF to index</h3>

      {/* Module selection */}
      <div>
        <label htmlFor="module-select" className="block text-sm font-medium mb-1">
          Select Module
        </label>
        <select
          id="module-select"
          value={selectedModuleId || ""}
          onChange={(e) => setSelectedModuleId(e.target.value)}
          className="w-full p-3 rounded border border-gray-300 bg-white text-black placeholder-gray-500 focus:outline-none focus:ring focus:ring-blue-300"
        >
          <option value="">-- Choose a module --</option>
          {modules.map((mod) => (
            <option key={mod.id} value={mod.id}>
              {mod.title}
            </option>
          ))}
        </select>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
        className="hidden"
      />

      {/* Trigger button */}
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={uploading || !selectedModuleId}
      >
        {uploading ? "Uploading…" : "Choose PDF"}
      </Button>

      {uploading && (
        <p className="text-sm text-blue-600">Uploading and processing…</p>
      )}
    </div>
  );
}
