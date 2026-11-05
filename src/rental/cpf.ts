export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, "");
}

function checkDigit(digits: number[], length: number): number {
  const sum = digits
    .slice(0, length)
    .reduce((acc, d, i) => acc + d * (length + 1 - i), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(input: string): boolean {
  const cpf = normalizeCpf(input);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split("").map(Number);
  return checkDigit(digits, 9) === digits[9] && checkDigit(digits, 10) === digits[10];
}

export function formatCpf(input: string): string {
  const c = normalizeCpf(input);
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9, 11)}`;
}
