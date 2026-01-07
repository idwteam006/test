'use client';

/**
 * File Upload Component
 * Reusable component for uploading files to S3
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Upload, File, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  category?: string;
  maxSize?: number; // in MB
  accept?: Record<string, string[]>;
  multiple?: boolean;
  onSuccess?: (fileUrl: string, fileData: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

export default function FileUpload({
  category = 'employees/documents',
  maxSize = 10,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
  },
  multiple = false,
  onSuccess,
  onError,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; status: 'success' | 'error' }>>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);

    for (const file of acceptedFiles) {
      // Check file size
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > maxSize) {
        toast.error(`${file.name} is too large`, {
          description: `File must be smaller than ${maxSize}MB`,
        });
        setUploadedFiles(prev => [...prev, { name: file.name, status: 'error' }]);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success(`${file.name} uploaded successfully`);
          setUploadedFiles(prev => [...prev, { name: file.name, status: 'success' }]);
          onSuccess?.(data.data.fileUrl, data.data);
        } else {
          const errorMsg = data.error || 'Upload failed';
          toast.error(`${file.name} upload failed`, {
            description: errorMsg,
          });
          setUploadedFiles(prev => [...prev, { name: file.name, status: 'error' }]);
          onError?.(errorMsg);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Upload failed';
        toast.error(`${file.name} upload failed`, {
          description: errorMsg,
        });
        setUploadedFiles(prev => [...prev, { name: file.name, status: 'error' }]);
        onError?.(errorMsg);
      }
    }

    setUploading(false);
  }, [category, maxSize, onSuccess, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          {uploading ? (
            <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
          ) : (
            <Upload className={`h-12 w-12 ${isDragActive ? 'text-purple-600' : 'text-gray-400'}`} />
          )}

          <div>
            <p className="text-base font-medium text-gray-900">
              {uploading ? 'Uploading...' : isDragActive ? 'Drop files here' : 'Click or drag file to upload'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Support for {multiple ? 'multiple files' : 'single file'}. Max file size: {maxSize}MB
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepted formats: {Object.values(accept).flat().join(', ')}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Uploaded files list */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {uploadedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{file.name}</span>
                {file.status === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
