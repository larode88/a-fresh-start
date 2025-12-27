import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "square";
  aspectRatio?: number;
  placeholder?: React.ReactNode;
  disabled?: boolean;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<{ file: File; url: string }> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  canvas.width = crop.width;
  canvas.height = crop.height;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const file = new File([blob], fileName, { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        resolve({ file, url });
      },
      "image/jpeg",
      0.9
    );
  });
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

export const ImageUpload = ({
  value,
  onChange,
  className,
  size = "md",
  shape = "circle",
  aspectRatio = 1,
  placeholder,
  disabled = false,
}: ImageUploadProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgSrc(reader.result?.toString() || "");
      setDialogOpen(true);
    });
    reader.readAsDataURL(file);
    
    // Reset input
    if (inputRef.current) inputRef.current.value = "";
  };

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const { file, url } = await getCroppedImg(
        imgRef.current,
        completedCrop,
        "cropped-image.jpg"
      );
      onChange(file, url);
      setDialogOpen(false);
      setImgSrc("");
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  return (
    <>
      <div
        className={cn(
          "relative group cursor-pointer",
          sizeClasses[size],
          shape === "circle" ? "rounded-full" : "rounded-lg",
          "bg-muted border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors",
          "flex items-center justify-center overflow-hidden",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:text-destructive hover:bg-white/20"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            {placeholder || <Upload className="h-6 w-6" />}
          </div>
        )}
        
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tilpass bilde</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                circularCrop={shape === "circle"}
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop"
                  onLoad={onImageLoad}
                  style={{ maxHeight: "400px" }}
                />
              </ReactCrop>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Avbryt
            </Button>
            <Button onClick={handleCropComplete} disabled={!completedCrop}>
              Bruk bilde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
