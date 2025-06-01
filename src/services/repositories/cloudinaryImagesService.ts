import imageCompression from "browser-image-compression";

export const uploadImageToCloudinary = async (
  file: File,
  uploadPreset: string,
  cloudName: string
): Promise<string> => {
  const tamanhoMaximoMB = 10;
  const tamanhoMaximoBytes = tamanhoMaximoMB * 1024 * 1024;

  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedBlob = await imageCompression(file, options);

    const compressedFile = new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });

    if (compressedFile.size > tamanhoMaximoBytes) {
      throw new Error("Imagem não pode ser maior do que 10MB.");
    }

    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao fazer upload da imagem");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Erro ao comprimir ou enviar a imagem:", error);
    throw error;
  }
};

export const deleteImageFromCloudinary = async (
  publicId: string,
  apiKey: string,
  apiSecret: string,
  cloudName: string
): Promise<void> => {
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const sha1 = await generateSHA1(stringToSign);

  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", sha1);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();

  if (result.result !== "ok") {
    // throw new Error(`Erro ao deletar imagem: ${result.result}`);
    return;
  }
};

export const extractPublicIdFromUrl = (url: string): string => {
  try {
    const withoutParams = url.split("?")[0];
    const parts = withoutParams.split("/");
    const uploadIndex = parts.findIndex((p) => p === "upload");

    const pathParts = parts.slice(uploadIndex + 1);

    if (pathParts[0]?.startsWith("v") && /^\d+$/.test(pathParts[0].slice(1))) {
      pathParts.shift();
    }

    const fileNameWithExt = pathParts.pop();
    const fileName = fileNameWithExt?.split(".")[0];

    return [...pathParts, fileName].join("/");
  } catch {
    return "";
  }
};

// Utilitário para gerar SHA1 no browser
const generateSHA1 = async (input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
