export const uploadImageToCloudinary = async (
  file: File,
  uploadPreset: string,
  cloudName: string
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
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
  return data.secure_url; // URL final da imagem
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

  console.log("PUBLIC ID PARA DELETAR:", publicId);
  const result = await response.json();
  console.log("Cloudinary delete result:", result);

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
