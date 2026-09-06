import { Dispatch, SetStateAction } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";

interface NumberPickProps {
  initialNumber: number;
  /** Valor máximo permitido; undefined/0 = sem limite. */
  max?: number;
  currentNumber: number;
  setCurrentNumber: Dispatch<SetStateAction<number>>;
}

export default function NumberPicker({
  max,
  initialNumber,
  currentNumber,
  setCurrentNumber,
}: NumberPickProps) {
  const hasLimit = max !== undefined && max > 0;
  const atLimit = hasLimit && currentNumber >= max;

  // Único ponto de escrita do valor — clampa em "max" para que nenhum botão
  // (incluindo os de atalho abaixo, que antes setavam o valor direto sem
  // checar limite nenhum) consiga passar do teto configurado no admin.
  function setClamped(value: number) {
    setCurrentNumber(hasLimit ? Math.min(value, max) : value);
  }

  function decrement() {
    if (currentNumber - 1 < initialNumber) {
      setCurrentNumber(initialNumber);
      return;
    }
    setCurrentNumber(currentNumber - 1);
  }

  function increment() {
    if (atLimit) return;
    setClamped(currentNumber + 1);
  }

  const btnBase =
    "flex items-center justify-center w-10 h-10 rounded-full border text-sm font-semibold cursor-pointer transition-all duration-200 select-none";
  const btnInactive =
    "border-primary-gold/25 bg-secondary-black/50 text-primary-gold/80 hover:border-primary-gold/50";
  const btnActive =
    "border-primary-gold bg-primary-gold text-primary-black shadow-card-gold";
  const btnDisabled = "opacity-30 pointer-events-none";

  return (
    <div className="flex gap-3 flex-wrap justify-center">
      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3].map((offset) => {
          const value = initialNumber + offset;
          const isOverLimit = hasLimit && value > max;
          return (
            <div
              key={offset}
              onClick={() => !isOverLimit && setClamped(value)}
              className={`${btnBase} ${
                value === currentNumber ? btnActive : btnInactive
              } ${isOverLimit ? btnDisabled : ""}`}
            >
              {value}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <div
          onClick={decrement}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-primary-gold/35 text-primary-gold/60 hover:border-primary-gold/60 hover:text-primary-gold cursor-pointer transition-all duration-200 select-none"
        >
          <LuMinus size={14} />
        </div>
        <div
          onClick={() => !(hasLimit && initialNumber + 4 > max) && setClamped(initialNumber + 4)}
          className={`${btnBase} w-14 ${
            initialNumber + 4 <= currentNumber ? btnActive : btnInactive
          } ${hasLimit && initialNumber + 4 > max && currentNumber < initialNumber + 4 ? btnDisabled : ""}`}
        >
          {currentNumber < initialNumber + 4
            ? initialNumber + 4
            : currentNumber}
        </div>
        <div
          onClick={increment}
          className={`flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-primary-gold/35 text-primary-gold/60 hover:border-primary-gold/60 hover:text-primary-gold cursor-pointer transition-all duration-200 select-none ${
            atLimit ? btnDisabled : ""
          }`}
        >
          <LuPlus size={14} />
        </div>
      </div>
    </div>
  );
}
