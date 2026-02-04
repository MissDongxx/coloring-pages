"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Palette } from "lucide-react";

interface ColorPickerDialogProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPickerDialog({ color, onChange }: ColorPickerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [hexValue, setHexValue] = useState(color);
  const saturationPickerRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const isDraggingSaturation = useRef(false);
  const isDraggingHue = useRef(false);

  // Convert HSB to HEX
  const hsbToHex = (h: number, s: number, b: number): string => {
    s /= 100;
    b /= 100;
    const c = b * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = b - c;
    let r = 0, g = 0, b_val = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b_val = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b_val = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b_val = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b_val = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b_val = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b_val = x; }

    const toHex = (val: number) => {
      const hex = Math.round((val + m) * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b_val)}`.toUpperCase();
  };

  // Convert HEX to HSB
  const hexToHsb = (hex: string): { h: number; s: number; b: number } => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / delta + 2) * 60;
      else h = ((r - g) / delta + 4) * 60;
    }

    const s = max === 0 ? 0 : (delta / max) * 100;
    const b_val = max * 100;

    return { h: Math.round(h), s: Math.round(s), b: Math.round(b_val) };
  };

  // Initialize HSB values from current color
  useEffect(() => {
    const hsb = hexToHsb(color);
    setHue(hsb.h);
    setSaturation(hsb.s);
    setBrightness(hsb.b);
    setHexValue(color);
  }, [color]);

  // Update color when HSB changes
  useEffect(() => {
    const newColor = hsbToHex(hue, saturation, brightness);
    setHexValue(newColor);
  }, [hue, saturation, brightness]);

  // Handle saturation/brightness picker
  const handleSaturationPickerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingSaturation.current = true;
    updateSaturationBrightness(e);
  };

  const updateSaturationBrightness = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!saturationPickerRef.current) return;
    const rect = saturationPickerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    setSaturation(x * 100);
    setBrightness(y * 100);
  };

  // Handle hue slider
  const handleHueSliderMouseDown = () => {
    isDraggingHue.current = true;
  };

  const updateHue = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHue(x * 360);
  };

  // Global mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSaturation.current) {
        updateSaturationBrightness(e);
      }
      if (isDraggingHue.current) {
        updateHue(e);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSaturation.current) {
        isDraggingSaturation.current = false;
        onChange(hexValue);
      }
      if (isDraggingHue.current) {
        isDraggingHue.current = false;
        onChange(hexValue);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [hexValue, hue, saturation, brightness]);

  // Handle HEX input
  const handleHexChange = (value: string) => {
    const hex = value.startsWith("#") ? value : "#" + value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setHexValue(hex);
      const hsb = hexToHsb(hex);
      setHue(hsb.h);
      setSaturation(hsb.s);
      setBrightness(hsb.b);
      onChange(hex);
    }
  };

  const handleConfirm = () => {
    onChange(hexValue);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          size="sm"
        >
          <Palette className="w-4 h-4" />
          Selected Color
          <span
            className="ml-auto w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: color }}
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Color</DialogTitle>
          <DialogDescription>
            Pick any color using the color picker or enter a HEX code.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Color Preview */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-lg border-2 border-border shadow-inner"
              style={{ backgroundColor: hexValue }}
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Selected Color</div>
              <div className="text-xs text-muted-foreground mt-1">
                H: {Math.round(hue)}° S: {Math.round(saturation)}% B: {Math.round(brightness)}%
              </div>
            </div>
          </div>

          {/* Saturation/Brightness Picker */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Saturation & Brightness</div>
            <div
              ref={saturationPickerRef}
              className="relative w-full h-32 rounded-lg border border-border cursor-crosshair"
              onMouseDown={handleSaturationPickerMouseDown}
              style={{
                background: `linear-gradient(to right, white, hsl(${hue}, 100%, 50%)), linear-gradient(to top, black, transparent)`,
                backgroundBlendMode: "multiply, multiply"
              }}
            >
              {/* Color indicator */}
              <div
                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${saturation}%`,
                  top: `${100 - brightness}%`,
                  backgroundColor: hexValue
                }}
              />
            </div>
          </div>

          {/* Hue Slider */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Hue</div>
            <div
              ref={hueSliderRef}
              className="relative w-full h-6 rounded-lg border border-border cursor-pointer"
              onMouseDown={handleHueSliderMouseDown}
              style={{
                background: `linear-gradient(to right,
                  hsl(0, 100%, 50%),
                  hsl(60, 100%, 50%),
                  hsl(120, 100%, 50%),
                  hsl(180, 100%, 50%),
                  hsl(240, 100%, 50%),
                  hsl(300, 100%, 50%),
                  hsl(360, 100%, 50%))`
              }}
            >
              {/* Hue indicator */}
              <div
                className="absolute top-0 bottom-0 w-2 bg-white border border-gray-300 rounded shadow-md pointer-events-none transform -translate-x-1/2"
                style={{ left: `${(hue / 360) * 100}%` }}
              />
            </div>
          </div>

          {/* HEX Input */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">HEX Code</div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  #
                </span>
                <input
                  type="text"
                  value={hexValue.slice(1)}
                  onChange={(e) => handleHexChange(e.target.value)}
                  maxLength={6}
                  className="w-full pl-8 pr-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleConfirm} className="flex-1">
              Select Color
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
