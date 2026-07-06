'use client';

import { useState, useRef } from 'react';

interface PhotoUploadProps {
  onUploadComplete?: (garment: any) => void;
}

export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setSuccess(`✓ Garment "${data.garment?.name}" uploaded and analyzed!`);
      onUploadComplete?.(data.garment);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading photo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="photo-upload">
      <div className="upload-box">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isLoading}
          style={{ display: 'none' }}
          id="photo-input"
        />
        <label
          htmlFor="photo-input"
          style={{
            display: 'block',
            padding: '2rem',
            border: '2px dashed #ddd',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
          <div style={{ fontWeight: 'bold' }}>
            {isLoading ? 'Analyzing...' : 'Drag photo or click to upload'}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            Supported: JPG, PNG
          </div>
        </label>
      </div>

      {error && (
        <div style={{ color: 'red', marginTop: '1rem', padding: '0.5rem', background: '#ffe0e0', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: 'green', marginTop: '1rem', padding: '0.5rem', background: '#e0ffe0', borderRadius: '4px' }}>
          {success}
        </div>
      )}
    </div>
  );
}
