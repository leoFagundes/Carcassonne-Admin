import { PixelCrop } from "react-image-crop";

export async function getCroppedImageFile(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  mimeType = "image/jpeg"
): Promise<File> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const cropWidth = Math.max(1, Math.round(crop.width * scaleX));
  const cropHeight = Math.max(1, Math.round(crop.height * scaleY));

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar o recorte da imagem.");
  }

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem recortada."))),
      mimeType,
      0.92
    );
  });

  return new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
}
