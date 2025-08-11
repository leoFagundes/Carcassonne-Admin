import { Dispatch, SetStateAction } from "react";
import { LuMinus, LuPlus } from "react-icons/lu";

interface NumberPickProps {
  initialNumber: number;
  inLimit: boolean;
  currentNumber: number;
  setCurrentNumber: Dispatch<SetStateAction<number>>;
}

export default function NumberPicker({
  inLimit,
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

  return (
    <div className="flex gap-3 flex-wrap justify-center ">
      <div className="flex gap-3 justify-center">
        <div
          onClick={() => setCurrentNumber(initialNumber)}
          className={`flex items-center justify-center p-2 rounded-full bg-primary-white w-10 h-10
             text-black font-semibold text-xl cursor-pointer shadow-card ${
               initialNumber === currentNumber &&
               "!bg-primary-gold saturate-150"
             }`}
        >
          {initialNumber}
        </div>
        <div
          onClick={() => setCurrentNumber(initialNumber + 1)}
          className={`flex items-center justify-center p-2 rounded-full bg-primary-white w-10 h-10
             text-black font-semibold text-xl cursor-pointer shadow-card ${
               initialNumber + 1 === currentNumber &&
               "!bg-primary-gold saturate-150"
             }`}
        >
          {initialNumber + 1}
        </div>
        <div
          onClick={() => setCurrentNumber(initialNumber + 2)}
          className={`flex items-center justify-center p-2 rounded-full bg-primary-white w-10 h-10
             text-black font-semibold text-xl cursor-pointer shadow-card ${
               initialNumber + 2 === currentNumber &&
               "!bg-primary-gold saturate-150"
             }`}
        >
          {initialNumber + 2}
        </div>
        <div
          onClick={() => setCurrentNumber(initialNumber + 3)}
          className={`flex items-center justify-center p-2 rounded-full bg-primary-white w-10 h-10
             text-black font-semibold text-xl cursor-pointer shadow-card ${
               initialNumber + 3 === currentNumber &&
               "!bg-primary-gold saturate-150"
             }`}
        >
          {initialNumber + 3}
        </div>
      </div>
      <div className="flex items-center gap-2 mx-2">
        <div
          onClick={decrement}
          className="select-none flex items-center justify-center w-10 h-10 p-2 rounded-full border cursor-pointer text-xl"
        >
          <LuMinus size={20} className="min-w-[20px]" />
        </div>
        <div
          onClick={() => setCurrentNumber(initialNumber + 4)}
          className={`flex items-center justify-center p-2 rounded-full bg-primary-white w-16 h-10
             text-black font-semibold text-xl cursor-pointer shadow-card ${
               initialNumber + 4 <= currentNumber &&
               "!bg-primary-gold saturate-150"
             }`}
        >
          {currentNumber < initialNumber + 4
            ? initialNumber + 4
            : currentNumber}
        </div>
        <div
          onClick={increment}
          className="select-none flex items-center justify-center w-10 h-10 p-2 rounded-full border cursor-pointer text-xl"
        >
          <LuPlus size={20} className="min-w-[20px]" />
        </div>
      </div>
    </div>
  );
}
