import { useState, useEffect, useCallback } from 'react';

export default function MemoryFarm({ onBack }) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);
  const [plantsGrown, setPlantsGrown] = useState(0);

  // Memory farm (20 slots)
  const FARM_SIZE = 20;
  const [farmSlots, setFarmSlots] = useState(Array(FARM_SIZE).fill(null));
  
  // Current seed to plant
  const [currentSeed, setCurrentSeed] = useState(null);
  const [allocationMethod, setAllocationMethod] = useState('first-fit'); // first-fit, best-fit
  
  // Weeds (fragmentation)
  const [weeds, setWeeds] = useState([]);
  const [fragmentationLevel, setFragmentationLevel] = useState(0);
  
  const [alerts, setAlerts] = useState([]);
  const [compactionCount, setCompactionCount] = useState(0);

  // Seed types
  const SEED_TYPES = [
    { id: 1, name: '🌱 Small Plant', size: 2, color: 'bg-green-400', emoji: '🌱', points: 5 },
    { id: 2, name: '🌿 Medium Plant', size: 3, color: 'bg-green-500', emoji: '🌿', points: 8 },
    { id: 3, name: '🌳 Large Plant', size: 4, color: 'bg-green-600', emoji: '🌳', points: 12 },
    { id: 4, name: '🌸 Flower', size: 2, color: 'bg-pink-400', emoji: '🌸', points: 7 },
    { id: 5, name: '🌻 Sunflower', size: 3, color: 'bg-yellow-400', emoji: '🌻', points: 10 }
  ];

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 2000);
  }, []);

  // Generate new seed
  const generateSeed = useCallback(() => {
    const seedType = SEED_TYPES[Math.floor(Math.random() * SEED_TYPES.length)];
    setCurrentSeed({ ...seedType, id: Date.now() });
  }, []);

  // Find first fit position
  const findFirstFit = (size) => {
    let consecutiveFree = 0;
    let startPos = -1;

    for (let i = 0; i < FARM_SIZE; i++) {
      if (farmSlots[i] === null) {
        if (consecutiveFree === 0) startPos = i;
        consecutiveFree++;
        if (consecutiveFree === size) return startPos;
      } else {
        consecutiveFree = 0;
        startPos = -1;
      }
    }
    return -1;
  };

  // Find best fit position
  const findBestFit = (size) => {
    let bestPos = -1;
    let bestSize = Infinity;
    let currentStart = -1;
    let currentSize = 0;

    for (let i = 0; i <= FARM_SIZE; i++) {
      if (i < FARM_SIZE && farmSlots[i] === null) {
        if (currentStart === -1) currentStart = i;
        currentSize++;
      } else {
        if (currentSize >= size && currentSize < bestSize) {
          bestPos = currentStart;
          bestSize = currentSize;
        }
        currentStart = -1;
        currentSize = 0;
      }
    }
    return bestPos;
  };

  // Plant seed
  const plantSeed = (method) => {
    if (!currentSeed) return;

    const position = method === 'first-fit' ? findFirstFit(currentSeed.size) : findBestFit(currentSeed.size);

    if (position === -1) {
      addAlert('❌ Not enough space!', 'error');
      return;
    }

    // Plant the seed
    const newSlots = [...farmSlots];
    for (let i = position; i < position + currentSeed.size; i++) {
      newSlots[i] = { ...currentSeed, position: i - position };
    }
    setFarmSlots(newSlots);
    setScore(prev => prev + currentSeed.points);
    setPlantsGrown(prev => prev + 1);
    addAlert(`✅ ${currentSeed.emoji} Planted! +${currentSeed.points}`, 'success');
    
    // Generate new seed
    setTimeout(() => generateSeed(), 300);
  };

  // Calculate fragmentation
  const calculateFragmentation = useCallback(() => {
    let freeSpaces = 0;
    let fragments = 0;
    let inFragment = false;

    for (let i = 0; i < FARM_SIZE; i++) {
      if (farmSlots[i] === null) {
        freeSpaces++;
        if (!inFragment) {
          fragments++;
          inFragment = true;
        }
      } else {
        inFragment = false;
      }
    }

    const usedSpaces = FARM_SIZE - freeSpaces;
    if (usedSpaces > 0 && fragments > 1) {
      const fragLevel = Math.min(100, (fragments / freeSpaces) * 100);
      setFragmentationLevel(fragLevel);

      // Generate weeds based on fragmentation
      if (fragLevel > 30 && Math.random() < 0.3) {
        const emptySlots = farmSlots.map((slot, idx) => slot === null ? idx : -1).filter(idx => idx !== -1);
        if (emptySlots.length > 0 && weeds.length < 5) {
          const randomSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
          if (!weeds.some(w => w.position === randomSlot)) {
            setWeeds(prev => [...prev, { id: Date.now(), position: randomSlot }]);
            addAlert('🌾 Weed grew due to fragmentation!', 'warning');
          }
        }
      }
    } else {
      setFragmentationLevel(0);
    }
  }, [farmSlots, weeds, addAlert]);

  // Compact memory (remove weeds)
  const compactMemory = () => {
    const plants = [];
    
    // Collect all plants
    const seen = new Set();
    for (let i = 0; i < FARM_SIZE; i++) {
      if (farmSlots[i] !== null) {
        const plantId = farmSlots[i].id;
        if (!seen.has(plantId)) {
          seen.add(plantId);
          const plantSlots = farmSlots.filter(s => s && s.id === plantId);
          plants.push({ ...plantSlots[0], size: plantSlots.length });
        }
      }
    }

    // Compact - place all plants from the start
    const newSlots = Array(FARM_SIZE).fill(null);
    let position = 0;
    for (const plant of plants) {
      for (let i = 0; i < plant.size; i++) {
        newSlots[position + i] = { ...plant, position: i };
      }
      position += plant.size;
    }

    setFarmSlots(newSlots);
    setWeeds([]);
    setFragmentationLevel(0);
    setCompactionCount(prev => prev + 1);
    setScore(prev => prev + 15);
    addAlert('✨ Memory Compacted! +15', 'success');
  };

  // Remove weed
  const removeWeed = (weedId) => {
    setWeeds(prev => prev.filter(w => w.id !== weedId));
    setScore(prev => prev + 3);
    addAlert('🌾 Weed Removed! +3', 'success');
  };

  // Initialize
  useEffect(() => {
    generateSeed();
  }, [generateSeed]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      calculateFragmentation();

      // Score bonus for no fragmentation
      if (fragmentationLevel === 0 && plantsGrown > 0) {
        setScore(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, calculateFragmentation, fragmentationLevel, plantsGrown]);

  if (showInstructions) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-green-900 to-blue-900 flex items-center justify-center z-50 p-6 overflow-y-auto">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 max-w-3xl border-2 border-green-500/50 shadow-2xl my-8">
          <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 via-yellow-400 to-pink-400 bg-clip-text text-transparent">
            🌱 MEMORY FARM 🚜
          </h2>
          
          <div className="space-y-6 text-gray-200">
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-2">⭐ OS Concepts:</h3>
              <p className="text-gray-300">• Memory Allocation (First Fit vs Best Fit)</p>
              <p className="text-gray-300">• External Fragmentation</p>
              <p className="text-gray-300">• Memory Compaction</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">🎮 How to Play:</h3>
              <p className="text-gray-300">• Memory is a beautiful farm with 20 slots</p>
              <p className="text-gray-300">• Each process = a plant seed of different size</p>
              <p className="text-gray-300">• Choose <strong>First Fit</strong> or <strong>Best Fit</strong> to plant seeds</p>
              <p className="text-gray-300">• Fragmentation → weeds grow 🌾</p>
              <p className="text-gray-300">• Click weeds or use <strong>Compact</strong> to clear them</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-pink-400 mb-2">🎨 Animations:</h3>
              <p className="text-gray-300">• Seeds sprout into plants 🌱→🌿→🌳</p>
              <p className="text-gray-300">• Weeds wiggle when fragmentation increases</p>
              <p className="text-gray-300">• Compaction = magical sweep animation ✨</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-2">🏆 Scoring:</h3>
              <p className="text-gray-300">• Plant Seeds: +5 to +12 (based on size)</p>
              <p className="text-gray-300">• Remove Weeds: +3</p>
              <p className="text-gray-300">• Compact Memory: +15</p>
              <p className="text-gray-300">• No Fragmentation Bonus: +1 per second</p>
            </div>

            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-bold text-white hover:scale-105 transition shadow-lg"
              >
                🌱 Start Farming
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-blue-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-yellow-400 to-pink-400 bg-clip-text text-transparent">
            🌱 Memory Farm 🚜
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInstructions(true)}
              className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition"
            >
              ❓ Help
            </button>
            {onBack && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBack();
                }}
                className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition"
              >
                ← Back
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{score}</div>
            <div className="text-xs text-gray-400">Score</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{plantsGrown}</div>
            <div className="text-xs text-gray-400">Plants</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-pink-500/30">
            <div className="text-2xl font-bold text-pink-400">{weeds.length}</div>
            <div className="text-xs text-gray-400">Weeds</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">{Math.round(fragmentationLevel)}%</div>
            <div className="text-xs text-gray-400">Fragmentation</div>
          </div>
        </div>

        {/* Fragmentation Bar */}
        <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">Fragmentation:</span>
            <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  fragmentationLevel > 60 ? 'bg-red-500 animate-pulse' :
                  fragmentationLevel > 30 ? 'bg-orange-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${fragmentationLevel}%` }}
              ></div>
            </div>
            {fragmentationLevel > 50 && <span className="text-orange-400">⚠️</span>}
          </div>
        </div>

        {/* Current Seed */}
        {currentSeed && (
          <div className="bg-gray-800/80 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{currentSeed.emoji}</div>
                <div>
                  <div className="font-bold text-white">{currentSeed.name}</div>
                  <div className="text-sm text-gray-400">Size: {currentSeed.size} slots | Points: +{currentSeed.points}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAllocationMethod('first-fit');
                    plantSeed('first-fit');
                  }}
                  className={`px-4 py-2 rounded-lg font-bold transition ${
                    allocationMethod === 'first-fit'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🥇 First Fit
                </button>
                <button
                  onClick={() => {
                    setAllocationMethod('best-fit');
                    plantSeed('best-fit');
                  }}
                  className={`px-4 py-2 rounded-lg font-bold transition ${
                    allocationMethod === 'best-fit'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🏆 Best Fit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Farm Grid */}
      <div className="max-w-6xl mx-auto bg-gradient-to-br from-green-900/30 to-yellow-900/30 rounded-2xl border-2 border-green-700 p-6">
        <div className="grid grid-cols-10 gap-2">
          {farmSlots.map((slot, idx) => {
            const weed = weeds.find(w => w.position === idx);
            
            return (
              <div
                key={idx}
                className={`relative aspect-square rounded-lg border-2 transition-all duration-300 flex items-center justify-center text-3xl ${
                  slot 
                    ? `${slot.color} border-white/50 animate-fade-in` 
                    : weed
                      ? 'bg-yellow-900/50 border-yellow-600 cursor-pointer hover:scale-110 animate-wiggle'
                      : 'bg-gray-800/50 border-gray-600'
                }`}
                onClick={() => weed && removeWeed(weed.id)}
              >
                {slot ? slot.emoji : weed ? '🌾' : ''}
                <div className="absolute bottom-0 right-0 text-[8px] text-gray-400 p-0.5">
                  {idx}
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={compactMemory}
            disabled={weeds.length === 0 && fragmentationLevel < 20}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-bold text-white hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            ✨ Compact Memory ✨
          </button>
        </div>
      </div>

      {/* Info Panel */}
      <div className="max-w-6xl mx-auto mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Memory Status:</h3>
          <div className="space-y-1 text-xs text-gray-300">
            <div>Used Slots: {farmSlots.filter(s => s !== null).length} / {FARM_SIZE}</div>
            <div>Free Slots: {farmSlots.filter(s => s === null).length}</div>
            <div>Compactions: {compactionCount}</div>
          </div>
        </div>
        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Allocation Methods:</h3>
          <div className="space-y-1 text-xs text-gray-300">
            <div>🥇 <strong>First Fit:</strong> Uses first available space</div>
            <div>🏆 <strong>Best Fit:</strong> Uses smallest sufficient space</div>
            <div>⚠️ Both can cause fragmentation!</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`px-4 py-2 rounded-lg shadow-lg animate-fade-in ${
              alert.type === 'success' ? 'bg-green-500' :
              alert.type === 'error' ? 'bg-red-500' :
              alert.type === 'warning' ? 'bg-orange-500' :
              'bg-blue-500'
            } text-white font-bold`}
          >
            {alert.message}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
