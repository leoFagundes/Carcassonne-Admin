import imageCompression from "browser-image-compression";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const tamanhoMaximoMB = 10;
const tamanhoMaximoBytes = tamanhoMaximoMB * 1024 * 1024;

// Fotos tiradas em iPhone (config. padrão) vêm no formato HEIC/HEIF, que os
// navegadores não sabem decodificar em canvas — é por isso que a compressão
// falha silenciosamente só em algumas fotos do celular (as em HEIC), e nunca
// quando a mesma foto chega por um caminho que já converte pra JPEG (ex:
// mandar pro computador via WhatsApp/e-mail).
function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function convertHeicToJpeg(file: File): Promise<File> {
  // Import dinâmico: um dos módulos internos do heic2any referencia `window`
  // já na avaliação do módulo, o que quebra o build (SSR/prerender no Next
  // roda em Node, sem `window`). Import dinâmico só carrega no navegador.
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const convertedBlob = Array.isArray(result) ? result[0] : result;
  const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg") || "foto.jpg";
  return new File([convertedBlob], newName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export const uploadImageToFirebase = async (
  file: File,
  folderPath = "uploads"
): Promise<{ url: string; path: string }> => {
  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    let sourceFile = file;
    if (isHeicFile(file)) {
      try {
        sourceFile = await convertHeicToJpeg(file);
      } catch (heicError) {
        console.error("Erro ao converter HEIC para JPEG:", heicError);
        throw new Error(
          "Não foi possível processar essa foto (formato HEIC do iPhone). Tente novamente ou, em Ajustes > Câmera > Formatos, troque para 'Mais compatível'."
        );
      }
    }

    const compressedBlob = await imageCompression(sourceFile, options);

    const compressedFile = new File([compressedBlob], sourceFile.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });

    if (compressedFile.size > tamanhoMaximoBytes) {
      throw new Error("Imagem não pode ser maior do que 10MB.");
    }

    const storage = getStorage();
    const filePath = `${folderPath}/${uuidv4()}_${compressedFile.name}`;
    const imageRef = ref(storage, filePath);

    await uploadBytes(imageRef, compressedFile);
    const url = await getDownloadURL(imageRef);

    return { url, path: filePath };
  } catch (error) {
    console.error("Erro ao comprimir ou enviar a imagem:", error);
    throw error;
  }
};

export const deleteImageFromFirebase = async (
  filePath: string
): Promise<void> => {
  try {
    const storage = getStorage();
    const imageRef = ref(storage, filePath);
    await deleteObject(imageRef);
  } catch (error) {
    console.error("Erro ao deletar imagem do Firebase:", error);
    // Pode lançar erro se quiser
  }
};

export const getPathFromFirebaseUrl = (url: string): string => {
  try {
    const decodedUrl = decodeURIComponent(url);
    const match = decodedUrl.match(/o\/(.*?)\?/);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error("Path não encontrado na URL.");
  } catch (e) {
    console.error("Erro ao extrair path da URL:", e);
    return "";
  }
};
