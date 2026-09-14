import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, RefreshCw, AlertCircle, CheckCircle2, User, Loader2 } from 'lucide-react';
import { validateImageFile } from '../../services/imageStorageService';

export interface ProfilePhotoUploaderProps {
  currentPhotoUrl?: string;
  displayName: string;
  subtitle?: string;
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<string>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  shape?: 'circle' | 'rounded';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  primaryColor?: string;
  secondaryColor?: string;
}

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  currentPhotoUrl,
  displayName,
  subtitle,
  onUpload,
  onRemove,
  disabled = false,
  shape = 'circle',
  size = 'lg',
  primaryColor = '#002147',
  secondaryColor = '#D4AF37'
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Size mapping
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-28 h-28 text-base',
    xl: 'w-36 h-36 text-lg'
  }[size];

  const roundedClasses = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  // Initials generator
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate
    const validation = await validateImageFile(file, 5);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid image file.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      await onUpload(file, (percent) => {
        setUploadProgress(percent);
      });

      setSuccessMsg('Photo updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('[PHOTO UPLOADER] Error during upload:', err);
      setErrorMsg(err.message || 'Failed to upload photo. Please check storage rules and try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemovePhoto = async () => {
    if (!onRemove || disabled || isUploading) return;
    setErrorMsg(null);
    try {
      setIsUploading(true);
      await onRemove();
      setSuccessMsg('Photo removed.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Passport Photo Frame */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        className={`relative shrink-0 ${sizeClasses} ${roundedClasses} border-2 overflow-hidden cursor-pointer group shadow-md transition-all duration-200 ${
          isDragging ? 'border-amber-400 scale-105 ring-4 ring-amber-400/20' : 'border-slate-200 hover:border-slate-400'
        } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
        style={{
          borderColor: isDragging ? secondaryColor : undefined
        }}
        title={disabled ? undefined : 'Click or drag & drop to upload/replace photo'}
      >
        {/* Actual Image or Fallback */}
        {currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              // Hide broken image link and fall back to initials
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center font-black tracking-wider transition-colors select-none"
            style={{ 
              backgroundColor: primaryColor,
              color: secondaryColor 
            }}
          >
            {getInitials(displayName)}
          </div>
        )}

        {/* Hover / Active Overlay */}
        {!disabled && !isUploading && (
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity backdrop-blur-[1px]">
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold tracking-tight">Change</span>
          </div>
        )}

        {/* Uploading Spinner & Progress */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white p-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-1" />
            <span className="text-[10px] font-black">{uploadProgress > 0 ? `${uploadProgress}%` : 'Processing...'}</span>
          </div>
        )}
      </div>

      {/* Controls & Details */}
      <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
        <div>
          <h4 className="text-xs font-black text-slate-800 truncate">{displayName}</h4>
          {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
        </div>

        {/* Upload Action Buttons */}
        {!disabled && (
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              {currentPhotoUrl ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Replace Photo</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>Upload Photo</span>
                </>
              )}
            </button>

            {currentPhotoUrl && onRemove && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemovePhoto}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {isUploading && uploadProgress > 0 && (
          <div className="w-full max-w-xs space-y-1">
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${uploadProgress}%`,
                  backgroundColor: secondaryColor || '#D4AF37'
                }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Uploading to secure school storage ({uploadProgress}%)...</p>
          </div>
        )}

        {/* Success or Error Messages */}
        {errorMsg && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <p className="text-[10px] text-slate-400">
          Format: JPG, PNG, WEBP (Max 5 MB). Uploads automatically to school storage.
        </p>
      </div>
    </div>
  );
};
