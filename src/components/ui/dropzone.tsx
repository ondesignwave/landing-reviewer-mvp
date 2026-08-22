"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn, pluralizeRu } from "@/lib/utils";
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

    const remaining = maxFiles - files.length;
    if (validFiles.length > remaining) {
      const skipped = validFiles.length - Math.max(0, remaining);
      errors.push(
        remaining > 0
          ? `Добавлено ${remaining} из ${validFiles.length} — осталось место только на ${remaining} ${pluralizeRu(remaining, "файл", "файла", "файлов")} (пропущено ${skipped})`
          : `Лимит ${maxFiles} ${pluralizeRu(maxFiles, "файл", "файла", "файлов")} уже достигнут`
      );
      validFiles.splice(Math.max(0, remaining));
    }

    if (errors.length) {
      errors.forEach((message) => toast.error(message));
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

  const confirmRemoveFile = (index: number, name: string) => {
    toast(`Удалить «${name}»?`, {
      action: { label: "Удалить", onClick: () => removeFile(index) },
      cancel: { label: "Отмена", onClick: () => {} },
    });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  };

  const limitReached = files.length >= maxFiles;

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Файлы</span>
        <span className={cn("text-sm tabular-nums", limitReached ? "text-destructive" : "text-muted-foreground")}>
          {files.length}/{maxFiles}
        </span>
      </div>
      {limitReached ? (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/10">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Лимит {maxFiles} {pluralizeRu(maxFiles, "файл", "файла", "файлов")} достигнут
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Удалите файл ниже, чтобы добавить другой
          </p>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all",
            "bg-muted/30 hover:bg-muted/50",
            isDragActive && "border-primary bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
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
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Перетащите файлы сюда или нажмите для загрузки
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG, PDF · до {maxSizeMB}MB ·{" "}
            {files.length === 0
              ? `макс. ${maxFiles} ${pluralizeRu(maxFiles, "файл", "файла", "файлов")}`
              : `можно добавить ещё ${maxFiles - files.length} ${pluralizeRu(maxFiles - files.length, "файл", "файла", "файлов")}`}
          </p>
        </div>
      )}

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
                onClick={() => confirmRemoveFile(index, file.name)}
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