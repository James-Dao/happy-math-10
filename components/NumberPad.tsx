import React from 'react';

interface NumberPadProps {
  onInput: (num: number) => void;
  onClear: () => void;
  onSubmit: () => void;
  disabled: boolean;
  currentValue: string;
}

const NumberPad: React.FC<NumberPadProps> = ({ onInput, onClear, onSubmit, disabled, currentValue }) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-3xl shadow-xl border-b-8 border-gray-200">
      <div className="grid grid-cols-3 gap-3 mb-3">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => onInput(num)}
            disabled={disabled}
            className={`
              h-16 text-3xl font-bold rounded-2xl transition-all active:scale-95
              ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-b-4 border-blue-200 active:border-b-0 active:translate-y-1'}
            `}
          >
            {num}
          </button>
        ))}
        <button
          onClick={onClear}
          disabled={disabled}
          className="h-16 text-2xl font-bold bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 border-b-4 border-red-200 active:border-b-0 active:translate-y-1 active:scale-95 disabled:opacity-50"
        >
          清除
        </button>
        <button
           onClick={onSubmit}
           disabled={disabled || currentValue === ''}
           className={`col-span-1 h-16 text-2xl font-bold text-white rounded-2xl border-b-4 active:border-b-0 active:translate-y-1 active:scale-95 transition-all
             ${disabled || currentValue === '' ? 'bg-gray-300 border-gray-400 cursor-not-allowed' : 'bg-green-500 border-green-700 hover:bg-green-400'}
           `}
        >
          确定
        </button>
      </div>
    </div>
  );
};

export default NumberPad;