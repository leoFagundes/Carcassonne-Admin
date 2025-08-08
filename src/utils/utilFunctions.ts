export const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

export const generateRandomNumber = (
  minNumber: number = 0,
  maxNumber: number
): number => {
  return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
};

export function highlightMatch(text: string, search: string = "") {
  if (!search) return text;
  const safeSearch = escapeRegExp(search);
  const regex = new RegExp(`(${safeSearch})`, "gi");
  return text.replace(regex, `<span class='text-secondary-gold'>$1</span>`);

  function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export function randomCodeGenerator(tamanho: number = 6) {
  const caracteres =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let codigo = "";
  for (let i = 0; i < tamanho; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres[indice];
  }
  return codigo;
}
