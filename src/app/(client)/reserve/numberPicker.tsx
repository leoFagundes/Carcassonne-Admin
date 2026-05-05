import { Dispatch, SetStateAction } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";

interface NumberPickProps {
  initialNumber: number;
  inLimit: boolean;
  currentNumber: number;
  setCurrentNumber: Dispatch<SetStateAction<number>>;
}

export default function NumberPicker({
  inLimit = false,
  initialNumber,
  currentNumber,
  setCurrentNumber,
}: NumberPickProps) {
  function decrement() {
    if (currentNumber - 1 < initialNumber) {
      setCurrentNumber(initialNumber);
      return;
    }
    setCurrentNumber(currentNumber - 1);
  }

  function increment() {
    if (inLimit) return;
    setCurrentNumber(currentNumber + 1);
  }

  const btnBase =
    "flex items-center justify-center w-10 h-10 rounded-full border text-sm font-semibold cursor-pointer transition-all duration-200 select-none";
  const btnInactive =
    "border-primary-gold/25 bg-secondary-black/50 text-primary-gold/80 hover:border-primary-gold/50";
  const btnActive =
    "border-primary-gold bg-primary-gold text-primary-black shadow-card-gold";

  return (
    <div className="flex gap-3 flex-wrap justify-center">
      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3].map((offset) => (
          <div
            key={offset}
            onClick={() => setCurrentNumber(initialNumber + offset)}
            className={`${btnBase} ${
              initialNumber + offset === currentNumber ? btnActive : btnInactive
            }`}
          >
            {initialNumber + offset}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          onClick={decrement}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-primary-gold/35 text-primary-gold/60 hover:border-primary-gold/60 hover:text-primary-gold cursor-pointer transition-all duration-200 select-none"
        >
          <LuMinus size={14} />
        </div>
        <div
          onClick={() => setCurrentNumber(initialNumber + 4)}
          className={`${btnBase} w-14 ${
            initialNumber + 4 <= currentNumber ? btnActive : btnInactive
          }`}
        >
          {currentNumber < initialNumber + 4
            ? initialNumber + 4
            : currentNumber}
        </div>
        <div
          onClick={increment}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-primary-gold/35 text-primary-gold/60 hover:border-primary-gold/60 hover:text-primary-gold cursor-pointer transition-all duration-200 select-none"
        >
          <LuPlus size={14} />
        </div>
      </div>
    </div>
  );
}
