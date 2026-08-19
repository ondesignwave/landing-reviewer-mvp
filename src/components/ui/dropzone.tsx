"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload, File, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DropzoneProps {
  onFilesChange: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

export function Dropzone({
  onFilesChange,
  acceptedTypes = ["image/png", "image/jpeg", "application/pdf"],
  maxFiles = 5,
  maxSizeMB = 10,
  disabled = false,
  className,
}: DropzoneProps) {
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.some((t) => file.type === t || file.type.startsWith(t.replace("*", "")))) {
      return `Файл "${file.name}" — недопустимый тип. Разрешены: PNG, JPG, PDF`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Файл "${file.name}" превышает ${maxSizeMB}MB`;
    }
    return null;
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const errors: string[] = [];
    const validFiles: File[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) errors.push(error);
      else validFiles.push(file);
    }

    if (files.length + validFiles.length > maxFiles) {
      errors.push(`Максимум ${maxFiles} файлов`);
      validFiles.splice(maxFiles - files.length);
    }

    if (errors.length) {
      alert(errors.join("\n"));
    }

    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange(updated);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
        aria-label="Загрузить файлы"
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all",
          "bg-muted/30 hover:bg-muted/50",
          isDragActive && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Перетащите файлы сюда или нажмите для загрузки
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG, JPG, PDF · до {maxSizeMB}MB · макс. {maxFiles} файлов
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3" role="list" aria-label="Загруженные файлы">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-card border rounded-lg"
              role="listitem"
            >
              <div className="flex items-center gap-3">
                {file.type.startsWith("image/") ? (
                  <Image className="h-5 w-5 text-primary" />
                ) : (
                  <File className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
                aria-label={`Удалить ${file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}