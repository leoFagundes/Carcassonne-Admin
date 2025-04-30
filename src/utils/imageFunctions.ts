import { storage } from "@/services/firebaseConfig";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  getStorage,
  deleteObject,
} from "firebase/storage";

export async function uploadImage(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

export const deleteImageFromStorage = async (imageUrl: string) => {
  if (!imageUrl) return;

  try {
    const storage = getStorage();

    const decodedUrl = decodeURIComponent(imageUrl);
    const pathStart = decodedUrl.indexOf("/o/") + 3;
    const pathEnd = decodedUrl.indexOf("?");
    const path = decodedUrl.substring(pathStart, pathEnd);

    const imageRef = ref(storage, path);
    await deleteObject(imageRef);
    console.log("Imagem deletada com sucesso.");
  } catch (error) {
    console.error("Erro ao deletar imagem do storage:", error);
  }
};
