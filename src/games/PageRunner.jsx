import { useState, useEffect, useCallback } from 'react';

export default function PageRunner({ onBack }) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, paused
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [distance, setDistance] = useState(0);

  // Runner position
  const [runnerY, setRunnerY] = useState(3); // 0-4 lanes
  const TOTAL_LANES = 5;

  // Platforms (pages)
  const [platforms, setPlatforms] = useState([]);
  const [nextPlatformId, setNextPlatformId] = useState(1);

  // Memory management
  const [memoryFrames, setMemoryFrames] = useState(4); // Number of loaded pages
  const [loadedPages, setLoadedPages] = useState([]); // Pages in memory (LRU order)
  const [replacementPolicy, setReplacementPolicy] = useState('LRU'); // LRU or FIFO
  
  // Page fault
  const [pageFaulting, setPageFaulting] = useState(false);
  const [pageFaultCount, setPageFaultCount] = useState(0);
  const [pageHitCount, setPageHitCount] = useState(0);

  const [alerts, setAlerts] = useState([]);
  const [speed, setSpeed] = useState(3); // Game speed

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 2000);
  }, []);

  // Move runner up/down
  const moveRunner = useCallback((direction) => {
    if (pageFaulting || gameState !== 'playing') return;

    setRunnerY(prev => {
      if (direction === 'up') return Math.max(0, prev - 1);
      if (direction === 'down') return Math.min(TOTAL_LANES - 1, prev + 1);
      return prev;
    });
  }, [pageFaulting, gameState]);

  // Generate platform
  const generatePlatform = useCallback(() => {
    const lane = Math.floor(Math.random() * TOTAL_LANES);
    const pageId = Math.floor(Math.random() * 12) + 1; // 12 different pages
    const hasCollectible = Math.random() < 0.2;
    const collectibleType = hasCollectible ? (Math.random() < 0.5 ? 'coin' : 'gem') : null;

    return {
      id: nextPlatformId,
      x: 900, // Start from right
      lane,
      pageId,
      loaded: loadedPages.includes(pageId),
      hasCollectible,
      collectibleType
    };
  }, [nextPlatformId, loadedPages]);

  // Access page (load into memory if needed)
  const accessPage = useCallback((pageId) => {
    if (loadedPages.includes(pageId)) {
      // Page hit
      setPageHitCount(prev => prev + 1);
      setScore(prev => prev + 10);
      addAlert('✅ Page Hit! +10', 'success');

      // Update LRU - move to end
      if (replacementPolicy === 'LRU') {
        setLoadedPages(prev => [...prev.filter(p => p !== pageId), pageId]);
      }
    } else {
      // Page fault
      setPageFaulting(true);
      setPageFaultCount(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 5));
      addAlert('⚠️ Page Fault! -5', 'error');

      // Load page into memory
      setTimeout(() => {
        setLoadedPages(prev => {
          let newLoaded = [...prev];
          
          if (newLoaded.length >= memoryFrames) {
            // Need to replace a page
            if (replacementPolicy === 'FIFO') {
              newLoaded.shift(); // Remove first (oldest)
            } else {
              // LRU - already at front
              newLoaded.shift();
            }
          }
          
          return [...newLoaded, pageId];
        });

        setPageFaulting(false);
      }, 1000); // 1 second freeze for page fault
    }
  }, [loadedPages, memoryFrames, replacementPolicy, addAlert]);

  // Check collision with platform
  const checkCollision = useCallback(() => {
    const runnerPlatform = platforms.find(p => 
      p.lane === runnerY && p.x >= 100 && p.x <= 180
    );

    if (runnerPlatform) {
      // Access the page
      accessPage(runnerPlatform.pageId);

      // Collect items
      if (runnerPlatform.hasCollectible && !runnerPlatform.collected) {
        setPlatforms(prev => prev.map(p => 
          p.id === runnerPlatform.id ? { ...p, collected: true } : p
        ));

        if (runnerPlatform.collectibleType === 'coin') {
          setCoins(prev => prev + 1);
          setScore(prev => prev + 5);
          addAlert('🪙 Coin! +5', 'success');
        } else {
          setGems(prev => prev + 1);
          setScore(prev => prev + 20);
          addAlert('💎 Gem! +20', 'success');
        }
      }

      // Update platform loaded status
      setPlatforms(prev => prev.map(p => 
        p.id === runnerPlatform.id ? { ...p, loaded: true } : p
      ));
    }
  }, [platforms, runnerY, accessPage, addAlert]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState !== 'playing') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        moveRunner('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        moveRunner('down');
      } else if (e.key === '1') {
        setReplacementPolicy('LRU');
        addAlert('Switched to LRU', 'info');
      } else if (e.key === '2') {
        setReplacementPolicy('FIFO');
        addAlert('Switched to FIFO', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, moveRunner, addAlert]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || pageFaulting) return;

    const interval = setInterval(() => {
      // Move platforms
      setPlatforms(prev => {
        const moved = prev.map(p => ({ ...p, x: p.x - speed * 3 })).filter(p => p.x > -100);
        
        // Generate new platforms
        if (moved.length === 0 || moved[moved.length - 1].x < 600) {
          moved.push(generatePlatform());
          setNextPlatformId(id => id + 1);
        }
        
        return moved;
      });

      // Update distance
      setDistance(prev => prev + 1);

      // Check collisions
      checkCollision();

      // Score for distance
      if (distance % 10 === 0) {
        setScore(prev => prev + 1);
      }

      // Update loaded pages status in platforms
      setPlatforms(prev => prev.map(p => ({
        ...p,
        loaded: loadedPages.includes(p.pageId)
      })));
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, pageFaulting, speed, generatePlatform, checkCollision, distance, loadedPages]);

  // Initial platforms
  useEffect(() => {
    const initial = [];
    for (let i = 0; i < 3; i++) {
      initial.push({
        id: i + 1,
        x: 300 + i * 200,
        lane: Math.floor(Math.random() * TOTAL_LANES),
        pageId: Math.floor(Math.random() * 12) + 1,
        loaded: i < memoryFrames,
        hasCollectible: false,
        collectibleType: null
      });
    }
    setPlatforms(initial);
    setNextPlatformId(4);
    setLoadedPages(initial.slice(0, memoryFrames).map(p => p.pageId));
  }, []);

  if (showInstructions) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center z-50 p-6 overflow-y-auto">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 max-w-3xl border-2 border-blue-500/50 shadow-2xl my-8">
          <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🏃 PAGE RUNNER 💨
          </h2>
          
          <div className="space-y-6 text-gray-200">
            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-2">⭐ OS Concepts:</h3>
              <p className="text-gray-300">• Virtual Memory & Paging</p>
              <p className="text-gray-300">• Page Faults & Memory Frames</p>
              <p className="text-gray-300">• LRU vs FIFO Page Replacement</p>
              <p className="text-gray-300">• Working Set & Page Hits</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-2">🎮 How to Play:</h3>
              <p className="text-gray-300">• Your runner jumps across platforms (pages)</p>
              <p className="text-gray-300">• <strong>Loaded Pages (Blue Glow):</strong> Safe to jump on!</p>
              <p className="text-gray-300">• <strong>Unloaded Pages (Grey Fade):</strong> Causes page fault!</p>
              <p className="text-gray-300">• Page fault = 1 second freeze + score penalty</p>
              <p className="text-gray-300">• Press <strong>1</strong> for LRU, <strong>2</strong> for FIFO</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-green-400 mb-2">🎨 Animations:</h3>
              <p className="text-gray-300">• Glowing platforms = loaded pages 💫</p>
              <p className="text-gray-300">• Freeze animation for page fault ⏸️</p>
              <p className="text-gray-300">• Dust trail when running 💨</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">🏆 Scoring:</h3>
              <p className="text-gray-300">• Page Hit: +10</p>
              <p className="text-gray-300">• Page Fault: -5</p>
              <p className="text-gray-300">• Collect Coins: +5 🪙</p>
              <p className="text-gray-300">• Collect Gems: +20 💎</p>
              <p className="text-gray-300">• Distance: +1 per 10 units</p>
            </div>

            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-bold text-white hover:scale-105 transition shadow-lg"
              >
                🏃 Start Running
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const faultRate = pageFaultCount + pageHitCount > 0 
    ? ((pageFaultCount / (pageFaultCount + pageHitCount)) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🏃 Page Runner 💨
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
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{score}</div>
            <div className="text-xs text-gray-400">Score</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{coins} 🪙</div>
            <div className="text-xs text-gray-400">Coins</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-pink-500/30">
            <div className="text-2xl font-bold text-pink-400">{gems} 💎</div>
            <div className="text-xs text-gray-400">Gems</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{pageHitCount}</div>
            <div className="text-xs text-gray-400">Hits</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{pageFaultCount}</div>
            <div className="text-xs text-gray-400">Faults</div>
          </div>
        </div>

        {/* Policy & Fault Rate */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Replacement Policy:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setReplacementPolicy('LRU')}
                  className={`px-3 py-1 rounded text-xs font-bold transition ${
                    replacementPolicy === 'LRU' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  1: LRU
                </button>
                <button
                  onClick={() => setReplacementPolicy('FIFO')}
                  className={`px-3 py-1 rounded text-xs font-bold transition ${
                    replacementPolicy === 'FIFO' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  2: FIFO
                </button>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Page Fault Rate:</span>
              <span className={`text-lg font-bold ${
                faultRate > 30 ? 'text-red-400' : faultRate > 15 ? 'text-orange-400' : 'text-green-400'
              }`}>
                {faultRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="max-w-6xl mx-auto bg-gray-800/50 rounded-2xl border-2 border-gray-700 p-0 relative overflow-hidden" style={{ height: '400px' }}>
        {/* Lanes */}
        {Array.from({ length: TOTAL_LANES }).map((_, idx) => (
          <div
            key={idx}
            className="absolute left-0 right-0 border-b border-gray-600/30"
            style={{ top: `${(idx + 1) * (400 / (TOTAL_LANES + 1))}px`, height: '2px' }}
          ></div>
        ))}

        {/* Runner */}
        <div
          className="absolute left-32 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-3xl transition-all duration-200 shadow-lg z-10"
          style={{ top: `${(runnerY + 1) * (400 / (TOTAL_LANES + 1)) - 32}px` }}
        >
          🏃
        </div>

        {/* Platforms */}
        {platforms.map(platform => (
          <div
            key={platform.id}
            className={`absolute w-24 h-12 rounded-lg transition-all duration-100 flex items-center justify-center ${
              platform.loaded 
                ? 'bg-blue-500/80 shadow-lg shadow-blue-500/50 animate-pulse' 
                : 'bg-gray-600/50'
            }`}
            style={{ 
              left: `${platform.x}px`, 
              top: `${(platform.lane + 1) * (400 / (TOTAL_LANES + 1)) - 24}px` 
            }}
          >
            <div className="text-xs font-bold text-white">P{platform.pageId}</div>
            {platform.hasCollectible && !platform.collected && (
              <div className="absolute -top-6 text-2xl animate-bounce">
                {platform.collectibleType === 'coin' ? '🪙' : '💎'}
              </div>
            )}
          </div>
        ))}

        {/* Page Fault Overlay */}
        {pageFaulting && (
          <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center z-20">
            <div className="text-6xl animate-pulse">⏸️</div>
            <div className="absolute bottom-1/3 text-2xl font-bold text-white animate-bounce">
              PAGE FAULT!
            </div>
          </div>
        )}

        {/* Distance counter */}
        <div className="absolute top-4 right-4 bg-gray-900/80 px-4 py-2 rounded-lg">
          <div className="text-xs text-gray-400">Distance</div>
          <div className="text-xl font-bold text-white">{Math.floor(distance / 10)}m</div>
        </div>
      </div>

      {/* Memory Frames */}
      <div className="max-w-6xl mx-auto mt-6 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-bold text-gray-400 mb-3">Memory Frames ({memoryFrames} frames):</h3>
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: memoryFrames }).map((_, idx) => {
            const pageId = loadedPages[idx];
            return (
              <div
                key={idx}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-bold ${
                  pageId 
                    ? 'bg-blue-500/30 border-blue-400 text-blue-400' 
                    : 'bg-gray-700/30 border-gray-600 text-gray-500'
                }`}
              >
                {pageId ? `P${pageId}` : '—'}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {replacementPolicy === 'LRU' ? '← LRU (Least Recently Used)' : '← FIFO (First In First Out)'}
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-6xl mx-auto mt-6 bg-gray-800/80 rounded-lg p-4 border border-gray-700">
        <div className="text-center space-y-2">
          <div className="text-sm font-bold text-gray-400">Controls:</div>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-300">
            <span>↑/W: Move Up</span>
            <span>↓/S: Move Down</span>
            <span>1: LRU Policy</span>
            <span>2: FIFO Policy</span>
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
              'bg-blue-500'
            } text-white font-bold`}
          >
            {alert.message}
          </div>
        ))}
      </div>
    </div>
  );
}
