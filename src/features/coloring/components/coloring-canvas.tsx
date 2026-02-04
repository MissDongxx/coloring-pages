"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Redo, Undo, Trash2, Heart, Share2, Sparkles, Plus, Minus, RotateCcw, Crosshair, ChevronLeft, Shuffle, Volume2, VolumeX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { ColorPickerDialog } from "@/features/coloring/components/color-picker-dialog";
import { DownloadDialog } from "@/features/coloring/components/download-dialog";
import { useTheme } from "@/features/coloring/contexts/theme-context";
import { useSound } from "@/features/coloring/contexts/sound-context";
import { getProxyUrl } from "@/features/coloring/lib/utils";

// Pastel colors (Soft Pastels palette)
const PASTEL_COLORS = [
  "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#E0BBE4",
  "#FDFD96", "#FFB347", "#FF6961", "#FF69B4", "#B39EB5", "#77DD77",
  "#AEC6CF", "#F49AC2", "#CB99C9", "#CFCFC4"
];

// Neon Cyberpunk gradients
const NEON_GRADIENTS = [
  { id: 1, colors: ["#FF0080", "#7928CA"], name: "Purple Pink" },
  { id: 2, colors: ["#00DFD8", "#7C3AED"], name: "Cyan Purple" },
  { id: 3, colors: ["#FF4D4D", "#F9CB28"], name: "Red Yellow" },
  { id: 4, colors: ["#00FF94", "#00CCFF"], name: "Green Blue" },
  { id: 5, colors: ["#FF0080", "#00FF94"], name: "Pink Green" },
  { id: 6, colors: ["#7928CA", "#FF0080"], name: "Vibrant Purple" },
  { id: 7, colors: ["#F9CB28", "#FF4D4D"], name: "Gold Red" },
  { id: 8, colors: ["#00CCFF", "#7928CA"], name: "Blue Violet" },
  { id: 9, colors: ["#FF69B4", "#00FF94"], name: "Hot Pink Lime" },
  { id: 10, colors: ["#7C3AED", "#00DFD8"], name: "Electric Purple" },
  { id: 11, colors: ["#FF6B6B", "#4ECDC4"], name: "Coral Teal" },
  { id: 12, colors: ["#A855F7", "#3B82F6"], name: "Purple Blue" },
];

// Color Palette Interface
interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  isGradient?: boolean;
  gradients?: { id: number; colors: string[]; name: string }[];
}

// Predefined Palettes
const PREDEFINED_PALETTES: ColorPalette[] = [
  {
    id: "pastels",
    name: "Soft Pastels",
    colors: PASTEL_COLORS,
  },
  {
    id: "neon",
    name: "Neon Gradients",
    colors: [],
    isGradient: true,
    gradients: NEON_GRADIENTS,
  },
  {
    id: "earth",
    name: "Earth Tones",
    colors: [
      "#8B4513", "#A0522D", "#D2691E", "#CD853F", "#DEB887",
      "#F4A460", "#D2B48C", "#BC8F8F", "#A0826D", "#8B7355"
    ],
  },
  {
    id: "ocean",
    name: "Ocean Blues",
    colors: [
      "#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#023E8A",
      "#48CAE4", "#ADE8F4", "#03045E", "#03045E", "#0096C7"
    ],
  },
  {
    id: "forest",
    name: "Forest Greens",
    colors: [
      "#2D6A4F", "#40916C", "#52B788", "#74C69D", "#95D5B2",
      "#B7E4C7", "#D8F3DC", "#1B4332", "#081C15", "#344E41"
    ],
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: [
      "#FF6B6B", "#FF8E53", "#FFA07A", "#FFB347", "#FFCC5C",
      "#FFDF96", "#FFEDA3", "#FFE5B4", "#FFDAB9", "#FFC0CB"
    ],
  },
  {
    id: "berry",
    name: "Berry Blends",
    colors: [
      "#C9184A", "#FF4D6D", "#FF758F", "#FF8FA3", "#FFB3C1",
      "#FFCCD5", "#FFF0F3", "#800F2F", "#A4133C", "#D90429"
    ],
  },
  {
    id: "rainbow",
    name: "Rainbow",
    colors: [
      "#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF",
      "#4B0082", "#9400D3", "#FF1493", "#00CED1", "#FFD700"
    ],
  },
];

interface ColoringCanvasProps {
  imageSrc: string;
  pageId?: string;
  title?: string;
  description?: string;
  category?: string;
}

export function ColoringCanvas({ imageSrc, pageId, title, description, category }: ColoringCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState("#FF0000");
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [magicMode, setMagicMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [isFavorited, setIsFavorited] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState<typeof NEON_GRADIENTS[0] | null>(null);
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [outlineOpacity, setOutlineOpacity] = useState(100);
  const [showOutlines, setShowOutlines] = useState(true);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [palettes, setPalettes] = useState<ColorPalette[]>(PREDEFINED_PALETTES);
  const [activePaletteId, setActivePaletteId] = useState("pastels");
  const [magicModeType, setMagicModeType] = useState<"solid" | "gradient">("gradient");
  const [magicColorHistory, setMagicColorHistory] = useState<typeof NEON_GRADIENTS>([]);
  const [aspectRatio, setAspectRatio] = useState(3 / 4);
  const { theme } = useTheme();
  const { isMuted, toggleMute, playSound } = useSound();
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isOverFillableArea, setIsOverFillableArea] = useState(true);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const originalImageDataRef = useRef<Uint8ClampedArray | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleGradientSelect = (gradient: typeof NEON_GRADIENTS[0]) => {
    setSelectedGradient(gradient);
    setSelectedColor(gradient.colors[0]);

    // Track gradient history for magic mode
    if (!magicColorHistory.find(g => g.id === gradient.id)) {
      setMagicColorHistory(prev => {
        const newHistory = [gradient, ...prev].slice(0, 10); // Keep last 10
        return newHistory;
      });
    }
  };

  // Track recently used colors
  useEffect(() => {
    if (selectedColor && !recentlyUsed.includes(selectedColor)) {
      setRecentlyUsed(prev => {
        const newHistory = [selectedColor, ...prev.filter(c => c !== selectedColor)];
        return newHistory.slice(0, 10); // Keep only last 10 colors
      });
    }
  }, [selectedColor]);

  const proxiedImageSrc = getProxyUrl(imageSrc);

  // Generate storage key based on image source
  const getStorageKey = () => `coloring-canvas-${imageSrc.split("/").pop()}`;

  // Auto-save to localStorage
  const saveToLocalStorage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        // Use JPEG compression (quality 0.7) instead of PNG for much smaller file size
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        localStorage.setItem(getStorageKey(), dataUrl);
        localStorage.setItem(`${getStorageKey()}-timestamp`, Date.now().toString());
        setSaveStatus("saved");
      } catch (error: any) {
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          console.warn('localStorage quota exceeded, clearing old entries...');
          // Clear all old coloring canvas entries except current one
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('coloring-canvas-') && key !== getStorageKey() && !key.endsWith('-timestamp')) {
              keysToRemove.push(key);
            }
          }
          // Remove old entries
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            localStorage.removeItem(`${key}-timestamp`);
          });
          // Try saving again
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            localStorage.setItem(getStorageKey(), dataUrl);
            localStorage.setItem(`${getStorageKey()}-timestamp`, Date.now().toString());
            setSaveStatus("saved");
          } catch (retryError) {
            console.error("Still failed to save after clearing old entries:", retryError);
            setSaveStatus("error");
          }
        } else {
          console.error("Failed to save to localStorage:", error);
          setSaveStatus("error");
        }
      }
    }, 500);
  };

  // Load from localStorage
  const loadFromLocalStorage = () => {
    try {
      const savedData = localStorage.getItem(getStorageKey());
      if (savedData) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (canvas && ctx) {
            ctx.drawImage(img, 0, 0);
            saveState();
          }
        };
        img.src = savedData;
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  };

  // Initialize Canvas with Image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = proxiedImageSrc;
    // Only set crossOrigin for same-origin requests (our proxy)
    if (!proxiedImageSrc.startsWith("/api/image-proxy")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      // Store original image for clear function
      originalImageRef.current = img;

      // Calculate scale to fit container width while maintaining aspect ratio
      const ratio = img.width / img.height;
      setAspectRatio(ratio);

      canvas.width = 800;
      canvas.height = 800 / ratio;

      // Draw white background first
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Draw image on top
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Capture original image data for flood fill
      const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      originalImageDataRef.current = originalData;

      // Try to load saved state
      loadFromLocalStorage();

      saveState();
    };
  }, [proxiedImageSrc]);

  useEffect(() => {
    if (historyIndex >= 0) {
      saveToLocalStorage();
    }
  }, [historyIndex]);

  // Apply outline settings whenever they change or history updates (undo/redo)
  useEffect(() => {
    applyOutlineSettings();
  }, [outlineColor, outlineOpacity, showOutlines, historyIndex]);

  const applyOutlineSettings = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const originalData = originalImageDataRef.current;

    if (!canvas || !ctx || !originalData) return;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const { r: outlineR, g: outlineG, b: outlineB } = hexToRgb(outlineColor);
    const opacity = outlineOpacity / 100;

    for (let i = 0; i < data.length; i += 4) {
      // Check original image data for line presence
      const r = originalData[i];
      const g = originalData[i + 1];
      const b = originalData[i + 2];
      const brightness = (r + g + b) / 3;

      // If it's part of the line art (not pure white paper)
      // Using 250 as threshold to catch anti-aliased edges
      if (brightness < 250) {
        // Determine target visual for this pixel
        let targetR, targetG, targetB;

        if (showOutlines) {
          // Tint formula: We want to map "Black" to "OutlineColor" and "White" to "White"
          // And "Gray" to a mix.
          // The ratio of "Whiteness" is brightness / 255.
          const ratio = brightness / 255;

          // New Color = White * Ratio + OutlineColor * (1 - Ratio)
          targetR = 255 * ratio + outlineR * (1 - ratio);
          targetG = 255 * ratio + outlineG * (1 - ratio);
          targetB = 255 * ratio + outlineB * (1 - ratio);
        } else {
          // If hidden, we want it to look like White Paper
          targetR = 255;
          targetG = 255;
          targetB = 255;
        }

        // Apply Opacity
        // If opacity < 1, we blend the Target outline with White (assuming paper background)
        // Note: We don't blend with "underlying fill" because we assume lines are on top of everything
        // and fills don't exist UNDER the core lines.
        // For anti-aliased "halos" (100..250), this might slightly lighten the intersection, but it's acceptable.

        const finalR = targetR * opacity + 255 * (1 - opacity);
        const finalG = targetG * opacity + 255 * (1 - opacity);
        const finalB = targetB * opacity + 255 * (1 - opacity);

        data[i] = finalR;
        data[i + 1] = finalG;
        data[i + 2] = finalB;
        // Alpha remains 255
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Reset position when zoomed out to 1 (fit to screen)
  useEffect(() => {
    if (zoom <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newState = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // If we are in middle of history, discard future
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);

    // Limit history size
    if (newHistory.length > 20) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    setHistoryIndex((prev) => prev - 1);
    const prevState = history[historyIndex - 1];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && prevState) {
      ctx.putImageData(prevState, 0, 0);
    }
    playSound("undo");
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    setHistoryIndex((prev) => prev + 1);
    const nextState = history[historyIndex + 1];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && nextState) {
      ctx.putImageData(nextState, 0, 0);
    }
    playSound("click");
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = originalImageRef.current;
    if (!canvas || !ctx || !img) return;

    // Redraw original image
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    saveState();
    playSound("clear");
  };

  const toggleZoom = () => {
    setZoom((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  };

  // Canvas navigation functions
  const zoomIn = () => setZoom(prev => Math.min(prev * 1.1, 5));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.1, 1));

  const resetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const centerView = () => {
    setPosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setZoom(prev => Math.max(1, Math.min(5, prev * delta)));
  };

  // Pan handlers
  const handlePanStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left mouse button
    if (zoom <= 1) return; // Disable panning when fitted
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePanMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePanEnd = () => {
    setIsDragging(false);
  };

  // Touch handlers for pinch zoom and pan
  const initialPinchDistance = useRef<number | null>(null);
  const initialZoom = useRef<number>(1);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // Single finger - start panning only if zoomed in
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y
        });
      }
    } else if (e.touches.length === 2) {
      // Two fingers - start pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      initialPinchDistance.current = distance;
      initialZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      // Single finger - pan
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      // Two fingers - pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = distance / initialPinchDistance.current;
      setZoom(Math.max(1, Math.min(5, initialZoom.current * scale)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialPinchDistance.current = null;
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const floodFill = (startX: number, startY: number, fillColorStr: string, gradient?: typeof NEON_GRADIENTS[0] | null) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Bounds check
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    // Use original image data for boundary detection
    const originalData = originalImageDataRef.current;
    if (!originalData) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const { r: fillR, g: fillG, b: fillB } = hexToRgb(fillColorStr);
    const startPos = (startY * width + startX) * 4;

    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];

    // Do nothing if clicking on same color (for solid fill)
    if (!gradient && startR === fillR && startG === fillG && startB === fillB) return;

    // Helper to check if a pixel is part of a fillable area (based on original image brightness)
    const isFillable = (idx: number) => {
      const pos = idx * 4;
      const r = originalData[pos];
      const g = originalData[pos + 1];
      const b = originalData[pos + 2];
      // Brightness calculation
      const brightness = (r + g + b) / 3;
      // Threshold for line art (lines are dark, space is light)
      return brightness >= 100;
    };

    // If start pixel is a line (not fillable), don't fill
    // However, allow some leniency if the user clicks slightly on the edge?
    // For now, strict check to match cursor feedback
    const startIdx = startY * width + startX;
    if (!isFillable(startIdx)) return;

    // Use Uint8Array for efficient visited tracking
    const visited = new Uint8Array(width * height);

    // Track bounding box for gradient
    let minY = height, maxY = 0;

    // Classic 4-direction BFS flood fill
    const queue: number[] = [];
    queue.push(startIdx);
    visited[startIdx] = 1;

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const x = idx % width;
      const y = Math.floor(idx / width);
      const pos = idx * 4;

      // Apply color or mark for gradient
      if (gradient) {
        // Mark with special alpha for gradient second pass
        data[pos + 3] = 254;
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      } else {
        data[pos] = fillR;
        data[pos + 1] = fillG;
        data[pos + 2] = fillB;
        data[pos + 3] = 255;
      }

      // Check 4 neighbors
      const neighbors = [
        { nx: x - 1, ny: y },     // left
        { nx: x + 1, ny: y },     // right
        { nx: x, ny: y - 1 },     // up
        { nx: x, ny: y + 1 },     // down
      ];

      for (const { nx, ny } of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (!visited[nIdx]) {
            // Check if neighbor is part of the fillable region (not an outline)
            if (isFillable(nIdx)) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            }
          }
        }
      }
    }

    // Apply gradient in second pass if needed
    if (gradient && gradient.colors.length >= 2) {
      // Use Canvas native gradient for smooth color transitions
      // Create an offscreen canvas to render the gradient
      const gradientCanvas = document.createElement('canvas');
      gradientCanvas.width = width;
      gradientCanvas.height = height;
      const gradientCtx = gradientCanvas.getContext('2d');

      if (gradientCtx) {
        // Create a linear gradient from top to bottom
        const linearGradient = gradientCtx.createLinearGradient(0, minY, 0, maxY);
        linearGradient.addColorStop(0, gradient.colors[0]);
        linearGradient.addColorStop(1, gradient.colors[1]);

        // Fill the offscreen canvas with the gradient
        gradientCtx.fillStyle = linearGradient;
        gradientCtx.fillRect(0, 0, width, height);

        // Get the gradient pixel data
        const gradientData = gradientCtx.getImageData(0, 0, width, height).data;

        // Apply gradient colors only to pixels marked with alpha=254
        for (let y = minY; y <= maxY; y++) {
          for (let x = 0; x < width; x++) {
            const pos = (y * width + x) * 4;
            if (data[pos + 3] === 254) {
              // Copy color from gradient canvas
              data[pos] = gradientData[pos];
              data[pos + 1] = gradientData[pos + 1];
              data[pos + 2] = gradientData[pos + 2];
              data[pos + 3] = 255;
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    saveState();
    playSound("fill");
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Bounds check
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    // In magic mode, automatically switch colors
    if (magicMode) {
      if (magicModeType === "gradient") {
        // Auto switch to a random gradient
        const neonPalette = palettes.find(p => p.id === "neon");
        if (neonPalette && neonPalette.gradients) {
          const randomGradient = neonPalette.gradients[Math.floor(Math.random() * neonPalette.gradients.length)];
          handleGradientSelect(randomGradient);
          floodFill(x, y, randomGradient.colors[0], randomGradient);
        }
      } else {
        // Solid mode: Auto switch to a random color from the active palette
        const activePalette = palettes.find(p => p.id === activePaletteId);
        if (activePalette && activePalette.colors.length > 0) {
          const randomColor = activePalette.colors[Math.floor(Math.random() * activePalette.colors.length)];
          setSelectedColor(randomColor);
          floodFill(x, y, randomColor, null);
        }
      }
    } else {
      // Use gradient if selected, otherwise solid color
      floodFill(x, y, selectedColor, selectedGradient);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Bounds check
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      setIsOverFillableArea(false);
      return;
    }

    // Check if the pixel is dark (outline) or light (fillable)
    // Check if the pixel is dark (outline) or light (fillable) based on ORIGINAL image
    const originalData = originalImageDataRef.current;
    if (originalData) {
      const idx = (y * canvas.width + x) * 4;
      // Ensure idx is within bounds
      if (idx < 0 || idx >= originalData.length) return;

      const r = originalData[idx];
      const g = originalData[idx + 1];
      const b = originalData[idx + 2];
      const brightness = (r + g + b) / 3;
      // Dark areas (outlines) have brightness < 100
      setIsOverFillableArea(brightness >= 100);
    }
  };

  const downloadCanvas = (format: "png" | "jpeg" | "pdf" = "png", quality: number = 100) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `coloring-page-${timestamp}`;

    if (format === "pdf") {
      // For PDF, we'll create a simple implementation using canvas data URL
      // In a real implementation, you'd use a library like jsPDF
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `${filename}.pdf`;
      link.href = dataUrl;
      link.click();
    } else {
      const mimeType = format === "png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(mimeType, quality / 100);
      const link = document.createElement("a");
      link.download = `${filename}.${format}`;
      link.href = dataUrl;
      link.click();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full items-start">
      {/* Main Canvas Area (Left) */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Canvas Area - This determines the height */}
        <div
          ref={containerRef}
          id="canvas-container"
          className="relative w-full border rounded-lg overflow-hidden bg-white shadow-inner touch-none flex items-center justify-center p-4"
          style={{
            aspectRatio,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onWheel={handleWheel}
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full origin-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transition: isDragging ? 'none' : 'transform 200ms ease-out',
              cursor: isDragging ? 'grabbing' : (isOverFillableArea ? 'crosshair' : 'not-allowed')
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
          />

          {/* Zoom Controls - Top Left/Right */}
          <div className="absolute top-4 left-4 flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-white hover:bg-gray-50"
              onClick={zoomOut}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-white hover:bg-gray-50"
              onClick={zoomIn}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* View Controls - Bottom Left/Right */}
          <div className="absolute bottom-4 right-4 flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-white hover:bg-gray-50"
              onClick={centerView}
              title="Center View"
            >
              <Crosshair className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-white hover:bg-gray-50"
              onClick={resetView}
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Floating Action Buttons */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-white hover:bg-pink-50 hover:border-pink-300"
              onClick={() => setIsFavorited(!isFavorited)}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? "fill-pink-500 text-pink-500" : ""}`} />
            </Button>
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shadow-lg bg-white hover:bg-blue-50 hover:border-blue-300"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Share this Coloring Page</DialogTitle>
                  <DialogDescription>
                    Share this fun coloring activity with friends and family!
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Link copied to clipboard!");
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: "Coloring Page",
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert("Link copied to clipboard!");
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    Share via...
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Sound Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-white hover:bg-purple-50 hover:border-purple-300"
              onClick={toggleMute}
              title={isMuted ? "Unmute Sounds" : "Mute Sounds"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Save Status */}
        <div className="text-center text-sm text-muted-foreground">
          {saveStatus === "saved" && "✓ Progress saved automatically!"}
          {saveStatus === "saving" && "Saving..."}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-center">
          {/* Previous Image */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {/* Generate New Image */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.location.href = "/"}
          >
            <Shuffle className="w-4 h-4" />
            New Page
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={historyIndex <= 0}
            className="gap-2"
          >
            <Undo className="w-4 h-4" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="gap-2"
          >
            <Redo className="w-4 h-4" />
            Redo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <DownloadDialog onDownload={downloadCanvas} />
          <Button
            variant="outline"
            size="sm"
            onClick={toggleZoom}
            className="gap-2"
          >
            <span className="font-bold">{Math.round(zoom * 100)}%</span>
            Zoom
          </Button>
        </div>
      </div>

      {/* Right Toolbar - Unified Management Panel */}
      <div className="w-full lg:w-96 flex flex-col gap-3">
        <div className={`border rounded-lg shadow-sm overflow-hidden flex flex-col h-full transition-colors duration-300 ${theme === 'night' ? 'bg-slate-800 border-slate-700' : 'bg-background border-gray-200'
        }`}>
          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 p-4 space-y-4 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <hr className="border-border" />

            {/* Color Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Colors</h3>

              {/* Magic Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={magicMode ? "default" : "outline"}
                  className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  onClick={() => setMagicMode(!magicMode)}
                >
                  <Sparkles className="w-4 h-4" />
                  {magicMode ? "Magic ON" : "Magic OFF"}
                </Button>
              </div>

              {/* Magic Mode Type Toggle */}
              {magicMode && (
                <div className="flex gap-2 p-2 bg-muted/50 rounded-lg">
                  <Button
                    variant={magicModeType === "solid" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setMagicModeType("solid")}
                  >
                    Solid
                  </Button>
                  <Button
                    variant={magicModeType === "gradient" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setMagicModeType("gradient")}
                  >
                    Gradient
                  </Button>
                </div>
              )}

              {/* Magic Mode Color History */}
              {magicMode && magicColorHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Magic History</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {magicColorHistory.map((gradient) => (
                      <button
                        key={gradient.id}
                        className={`aspect-square rounded-lg border-2 transition-all hover:scale-105 ${selectedGradient?.id === gradient.id
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-gray-200"
                          }`}
                        style={{
                          background: `linear-gradient(135deg, ${gradient.colors[0]}, ${gradient.colors[1]})`
                        }}
                        onClick={() => handleGradientSelect(gradient)}
                        aria-label={`Select gradient ${gradient.name}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Color Picker Dialog */}
              <ColorPickerDialog
                color={selectedColor}
                onChange={setSelectedColor}
              />

              {/* Palette Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                {palettes.map((palette) => (
                  <button
                    key={palette.id}
                    className={`px-3 py-1 text-xs whitespace-nowrap rounded-full transition-all ${activePaletteId === palette.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"
                      }`}
                    onClick={() => setActivePaletteId(palette.id)}
                  >
                    {palette.name}
                  </button>
                ))}
              </div>

              {/* Active Palette Colors */}
              {(() => {
                const activePalette = palettes.find(p => p.id === activePaletteId);
                if (!activePalette) return null;

                if (activePalette.isGradient && activePalette.gradients) {
                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-2">
                        {activePalette.gradients.map((gradient) => (
                          <button
                            key={gradient.id}
                            className={`aspect-square rounded-lg border-2 transition-all hover:scale-105 ${selectedGradient?.id === gradient.id && magicMode
                              ? "border-primary ring-2 ring-primary ring-offset-2"
                              : "border-gray-200"
                              }`}
                            style={{
                              background: `linear-gradient(135deg, ${gradient.colors[0]}, ${gradient.colors[1]})`
                            }}
                            onClick={() => handleGradientSelect(gradient)}
                            aria-label={`Select gradient ${gradient.name}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-2">
                      {activePalette.colors.map((color) => (
                        <button
                          key={color}
                          className={`aspect-square rounded-lg border-2 transition-all hover:scale-105 ${selectedColor === color && !magicMode
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-gray-200"
                        }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Recently Used */}
              {recentlyUsed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Recently Used</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {recentlyUsed.map((color) => (
                      <button
                        key={color}
                        className={`aspect-square rounded-lg border-2 transition-all hover:scale-105 ${selectedColor === color
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-gray-200"
                          }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Outline Settings */}
          <hr className="border-border" />
          <div className="space-y-3 px-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Outline Settings</h3>

            {/* Show/Hide Outlines Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Show Outlines</span>
              <Button
                variant={showOutlines ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOutlines(!showOutlines)}
              >
                {showOutlines ? "ON" : "OFF"}
              </Button>
            </div>

            {/* Outline Color Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Outline Color</span>
                <div
                  className="relative w-8 h-8 rounded border border-gray-300 cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                  style={{ backgroundColor: outlineColor }}
                >
                  <input
                    type="color"
                    value={outlineColor}
                    onChange={(e) => setOutlineColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Outline Opacity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Outline Opacity</span>
                <span className="text-xs text-muted-foreground">{outlineOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={outlineOpacity}
                onChange={(e) => setOutlineOpacity(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
