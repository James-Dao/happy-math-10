import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameMode, MathOperator, MathProblem } from './types';
import VisualCounter from './components/VisualCounter';
import NumberPad from './components/NumberPad';
import Confetti from './components/Confetti';
import { generateMathStory, getEncouragementOrHint } from './services/geminiService';
import { speak, playSound } from './services/audioService';

const EMOJIS = ['🍎', '🍌', '🐶', '🐱', '🐸', '⭐', '🎈', '🍪', '🚗'];

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Delay helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>(GameMode.PRACTICE);
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showNextControls, setShowNextControls] = useState<boolean>(false);
  
  // Teaching Animation State
  const [teachingState, setTeachingState] = useState<{
    isActive: boolean;
    groupAHighlight: number | null; // Index to highlight in Group A
    groupBHighlight: number | null; // Index to highlight in Group B
    groupACrossedCount: number; // How many to cross out in Group A (for subtraction)
  }>({
    isActive: false,
    groupAHighlight: null,
    groupBHighlight: null,
    groupACrossedCount: 0,
  });
  
  // Track animation cancellation
  const isAnimatingRef = useRef<boolean>(false);
  // Track last problem
  const lastSignatureRef = useRef<string>('');

  // Helper to read the current problem
  const readProblem = (prob: MathProblem) => {
    if (!soundEnabled) return;

    let textToRead = "";
    
    // If there is a story, read it first, then the question
    if (mode === GameMode.STORY && prob.storyText) {
       textToRead += `${prob.storyText}。`;
    }
    
    // Read the equation: "3 加 2 等于几？"
    const opText = prob.operator === MathOperator.ADD ? "加" : "减";
    textToRead += `请问，${prob.numA} ${opText} ${prob.numB} 等于几？`;
    
    speak(textToRead);
  };

  const createProblem = useCallback(async (isPractice: boolean) => {
    // Reset States
    setShowNextControls(false);
    setUserInput('');
    setStatus('IDLE');
    setFeedbackMsg('');
    setTeachingState({ isActive: false, groupAHighlight: null, groupBHighlight: null, groupACrossedCount: 0 });
    isAnimatingRef.current = false;

    if (isPractice) {
      let a = 0, b = 0;
      let operator = MathOperator.ADD;
      let signature = '';
      let attempts = 0;

      do {
        operator = Math.random() > 0.5 ? MathOperator.ADD : MathOperator.SUBTRACT;
        if (operator === MathOperator.ADD) {
          do {
            a = getRandomInt(0, 10);
            b = getRandomInt(0, 10);
          } while (a + b > 10);
        } else {
          const x = getRandomInt(0, 10);
          const y = getRandomInt(0, 10);
          a = Math.max(x, y);
          b = Math.min(x, y);
        }
        signature = `${operator}:${a}:${b}`;
        attempts++;
      } while (signature === lastSignatureRef.current && attempts < 10);

      lastSignatureRef.current = signature;

      const newProblem: MathProblem = {
        id: Date.now().toString(),
        numA: a,
        numB: b,
        operator: operator,
        answer: operator === MathOperator.ADD ? a + b : a - b,
        visualEmoji: EMOJIS[getRandomInt(0, EMOJIS.length - 1)],
      };
      setProblem(newProblem);
      setTimeout(() => readProblem(newProblem), 500);

    } else {
      // Story Mode
      setIsLoading(true);
      setFeedbackMsg('AI正在思考题目...');
      if(soundEnabled) speak("让我想一个有趣的故事...");
      
      const storyData = await generateMathStory();
      setIsLoading(false);

      if (storyData) {
        const newProblem = {
          id: Date.now().toString(),
          numA: storyData.numA,
          numB: storyData.numB,
          operator: storyData.operator as MathOperator,
          answer: storyData.answer,
          visualEmoji: storyData.emoji,
          storyText: storyData.story
        };
        setProblem(newProblem);
        setFeedbackMsg('');
        setTimeout(() => readProblem(newProblem), 100);
      } else {
        setFeedbackMsg('网络开小差了，试试普通模式吧！');
        createProblem(true); // Fallback to practice
      }
    }
  }, [soundEnabled]);

  // Initial load
  useEffect(() => {
    createProblem(mode === GameMode.PRACTICE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePadInput = (num: number) => {
    if (soundEnabled) playSound('click');
    if (userInput.length < 2) {
      setUserInput(prev => prev + num.toString());
    }
  };

  const handleClear = () => {
    if (soundEnabled) playSound('click');
    setUserInput('');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) playSound('click');
  };

  // --- Teaching Logic ---
  const runTeachingAnimation = async (prob: MathProblem) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    
    // Reset visuals before starting
    setTeachingState({ isActive: true, groupAHighlight: null, groupBHighlight: null, groupACrossedCount: 0 });
    
    // Initial delay to let the user settle
    await wait(500);

    if (prob.operator === MathOperator.ADD) {
      // --- ADDITION TEACHING ---
      
      // Step 1: Explain concept
      if(soundEnabled) speak(`${prob.numA} 加 ${prob.numB}，意思是把它们合起来。`);
      await wait(3000);

      if (!isAnimatingRef.current) return;

      // Step 2: Count Group A
      if(soundEnabled) speak(`这边有 ${prob.numA} 个。`);
      for (let i = 0; i < prob.numA; i++) {
        setTeachingState(prev => ({ ...prev, groupAHighlight: i }));
        await wait(500);
      }
      setTeachingState(prev => ({ ...prev, groupAHighlight: null }));
      await wait(500);

      // Step 3: Count Group B
      if(soundEnabled) speak(`那边有 ${prob.numB} 个。`);
      for (let i = 0; i < prob.numB; i++) {
        setTeachingState(prev => ({ ...prev, groupBHighlight: i }));
        await wait(500);
      }
      setTeachingState(prev => ({ ...prev, groupBHighlight: null }));
      await wait(500);

      // Step 4: Count Together
      if(soundEnabled) speak(`让我们从头数一数，一共有多少个？`);
      await wait(2500);

      // Count A part again (1 to A)
      for (let i = 0; i < prob.numA; i++) {
        if (!isAnimatingRef.current) return;
        const currentCount = i + 1;
        setTeachingState(prev => ({ ...prev, groupAHighlight: i }));
        if(soundEnabled) {
            speak(`${currentCount}`);
            playSound('pop');
        }
        await wait(1000); // Slow pace
      }
      setTeachingState(prev => ({ ...prev, groupAHighlight: null }));

      // Count B part continuing (A+1 to Answer)
      for (let i = 0; i < prob.numB; i++) {
        if (!isAnimatingRef.current) return;
        const currentCount = prob.numA + i + 1;
        setTeachingState(prev => ({ ...prev, groupBHighlight: i }));
        if(soundEnabled) {
            speak(`${currentCount}`);
            playSound('pop');
        }
        await wait(1000); // Slow pace
      }
      setTeachingState(prev => ({ ...prev, groupBHighlight: null }));

      if (!isAnimatingRef.current) return;
      if(soundEnabled) speak(`所以，答案就是 ${prob.answer}！`);

    } else {
      // --- SUBTRACTION TEACHING ---

      // Step 1: Explain concept
      if(soundEnabled) speak(`${prob.numA} 减 ${prob.numB}，意思是拿走 ${prob.numB} 个。`);
      await wait(3000);

      if (!isAnimatingRef.current) return;

      // Step 2: Show Total
      if(soundEnabled) speak(`这里原来有 ${prob.numA} 个。`);
      // Flash all briefly?
      await wait(2000);

      // Step 3: Remove items one by one
      if(soundEnabled) speak(`我们来拿走 ${prob.numB} 个。`);
      await wait(1500);

      for (let i = 1; i <= prob.numB; i++) {
        if (!isAnimatingRef.current) return;
        setTeachingState(prev => ({ ...prev, groupACrossedCount: i }));
        if(soundEnabled) {
            // "Take away one", "Take away two"
            speak(`拿走 ${i}个`); 
            playSound('wrong'); 
        }
        await wait(1200); // Very slow removal to emphasize
      }

      // Step 4: Count Remaining
      if (!isAnimatingRef.current) return;
      if(soundEnabled) speak(`现在还剩下几个呢？我们来数一数。`);
      await wait(2000);

      const remaining = prob.numA - prob.numB;
      if (remaining === 0) {
         if(soundEnabled) speak(`咦？全都被拿走了，剩下 0 个！`);
      } else {
        for (let i = 0; i < remaining; i++) {
          if (!isAnimatingRef.current) return;
          setTeachingState(prev => ({ ...prev, groupAHighlight: i }));
          if(soundEnabled) {
              speak(`${i + 1}`);
              playSound('pop');
          }
          await wait(1000);
        }
        setTeachingState(prev => ({ ...prev, groupAHighlight: null }));
        if(soundEnabled) speak(`所以，还剩下 ${remaining} 个！`);
      }
    }

    isAnimatingRef.current = false;
    setShowNextControls(true); // Allow user to proceed or replay
  };

  const handleSubmit = async () => {
    if (!problem || status !== 'IDLE') return;
    
    const val = parseInt(userInput, 10);
    
    if (val === problem.answer) {
      // Correct
      setStatus('CORRECT');
      setScore(s => s + 10);
      if (soundEnabled) playSound('correct');
      
      const praise = await getEncouragementOrHint(true, problem.numA, problem.numB, problem.operator);
      setFeedbackMsg(praise);
      // speak(praise); // Optional: Praise first, then teach. 
      // Actually runTeachingAnimation handles the voice flow better if we start it directly.
      
      // Start teaching immediately
      runTeachingAnimation(problem);

    } else {
      // Wrong
      setStatus('WRONG');
      setUserInput('');
      if (soundEnabled) playSound('wrong');
      
      const hint = await getEncouragementOrHint(false, problem.numA, problem.numB, problem.operator);
      setFeedbackMsg(hint);
      if (soundEnabled) speak(hint);
      
      setTimeout(() => setStatus('IDLE'), 2000);
    }
  };

  const handleNextProblem = () => {
    if (soundEnabled) playSound('click');
    createProblem(mode === GameMode.PRACTICE);
  };

  const handleReplayTeaching = () => {
     if (soundEnabled) playSound('click');
     if (problem) runTeachingAnimation(problem);
  };

  const switchMode = (newMode: GameMode) => {
    if (soundEnabled) playSound('click');
    setMode(newMode);
    createProblem(newMode === GameMode.PRACTICE);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col items-center py-6 px-4 font-sans overflow-hidden">
      
      {status === 'CORRECT' && <Confetti />}

      {/* Header / Scoreboard */}
      <div className="w-full max-w-md flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm mb-6 border-b-4 border-gray-100 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-float">⭐</span>
          <span className="text-xl font-bold text-candy-red">{score}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-700 tracking-wider">
            {mode === GameMode.STORY ? '📚 故事模式' : '⚡ 练习模式'}
        </h1>
        <button 
          onClick={toggleSound}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Main Game Area */}
      <div className={`
        w-full max-w-md bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-white ring-4 ring-indigo-50 mb-6 relative z-10 transition-transform duration-300
        ${status === 'CORRECT' ? 'scale-105 ring-green-200' : ''}
        ${status === 'WRONG' ? 'ring-red-200' : ''}
      `}>
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="text-5xl animate-bounce mb-4">🤔</div>
            <div className="text-xl text-slate-600 font-bold animate-pulse">AI 正在思考...</div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 flex flex-col items-center min-h-[350px] justify-center">
          
          {problem && (
            <>
              {/* Story Text */}
              {mode === GameMode.STORY && problem.storyText && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-2xl border-2 border-yellow-200 text-slate-700 text-lg text-center leading-relaxed animate-pop">
                  "{problem.storyText}"
                  <button onClick={() => speak(problem.storyText || '')} className="ml-2 text-xl inline-block align-middle hover:scale-110 active:scale-95 transition-transform">
                    🔈
                  </button>
                </div>
              )}

              {/* Visualizer Area */}
              <div className="w-full mb-8 space-y-4">
                {/* Part A */}
                <div className="flex items-center justify-center min-h-[60px] bg-blue-50/50 rounded-xl p-2 transition-all duration-300">
                   <VisualCounter 
                     count={problem.numA} 
                     emoji={problem.visualEmoji} 
                     isCelebrating={false} 
                     highlightIndex={teachingState.groupAHighlight}
                     crossedOutCount={teachingState.groupACrossedCount}
                   />
                </div>

                {/* Operator */}
                <div className="flex justify-center text-4xl font-black text-slate-300 py-2">
                   {problem.operator}
                </div>

                {/* Part B */}
                <div className="flex items-center justify-center min-h-[60px] bg-red-50/50 rounded-xl p-2 transition-all duration-300">
                   {problem.operator === MathOperator.ADD ? (
                     <VisualCounter 
                       count={problem.numB} 
                       emoji={problem.visualEmoji} 
                       isCelebrating={false}
                       highlightIndex={teachingState.groupBHighlight}
                     />
                   ) : (
                     // Subtraction Part B is static
                     <VisualCounter 
                       count={problem.numB} 
                       emoji={problem.visualEmoji} 
                       faded={true}
                       isCelebrating={false}
                     />
                   )}
                </div>
              </div>

              {/* Equation */}
              <div className="flex items-center justify-center gap-4 text-5xl font-black text-slate-700 mb-2">
                <span>{problem.numA}</span>
                <span className="text-candy-blue">{problem.operator}</span>
                <span>{problem.numB}</span>
                <span>=</span>
                <div className={`
                   min-w-[80px] h-[80px] flex items-center justify-center rounded-2xl border-b-4 transition-colors
                   ${status === 'CORRECT' ? 'bg-green-100 text-green-600 border-green-300' : ''}
                   ${status === 'WRONG' ? 'bg-red-100 text-red-600 border-red-300 animate-wiggle' : ''}
                   ${status === 'IDLE' ? 'bg-gray-100 border-gray-300' : ''}
                `}>
                  {userInput || '?'}
                </div>
              </div>

              {/* Feedback Message */}
              <div className={`h-12 mt-4 text-center font-bold text-lg transition-all transform duration-500 ${feedbackMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {status === 'CORRECT' ? '🎉 ' : status === 'WRONG' ? '🤔 ' : '🤖 '}
                {feedbackMsg}
              </div>
            </>
          )}
        </div>
      </div>

      {/* CONTROLS: Show NumberPad when answering, Show Next/Replay buttons when Correct */}
      <div className="z-10 w-full max-w-md min-h-[250px] flex items-end justify-center">
        {status === 'CORRECT' ? (
           <div className="w-full grid grid-cols-2 gap-4 animate-pop">
             <button
               onClick={handleReplayTeaching}
               className="h-20 text-xl font-bold bg-yellow-100 text-yellow-700 rounded-3xl border-b-4 border-yellow-300 active:border-b-0 active:translate-y-1 hover:bg-yellow-200 transition-all flex items-center justify-center gap-2"
             >
               🔄 再教一遍
             </button>
             <button
               onClick={handleNextProblem}
               className="h-20 text-2xl font-bold bg-green-500 text-white rounded-3xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 hover:bg-green-400 transition-all flex items-center justify-center gap-2"
             >
               下一题 ➡️
             </button>
           </div>
        ) : (
          <NumberPad 
            onInput={handlePadInput} 
            onClear={handleClear} 
            onSubmit={handleSubmit}
            disabled={isLoading}
            currentValue={userInput}
          />
        )}
      </div>

      {/* Mode Toggle Footer (Only show when not in correct state to avoid clutter?) 
          Actually let's keep it but maybe disable it during teaching? */}
      {status !== 'CORRECT' && (
        <div className="mt-8 flex gap-4 z-10 pb-6">
          <button
            onClick={() => switchMode(GameMode.PRACTICE)}
            className={`px-6 py-3 rounded-full font-bold transition-all ${
              mode === GameMode.PRACTICE 
                ? 'bg-candy-blue text-white shadow-lg scale-105 ring-4 ring-blue-100' 
                : 'bg-white text-gray-400 hover:bg-gray-50'
            }`}
          >
            普通练习
          </button>
          <button
            onClick={() => switchMode(GameMode.STORY)}
            className={`px-6 py-3 rounded-full font-bold transition-all ${
              mode === GameMode.STORY 
                ? 'bg-candy-yellow text-amber-800 shadow-lg scale-105 ring-4 ring-yellow-100' 
                : 'bg-white text-gray-400 hover:bg-gray-50'
            }`}
          >
            AI 讲故事
          </button>
        </div>
      )}

    </div>
  );
};

export default App;