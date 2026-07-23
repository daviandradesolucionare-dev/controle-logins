import { useRef, useState } from "react";
import { Loader2, Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { saveProfile } from "@/lib/profile";
import { recordRecentGif, type Gif } from "@/lib/gifs";
import { GifExplorer } from "@/components/gif-explorer";

interface ProfilePhotoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  name: string;
  onSaved: (result: {
    photoUrl?: string | null;
    avatarType: "image" | "gif";
    gifUrl?: string | null;
    gifPreviewUrl?: string | null;
    gifId?: string | null;
  }) => Promise<void> | void;
}

const AVATAR_SIZE = 512;

// Recorta a imagem em um quadrado central (crop automático) e reduz
// qualidade/tamanho antes do upload, sem precisar de UI de crop manual.
async function autoCropAndCompress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao compactar a imagem."))),
      "image/webp",
      0.85,
    );
  });
}

export function ProfilePhotoModal({
  open,
  onOpenChange,
  userId,
  name,
  onSaved,
}: ProfilePhotoModalProps) {
  const [tab, setTab] = useState<"imagem" | "gif">("imagem");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectingGif, setSelectingGif] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      toast.error("Envie uma imagem PNG, JPG ou WEBP de até 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const compressed = await autoCropAndCompress(file);
      setPreview(URL.createObjectURL(compressed));
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { contentType: "image/webp", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await saveProfile({ id: userId, name, photoUrl: data.publicUrl, avatarType: "image" });
      await onSaved({ photoUrl: data.publicUrl, avatarType: "image" });
      toast.success("Foto de perfil atualizada.");
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível enviar a foto: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectGif = async (gif: Gif) => {
    setSelectingGif(true);
    try {
      await saveProfile({
        id: userId,
        name,
        photoUrl: null,
        avatarType: "gif",
        gifId: gif.id,
        gifUrl: gif.url,
        gifPreviewUrl: gif.previewUrl,
      });
      recordRecentGif(gif).catch(() => undefined);
      await onSaved({
        avatarType: "gif",
        gifUrl: gif.url,
        gifPreviewUrl: gif.previewUrl,
        gifId: gif.id,
      });
      toast.success("Avatar animado atualizado.");
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível salvar o GIF: " + (error as Error).message);
    } finally {
      setSelectingGif(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(680px,85vh)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Alterar Foto de Perfil</DialogTitle>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "imagem" | "gif")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="imagem">Imagem</TabsTrigger>
            <TabsTrigger value="gif">GIF</TabsTrigger>
          </TabsList>

          <TabsContent
            value="imagem"
            className="mt-4 flex-1 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200"
          >
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void processFile(file);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-input",
              )}
            >
              {uploading ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : preview ? (
                <img
                  src={preview}
                  alt="Pré-visualização"
                  className="h-32 w-32 rounded-full border object-cover"
                />
              ) : (
                <ImagePlus className="h-10 w-10 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Arraste uma imagem aqui</p>
                <p className="text-xs text-muted-foreground">
                  ou clique para selecionar — PNG, JPG ou WEBP até 8MB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Escolher arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void processFile(file);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                A imagem é recortada automaticamente no centro e compactada antes do envio.
              </p>
            </div>
          </TabsContent>

          <TabsContent
            value="gif"
            className="mt-4 min-h-0 flex-1 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200"
          >
            <GifExplorer onSelect={handleSelectGif} selecting={selectingGif} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
