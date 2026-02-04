"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Download } from "lucide-react";

interface DownloadDialogProps {
  onDownload: (format: "png" | "jpeg" | "pdf", quality: number) => void;
}

export function DownloadDialog({ onDownload }: DownloadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<"png" | "jpeg" | "pdf">("png");
  const [quality, setQuality] = useState(100);

  const handleDownload = () => {
    onDownload(format, quality);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Download
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Coloring Page</DialogTitle>
          <DialogDescription>
            Choose your preferred format and quality settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Format</div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={format === "png" ? "default" : "outline"}
                onClick={() => setFormat("png")}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <div className="text-lg font-bold">PNG</div>
                <div className="text-xs opacity-70">Lossless</div>
              </Button>
              <Button
                variant={format === "jpeg" ? "default" : "outline"}
                onClick={() => setFormat("jpeg")}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <div className="text-lg font-bold">JPEG</div>
                <div className="text-xs opacity-70">Smaller</div>
              </Button>
              <Button
                variant={format === "pdf" ? "default" : "outline"}
                onClick={() => setFormat("pdf")}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <div className="text-lg font-bold">PDF</div>
                <div className="text-xs opacity-70">Printable</div>
              </Button>
            </div>
          </div>

          {/* Quality Slider (for JPEG) */}
          {format === "jpeg" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">Quality</div>
                <div className="text-xs text-muted-foreground">{quality}%</div>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
          )}

          {/* Format Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs font-medium mb-1">Format Details</div>
            {format === "png" && (
              <div className="text-xs text-muted-foreground">
                PNG format preserves all image quality with no compression. Best for printing and further editing.
              </div>
            )}
            {format === "jpeg" && (
              <div className="text-xs text-muted-foreground">
                JPEG format compresses the image for smaller file size. Quality adjustable from 10% to 100%.
              </div>
            )}
            {format === "pdf" && (
              <div className="text-xs text-muted-foreground">
                PDF format optimized for printing. Includes page formatting and is compatible with most printers.
              </div>
            )}
          </div>

          {/* Download Button */}
          <Button onClick={handleDownload} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Download as {format.toUpperCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
