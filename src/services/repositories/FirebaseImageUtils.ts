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
    const compressedBlob = await imageCompression(file, options);

    const compressedFile = new File([compressedBlob], file.name, {
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
