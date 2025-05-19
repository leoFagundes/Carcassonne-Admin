export const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

export const generateRandomNumber = (
  minNumber: number = 0,
  maxNumber: number
): number => {
  return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
};
