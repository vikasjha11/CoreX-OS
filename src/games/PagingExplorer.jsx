import { useState, useEffect, useCallback } from 'react';

export default function PagingExplorer() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, paused, gameover
  const [score, setScore] = useState(0);
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);

  // Grid world (16x12 grid)
  const GRID_SIZE = { width: 16, height: 12 };
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState([]);
  const [visitedCells, setVisitedCells] = useState(new Set());

  // Paging system
  const PAGE_SIZE = 4; // 4 cells = 1 page
  const MAX_FRAMES = 4; // Physical memory has 4 frames initially
  const [physicalMemory, setPhysicalMemory] = useState([]); // Array of page numbers in memory
  const [pageTable, setPageTable] = useState({}); // Virtual page -> frame mapping
  const [tlbCache, setTlbCache] = useState([]); // TLB entries (max 2 initially)
  const [tlbSize, setTlbSize] = useState(2);
  const [maxFrames, setMaxFrames] = useState(MAX_FRAMES);
  
  // Statistics
  const [stats, setStats] = useState({
    pageFaults: 0,
    tlbHits: 0,
    tlbMisses: 0,
    totalAccesses: 0
  });

  const [replacementAlgorithm, setReplacementAlgorithm] = useState('LRU'); // LRU or FIFO
  const [isPageFault, setIsPageFault] = useState(false);
  const [lastAccessedPage, setLastAccessedPage] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Power-ups
  const [powerUps, setPowerUps] = useState({
    tlbBoost: { count: 2, cooldown: 0, active: false, timeLeft: 0 },
    lruVision: { count: 3, cooldown: 0, active: false }
  });

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 2500);
  }, []);

  // Calculate which page a grid position belongs to
  const getPageNumber = (x, y) => {
    const cellIndex = y * GRID_SIZE.width + x;
    return Math.floor(cellIndex / PAGE_SIZE);
  };

  // Initialize items on grid
  useEffect(() => {
    const newItems = [];
    for (let i = 0; i < 15; i++) {
      newItems.push({
        id: i,
        x: Math.floor(Math.random() * GRID_SIZE.width),
        y: Math.floor(Math.random() * GRID_SIZE.height),
        type: Math.random() < 0.3 ? 'tlb' : 'memory',
        collected: false
      });
    }
    setItems(newItems);
  }, []);

  // Page access with TLB check
  const accessPage = useCallback((pageNum) => {
    setLastAccessedPage(pageNum);
    setStats(prev => ({ ...prev, totalAccesses: prev.totalAccesses + 1 }));

    // Check TLB first
    const tlbEntry = tlbCache.find(entry => entry.page === pageNum);
    if (tlbEntry) {
      // TLB Hit!
      setStats(prev => ({ ...prev, tlbHits: prev.tlbHits + 1 }));
      setScore(s => s + 5);
      
      // Update LRU order
      if (replacementAlgorithm === 'LRU') {
        setTlbCache(prev => [
          { page: pageNum, frame: tlbEntry.frame, lastUsed: Date.now() },
          ...prev.filter(e => e.page !== pageNum)
        ]);
      }
      return;
    }

    // TLB Miss
    setStats(prev => ({ ...prev, tlbMisses: prev.tlbMisses + 1 }));

    // Check page table
    if (pageTable[pageNum] !== undefined) {
      // Page in memory, update TLB
      const frame = pageTable[pageNum];
      const newTlbEntry = { page: pageNum, frame, lastUsed: Date.now() };
      
      setTlbCache(prev => {
        const updated = [newTlbEntry, ...prev.filter(e => e.page !== pageNum)];
        return updated.slice(0, tlbSize);
      });
      return;
    }

    // Page Fault!
    setIsPageFault(true);
    setStats(prev => ({ ...prev, pageFaults: prev.pageFaults + 1 }));
    addAlert('⚠️ PAGE FAULT!', 'warning');
    setScore(s => Math.max(0, s - 10));

    setTimeout(() => {
      // Load page into memory
      if (physicalMemory.length < maxFrames) {
        // Free frame available
        const frame = physicalMemory.length;
        setPhysicalMemory(prev => [...prev, { page: pageNum, loadedAt: Date.now(), lastUsed: Date.now() }]);
        setPageTable(prev => ({ ...prev, [pageNum]: frame }));
      } else {
        // Need to replace a page
        let victimIndex;
        
        if (replacementAlgorithm === 'LRU') {
          // Find least recently used
          victimIndex = physicalMemory.reduce((minIdx, frame, idx, arr) => 
            frame.lastUsed < arr[minIdx].lastUsed ? idx : minIdx, 0
          );
        } else {
          // FIFO - oldest loaded
          victimIndex = physicalMemory.reduce((minIdx, frame, idx, arr) => 
            frame.loadedAt < arr[minIdx].loadedAt ? idx : minIdx, 0
          );
        }

        const victimPage = physicalMemory[victimIndex].page;
        addAlert(`Evicted page ${victimPage}`, 'info');

        // Update structures
        setPhysicalMemory(prev => {
          const updated = [...prev];
          updated[victimIndex] = { page: pageNum, loadedAt: Date.now(), lastUsed: Date.now() };
          return updated;
        });

        setPageTable(prev => {
          const updated = { ...prev };
          delete updated[victimPage];
          updated[pageNum] = victimIndex;
          return updated;
        });

        // Remove from TLB if present
        setTlbCache(prev => prev.filter(e => e.page !== victimPage));
      }

      // Add to TLB
      setTlbCache(prev => {
        const newEntry = { page: pageNum, frame: pageTable[pageNum] || physicalMemory.length - 1, lastUsed: Date.now() };
        return [newEntry, ...prev.filter(e => e.page !== pageNum)].slice(0, tlbSize);
      });

      setIsPageFault(false);
    }, 1000); // Slow-motion effect

  }, [tlbCache, pageTable, physicalMemory, replacementAlgorithm, tlbSize, maxFrames, addAlert]);

  // Handle player movement
  const movePlayer = useCallback((dx, dy) => {
    if (gameState !== 'playing' || isPageFault) return;

    const newX = Math.max(0, Math.min(GRID_SIZE.width - 1, playerPos.x + dx));
    const newY = Math.max(0, Math.min(GRID_SIZE.height - 1, playerPos.y + dy));

    if (newX === playerPos.x && newY === playerPos.y) return;

    setPlayerPos({ x: newX, y: newY });
    
    // Mark cell as visited
    const cellKey = `${newX},${newY}`;
    setVisitedCells(prev => new Set([...prev, cellKey]));

    // Access the page for this cell
    const pageNum = getPageNumber(newX, newY);
    accessPage(pageNum);

    // Check for item collection
    setItems(prev => prev.map(item => {
      if (item.x === newX && item.y === newY && !item.collected) {
        if (item.type === 'tlb') {
          setTlbSize(s => s + 1);
          addAlert('🎯 TLB size increased!', 'success');
          setScore(s => s + 50);
        } else {
          setMaxFrames(f => f + 1);
          addAlert('💾 Memory frame added!', 'success');
          setScore(s => s + 30);
        }
        return { ...item, collected: true };
      }
      return item;
    }));

    // Update score and XP
    setScore(s => s + 1);
    setXP(x => x + 2);

  }, [playerPos, gameState, isPageFault, accessPage, addAlert]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;
      
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          movePlayer(1, 0);
          break;
        case '1':
          setReplacementAlgorithm('LRU');
          addAlert('Switched to LRU', 'info');
          break;
        case '2':
          setReplacementAlgorithm('FIFO');
          addAlert('Switched to FIFO', 'info');
          break;
        case 't':
        case 'T':
          useTlbBoost();
          break;
        case 'v':
        case 'V':
          useLruVision();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, movePlayer, addAlert]);

  // Power-up: TLB Boost
  const useTlbBoost = () => {
    if (powerUps.tlbBoost.count <= 0 || powerUps.tlbBoost.cooldown > 0) return;

    const originalSize = tlbSize;
    setTlbSize(s => s * 2);
    
    setPowerUps(prev => ({
      ...prev,
      tlbBoost: { count: prev.tlbBoost.count - 1, cooldown: 30, active: true, timeLeft: 20 }
    }));

    addAlert('⚡ TLB Boost activated!', 'success');

    setTimeout(() => {
      setTlbSize(originalSize);
      setPowerUps(prev => ({
        ...prev,
        tlbBoost: { ...prev.tlbBoost, active: false, timeLeft: 0 }
      }));
      addAlert('TLB Boost ended', 'info');
    }, 20000);
  };

  // Power-up: LRU Vision
  const useLruVision = () => {
    if (powerUps.lruVision.count <= 0 || powerUps.lruVision.cooldown > 0) return;

    setPowerUps(prev => ({
      ...prev,
      lruVision: { count: prev.lruVision.count - 1, cooldown: 15, active: true }
    }));

    addAlert('👁️ LRU Vision activated!', 'success');

    setTimeout(() => {
      setPowerUps(prev => ({
        ...prev,
        lruVision: { ...prev.lruVision, active: false }
      }));
    }, 10000);
  };

  // Cooldown and level management
  useEffect(() => {
    const interval = setInterval(() => {
      setPowerUps(prev => ({
        tlbBoost: {
          ...prev.tlbBoost,
          cooldown: Math.max(0, prev.tlbBoost.cooldown - 1),
          timeLeft: Math.max(0, prev.tlbBoost.timeLeft - 1)
        },
        lruVision: {
          ...prev.lruVision,
          cooldown: Math.max(0, prev.lruVision.cooldown - 1)
        }
      }));

      // Working set bonus
      if (visitedCells.size > 0 && stats.pageFaults < visitedCells.size * 0.3) {
        setScore(s => s + 5);
      }

      // Level up
      if (xp >= level * 100) {
        setLevel(l => l + 1);
        addAlert(`🎊 Level ${level + 1}!`, 'success');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visitedCells, stats.pageFaults, xp, level, addAlert]);

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-cyan-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4">🗺️ Paging Explorer</h1>
            <p className="text-2xl text-cyan-300">Navigate Memory Space!</p>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-cyan-500/30">
            <h2 className="text-3xl font-bold mb-4 text-cyan-300">🧠 OS Concepts Learned</h2>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="bg-cyan-500/20 p-4 rounded-lg">✓ Virtual Memory & Paging</div>
              <div className="bg-cyan-500/20 p-4 rounded-lg">✓ Page Faults & Handling</div>
              <div className="bg-cyan-500/20 p-4 rounded-lg">✓ LRU & FIFO Replacement</div>
              <div className="bg-cyan-500/20 p-4 rounded-lg">✓ TLB & Caching</div>
              <div className="bg-cyan-500/20 p-4 rounded-lg">✓ Page Tables</div>
              <div className="bg-cyan-500/20 p-4 rounded-lg">✓ Working Set</div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-cyan-500/30">
            <h2 className="text-3xl font-bold mb-4 text-green-300">🎮 How to Play</h2>
            <ul className="space-y-3 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🕹️</span>
                <span>Move through grid world using Arrow Keys or WASD</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📄</span>
                <span>Each step accesses a new page - if not in memory → PAGE FAULT!</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">⏱️</span>
                <span>Page faults cause slow-motion effect (1 second delay)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <span>Collect items: 🔷 TLB boost, 💎 Memory frames</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🔄</span>
                <span>Press 1 for LRU, 2 for FIFO replacement algorithm</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <span>Watch live page table and TLB hit/miss counters</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-cyan-500/30">
            <h2 className="text-3xl font-bold mb-4 text-yellow-300">🏆 Scoring</h2>
            <ul className="space-y-2 text-lg">
              <li>✓ Each move: +1 point, +2 XP</li>
              <li>✓ TLB hit: +5 points</li>
              <li>✓ Collect TLB item: +50 points</li>
              <li>✓ Collect memory item: +30 points</li>
              <li>✓ Page fault: -10 points</li>
              <li>✓ Maintain working set (low faults): +5 points/second</li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-cyan-500/30">
            <h2 className="text-3xl font-bold mb-4 text-blue-300">⚡ Power-ups</h2>
            <div className="space-y-4 text-lg">
              <div className="bg-blue-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">⚡ TLB Boost (2 uses) - Press T</div>
                <div>Double TLB size for 20 seconds. Cooldown: 30 seconds</div>
              </div>
              <div className="bg-purple-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">👁️ LRU Vision (3 uses) - Press V</div>
                <div>Highlights least recently used page in memory. Duration: 10 seconds. Cooldown: 15 seconds</div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-cyan-500/30">
            <h2 className="text-3xl font-bold mb-4 text-purple-300">🎯 Strategy Tips</h2>
            <ul className="space-y-2 text-lg">
              <li>🔹 Move in patterns to maintain locality of reference</li>
              <li>🔹 LRU works best for sequential access patterns</li>
              <li>🔹 FIFO is simpler but can have more faults</li>
              <li>🔹 Collect TLB items early for better hit rates</li>
            </ul>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-2xl hover:scale-105 transition-transform shadow-lg"
          >
            Start Exploring 🗺️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-cyan-900 to-black text-white p-8 transition-all ${isPageFault ? 'animate-pulse' : ''}`}>
      {/* Page Fault Overlay */}
      {isPageFault && (
        <div className="fixed inset-0 bg-red-500/20 pointer-events-none z-50 animate-pulse">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-bold text-red-500 animate-bounce">
              ⚠️ PAGE FAULT
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">🗺️ Paging Explorer</h1>
          <div className="flex gap-4 text-lg">
            <span className="bg-cyan-600 px-4 py-2 rounded-lg">Score: {score}</span>
            <span className="bg-blue-600 px-4 py-2 rounded-lg">Level: {level}</span>
            <span className="bg-green-600 px-4 py-2 rounded-lg">XP: {xp}/{level * 100}</span>
            <span className={`px-4 py-2 rounded-lg ${replacementAlgorithm === 'LRU' ? 'bg-purple-600' : 'bg-orange-600'}`}>
              {replacementAlgorithm}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {powerUps.tlbBoost.active && (
            <div className="bg-blue-600 px-4 py-2 rounded-lg animate-pulse">
              ⚡ TLB Boost: {powerUps.tlbBoost.timeLeft}s
            </div>
          )}
          {powerUps.lruVision.active && (
            <div className="bg-purple-600 px-4 py-2 rounded-lg animate-pulse">
              👁️ LRU Vision Active
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="fixed top-20 right-8 z-40 space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-fade-in ${
              alert.type === 'danger' ? 'bg-red-600/90' :
              alert.type === 'success' ? 'bg-green-600/90' :
              alert.type === 'warning' ? 'bg-yellow-600/90' :
              'bg-blue-600/90'
            }`}
          >
            {alert.message}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left: Grid World */}
        <div className="col-span-3 bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
          <h2 className="text-2xl font-bold mb-4">🌍 Memory World</h2>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border-2 border-cyan-500/50">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE.width}, 1fr)` }}>
              {Array.from({ length: GRID_SIZE.height }).map((_, y) =>
                Array.from({ length: GRID_SIZE.width }).map((_, x) => {
                  const isPlayer = playerPos.x === x && playerPos.y === y;
                  const item = items.find(i => i.x === x && i.y === y && !i.collected);
                  const cellKey = `${x},${y}`;
                  const isVisited = visitedCells.has(cellKey);
                  const pageNum = getPageNumber(x, y);
                  const isInMemory = pageTable[pageNum] !== undefined;
                  const frameData = physicalMemory[pageTable[pageNum]];
                  const isLRU = powerUps.lruVision.active && frameData && 
                    physicalMemory.every(f => f.lastUsed >= frameData.lastUsed || f.page === frameData.page);

                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`aspect-square rounded-sm flex items-center justify-center text-lg font-bold transition-all ${
                        isPlayer ? 'bg-yellow-500 text-black scale-110 z-10' :
                        item ? (item.type === 'tlb' ? 'bg-blue-500' : 'bg-purple-500') :
                        isLRU ? 'bg-red-500/60 animate-pulse' :
                        isInMemory ? 'bg-green-600/40' :
                        isVisited ? 'bg-cyan-600/30' :
                        'bg-gray-700/50'
                      } ${isPlayer ? 'ring-2 ring-white' : ''}`}
                      title={`Cell (${x},${y}) - Page ${pageNum}`}
                    >
                      {isPlayer ? '🧭' : item ? (item.type === 'tlb' ? '🔷' : '💎') : ''}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded"></div>
              <span>Player</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-600/40 rounded"></div>
              <span>In Memory</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-600/30 rounded"></div>
              <span>Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs">🔷</div>
              <span>TLB Item</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-xs">💎</div>
              <span>Memory Item</span>
            </div>
          </div>
        </div>

        {/* Right: Stats and Controls */}
        <div className="space-y-6">
          {/* Statistics */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold mb-4">📊 Statistics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Total Accesses:</span>
                <span className="font-bold">{stats.totalAccesses}</span>
              </div>
              <div className="flex justify-between">
                <span>TLB Hits:</span>
                <span className="font-bold text-green-400">{stats.tlbHits}</span>
              </div>
              <div className="flex justify-between">
                <span>TLB Misses:</span>
                <span className="font-bold text-yellow-400">{stats.tlbMisses}</span>
              </div>
              <div className="flex justify-between">
                <span>Page Faults:</span>
                <span className="font-bold text-red-400">{stats.pageFaults}</span>
              </div>
              <div className="flex justify-between">
                <span>TLB Hit Rate:</span>
                <span className="font-bold">
                  {stats.totalAccesses > 0 ? ((stats.tlbHits / stats.totalAccesses) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fault Rate:</span>
                <span className="font-bold">
                  {stats.totalAccesses > 0 ? ((stats.pageFaults / stats.totalAccesses) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* TLB Cache */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold mb-4">⚡ TLB Cache ({tlbCache.length}/{tlbSize})</h3>
            <div className="space-y-2">
              {tlbCache.map((entry, idx) => (
                <div key={idx} className={`p-2 rounded-lg bg-blue-600/30 ${entry.page === lastAccessedPage ? 'ring-2 ring-yellow-400' : ''}`}>
                  <div className="flex justify-between text-sm">
                    <span>Page {entry.page}</span>
                    <span>Frame {entry.frame}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Physical Memory */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold mb-4">💾 Physical Memory ({physicalMemory.length}/{maxFrames})</h3>
            <div className="space-y-2">
              {physicalMemory.map((frame, idx) => {
                const isLRU = powerUps.lruVision.active && 
                  physicalMemory.every(f => f.lastUsed >= frame.lastUsed || f.page === frame.page);
                return (
                  <div key={idx} className={`p-2 rounded-lg ${isLRU ? 'bg-red-600/50 animate-pulse' : 'bg-green-600/30'} ${frame.page === lastAccessedPage ? 'ring-2 ring-yellow-400' : ''}`}>
                    <div className="flex justify-between text-sm">
                      <span>Frame {idx}</span>
                      <span>Page {frame.page}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Power-ups */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold mb-4">⚡ Power-ups</h3>
            <div className="space-y-3">
              <button
                onClick={useTlbBoost}
                disabled={powerUps.tlbBoost.count <= 0 || powerUps.tlbBoost.cooldown > 0}
                className="w-full px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                ⚡ TLB Boost (T)
                <div className="text-xs mt-1">
                  {powerUps.tlbBoost.count} uses
                  {powerUps.tlbBoost.cooldown > 0 && ` (${powerUps.tlbBoost.cooldown}s)`}
                </div>
              </button>
              <button
                onClick={useLruVision}
                disabled={powerUps.lruVision.count <= 0 || powerUps.lruVision.cooldown > 0}
                className="w-full px-3 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                👁️ LRU Vision (V)
                <div className="text-xs mt-1">
                  {powerUps.lruVision.count} uses
                  {powerUps.lruVision.cooldown > 0 && ` (${powerUps.lruVision.cooldown}s)`}
                </div>
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold mb-4">🎮 Controls</h3>
            <div className="space-y-2 text-sm">
              <div>⬆️⬇️⬅️➡️ or WASD: Move</div>
              <div>1: LRU Algorithm</div>
              <div>2: FIFO Algorithm</div>
              <div>T: TLB Boost</div>
              <div>V: LRU Vision</div>
            </div>
          </div>

          <button
            onClick={() => setShowInstructions(true)}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            📖 Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
