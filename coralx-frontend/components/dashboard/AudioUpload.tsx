'use client';

import React, { useRef } from 'react';
import { Plus } from 'lucide-react';

export default function AudioUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('http://localhost:8080/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Transcription:', data);
      alert(`Transcription:\n\n${data.text || JSON.stringify(data)}`);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Something went wrong uploading the file');
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
      >
        <Plus className="mr-2 h-4 w-4" />
        Upload Audio
      </button>
    </div>
  );
}
