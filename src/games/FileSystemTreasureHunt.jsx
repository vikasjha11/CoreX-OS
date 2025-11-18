import { useState, useEffect, useCallback } from 'react';

export default function FileSystemTreasureHunt() {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, won
  const [score, setScore] = useState(0);
  const [treasuresCollected, setTreasuresCollected] = useState(0);
  const [achievements, setAchievements] = useState([]);

  // Island/File System (8x8 grid representing disk blocks)
  const DISK_SIZE = 64; // 8x8 blocks
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [diskBlocks, setDiskBlocks] = useState(Array(DISK_SIZE).fill(null).map((_, idx) => ({
    id: idx,
    type: 'free', // free, allocated, treasure, corrupted, cave
    file: null, // file id if allocated
    content: null
  })));

  // Caves (directories)
  const [caves, setCaves] = useState([
    { id: 1, name: 'Root Cave', x: 0, y: 0, explored: false, treasures: 3 },
    { id: 2, name: 'Shadow Cave', x: 6, y: 1, explored: false, treasures: 2 },
    { id: 3, name: 'Crystal Cave', x: 2, y: 5, explored: false, treasures: 2 },
    { id: 4, name: 'Deep Cave', x: 7, y: 7, explored: false, treasures: 3 }
  ]);

  // Files stored on disk
  const [files, setFiles] = useState([]);
  const [nextFileId, setNextFileId] = useState(1);
  const [selectedAllocation, setSelectedAllocation] = useState('contiguous'); // contiguous, linked, indexed

  // Disk metrics
  const [fragmentation, setFragmentation] = useState(0);
  const [corruptedFiles, setCorruptedFiles] = useState(0);
  
  const [alerts, setAlerts] = useState([]);
  const [showInodeViewer, setShowInodeViewer] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Power-ups
  const [powerUps, setPowerUps] = useState({
    defragBoost: { count: 2, cooldown: 0 },
    fileShield: { count: 2, cooldown: 0, active: false, timeLeft: 0 }
  });

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 3000);
  }, []);

  // Calculate fragmentation
  const calculateFragmentation = useCallback(() => {
    const allocatedBlocks = diskBlocks.filter(b => b.type === 'allocated');
    if (allocatedBlocks.length === 0) {
      setFragmentation(0);
      return;
    }

    // Count gaps between allocated blocks
    let gaps = 0;
    for (let i = 0; i < diskBlocks.length - 1; i++) {
      if (diskBlocks[i].type === 'allocated' && diskBlocks[i + 1].type === 'free') {
        gaps++;
      }
    }

    const fragPercent = (gaps / allocatedBlocks.length) * 100;
    setFragmentation(Math.min(100, fragPercent));
  }, [diskBlocks]);

  // Store treasure as file
  const storeTreasure = (treasure, allocationMethod) => {
    const requiredBlocks = Math.floor(Math.random() * 3) + 2; // 2-4 blocks
    
    // Find free blocks
    const freeBlocks = diskBlocks
      .map((b, idx) => ({ ...b, index: idx }))
      .filter(b => b.type === 'free');

    if (freeBlocks.length < requiredBlocks) {
      addAlert('⚠️ Not enough disk space!', 'danger');
      return false;
    }

    let allocatedBlockIndices = [];
    let success = false;

    if (allocationMethod === 'contiguous') {
      // Find contiguous space
      for (let i = 0; i <= diskBlocks.length - requiredBlocks; i++) {
        const isContiguous = diskBlocks
          .slice(i, i + requiredBlocks)
          .every(b => b.type === 'free');
        
        if (isContiguous) {
          allocatedBlockIndices = Array.from({ length: requiredBlocks }, (_, idx) => i + idx);
          success = true;
          break;
        }
      }

      if (!success) {
        addAlert('❌ No contiguous space! Use linked or indexed allocation', 'warning');
        if (!powerUps.fileShield.active) {
          // Create corrupted file
          createCorruptedFile(requiredBlocks);
        }
        return false;
      }
    } else if (allocationMethod === 'linked') {
      // Allocate anywhere, link them
      allocatedBlockIndices = freeBlocks.slice(0, requiredBlocks).map(b => b.index);
      success = true;
    } else if (allocationMethod === 'indexed') {
      // Need one extra block for index
      if (freeBlocks.length < requiredBlocks + 1) {
        addAlert('⚠️ Not enough space for index block!', 'danger');
        return false;
      }
      const indexBlock = freeBlocks[0].index;
      allocatedBlockIndices = [indexBlock, ...freeBlocks.slice(1, requiredBlocks + 1).map(b => b.index)];
      success = true;
    }

    if (success) {
      const newFile = {
        id: nextFileId,
        name: treasure.name,
        allocationMethod,
        blocks: allocatedBlockIndices,
        size: requiredBlocks,
        corrupted: false
      };

      setFiles(prev => [...prev, newFile]);
      setNextFileId(id => id + 1);

      setDiskBlocks(prev => prev.map((block, idx) => 
        allocatedBlockIndices.includes(idx) 
          ? { ...block, type: 'allocated', file: nextFileId, content: treasure.name }
          : block
      ));

      addAlert(`✅ Stored ${treasure.name} (${allocationMethod})`, 'success');
      setScore(s => s + 100);
      setTreasuresCollected(t => t + 1);
      
      calculateFragmentation();
      return true;
    }

    return false;
  };

  // Create corrupted file
  const createCorruptedFile = (size) => {
    const freeBlocks = diskBlocks
      .map((b, idx) => ({ ...b, index: idx }))
      .filter(b => b.type === 'free')
      .slice(0, size);

    if (freeBlocks.length === 0) return;

    const blockIndices = freeBlocks.map(b => b.index);
    
    setDiskBlocks(prev => prev.map((block, idx) => 
      blockIndices.includes(idx) 
        ? { ...block, type: 'corrupted', content: '💀 CORRUPTED' }
        : block
    ));

    setCorruptedFiles(c => c + 1);
    addAlert('💀 File corrupted!', 'danger');
    setScore(s => Math.max(0, s - 50));
  };

  // Power-up: Defrag Boost
  const useDefragBoost = () => {
    if (powerUps.defragBoost.count <= 0 || powerUps.defragBoost.cooldown > 0) return;

    // Compact all allocated blocks to the beginning
    const allocatedBlocks = diskBlocks.filter(b => b.type === 'allocated');
    const corruptedBlocks = diskBlocks.filter(b => b.type === 'corrupted');
    const freeBlocksCount = DISK_SIZE - allocatedBlocks.length - corruptedBlocks.length;

    const newDiskBlocks = [
      ...allocatedBlocks,
      ...Array(freeBlocksCount).fill(null).map((_, idx) => ({
        id: allocatedBlocks.length + idx,
        type: 'free',
        file: null,
        content: null
      })),
      ...corruptedBlocks.map((b, idx) => ({ ...b, id: allocatedBlocks.length + freeBlocksCount + idx }))
    ];

    setDiskBlocks(newDiskBlocks);
    setFragmentation(0);

    setPowerUps(prev => ({
      ...prev,
      defragBoost: { count: prev.defragBoost.count - 1, cooldown: 30 }
    }));

    addAlert('🔧 Disk defragmented!', 'success');
    setScore(s => s + 200);
  };

  // Power-up: File Shield
  const useFileShield = () => {
    if (powerUps.fileShield.count <= 0 || powerUps.fileShield.cooldown > 0) return;

    setPowerUps(prev => ({
      ...prev,
      fileShield: { count: prev.fileShield.count - 1, cooldown: 40, active: true, timeLeft: 30 }
    }));

    addAlert('🛡️ File Shield activated!', 'success');
    setScore(s => s + 100);

    setTimeout(() => {
      setPowerUps(prev => ({
        ...prev,
        fileShield: { ...prev.fileShield, active: false, timeLeft: 0 }
      }));
      addAlert('File Shield ended', 'info');
    }, 30000);
  };

  // Move player
  const movePlayer = useCallback((dx, dy) => {
    if (gameState !== 'playing') return;

    const newX = Math.max(0, Math.min(7, playerPos.x + dx));
    const newY = Math.max(0, Math.min(7, playerPos.y + dy));

    if (newX === playerPos.x && newY === playerPos.y) return;

    setPlayerPos({ x: newX, y: newY });

    // Check for cave
    const cave = caves.find(c => c.x === newX && c.y === newY && !c.explored);
    if (cave) {
      setCaves(prev => prev.map(c => 
        c.id === cave.id ? { ...c, explored: true } : c
      ));
      addAlert(`🏰 Discovered ${cave.name}!`, 'success');
      setScore(s => s + 50);

      // Generate treasures in this cave
      for (let i = 0; i < cave.treasures; i++) {
        const blockIndex = (newY * 8) + newX + i;
        if (blockIndex < DISK_SIZE && diskBlocks[blockIndex].type === 'free') {
          setDiskBlocks(prev => prev.map((block, idx) => 
            idx === blockIndex 
              ? { ...block, type: 'treasure', content: `💎 Treasure ${treasuresCollected + i + 1}` }
              : block
          ));
        }
      }
    }

    // Check for treasure
    const blockIndex = (newY * 8) + newX;
    if (diskBlocks[blockIndex]?.type === 'treasure') {
      const treasure = {
        name: diskBlocks[blockIndex].content,
        size: Math.floor(Math.random() * 3) + 2
      };

      // Prompt allocation method (auto-use selected)
      storeTreasure(treasure, selectedAllocation);

      setDiskBlocks(prev => prev.map((block, idx) => 
        idx === blockIndex 
          ? { ...block, type: 'free', content: null }
          : block
      ));
    }
  }, [playerPos, gameState, caves, diskBlocks, selectedAllocation, treasuresCollected, storeTreasure, addAlert]);

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
          setSelectedAllocation('contiguous');
          addAlert('Switched to Contiguous', 'info');
          break;
        case '2':
          setSelectedAllocation('linked');
          addAlert('Switched to Linked', 'info');
          break;
        case '3':
          setSelectedAllocation('indexed');
          addAlert('Switched to Indexed', 'info');
          break;
        case 'i':
        case 'I':
          setShowInodeViewer(v => !v);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, movePlayer, addAlert]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      calculateFragmentation();

      // Update cooldowns
      setPowerUps(prev => ({
        defragBoost: {
          ...prev.defragBoost,
          cooldown: Math.max(0, prev.defragBoost.cooldown - 1)
        },
        fileShield: {
          ...prev.fileShield,
          cooldown: Math.max(0, prev.fileShield.cooldown - 1),
          timeLeft: Math.max(0, prev.fileShield.timeLeft - 1)
        }
      }));

      // Check achievements
      if (corruptedFiles === 0 && files.length >= 5 && !achievements.includes('no-corruption')) {
        setAchievements(prev => [...prev, 'no-corruption']);
        addAlert('🏆 Achievement: Zero Corruption!', 'success');
        setScore(s => s + 500);
      }

      if (fragmentation < 10 && files.length >= 5 && !achievements.includes('low-frag')) {
        setAchievements(prev => [...prev, 'low-frag']);
        addAlert('🏆 Achievement: Defrag Master!', 'success');
        setScore(s => s + 300);
      }

      // Win condition
      if (treasuresCollected >= 10) {
        setGameState('won');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, fragmentation, corruptedFiles, files.length, treasuresCollected, achievements, calculateFragmentation, addAlert]);

  if (showInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4">🏝️ File System Treasure Hunt</h1>
            <p className="text-2xl text-yellow-300">Explore & Store Wisely!</p>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-yellow-500/30">
            <h2 className="text-3xl font-bold mb-4 text-yellow-300">🧠 OS Concepts Learned</h2>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="bg-yellow-500/20 p-4 rounded-lg">✓ Directory Structure</div>
              <div className="bg-yellow-500/20 p-4 rounded-lg">✓ File Allocation Methods</div>
              <div className="bg-yellow-500/20 p-4 rounded-lg">✓ Contiguous/Linked/Indexed</div>
              <div className="bg-yellow-500/20 p-4 rounded-lg">✓ Inodes & Metadata</div>
              <div className="bg-yellow-500/20 p-4 rounded-lg">✓ Disk Fragmentation</div>
              <div className="bg-yellow-500/20 p-4 rounded-lg">✓ File Corruption</div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-yellow-500/30">
            <h2 className="text-3xl font-bold mb-4 text-green-300">🎮 How to Play</h2>
            <ul className="space-y-3 text-lg">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🏝️</span>
                <span>Explore an island shaped like a file system (8×8 disk blocks)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🏰</span>
                <span>Every cave = a directory containing treasures</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">💎</span>
                <span>Walk over treasures to collect them</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">💾</span>
                <span>Choose allocation method (1: Contiguous, 2: Linked, 3: Indexed)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <span>Wrong mapping → corrupted file cave (lose points)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🗺️</span>
                <span>Press I to view Inode viewer and file details</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <span>Collect 10 treasures to win!</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-yellow-500/30">
            <h2 className="text-3xl font-bold mb-4 text-cyan-300">📁 Allocation Methods</h2>
            <div className="space-y-3 text-lg">
              <div className="bg-blue-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">1️⃣ Contiguous Allocation</div>
                <div>Files stored in consecutive blocks. Fast access, but causes fragmentation. Fails if no contiguous space.</div>
              </div>
              <div className="bg-green-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">2️⃣ Linked Allocation</div>
                <div>Blocks linked together. No external fragmentation, but slower access. Always succeeds.</div>
              </div>
              <div className="bg-purple-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">3️⃣ Indexed Allocation</div>
                <div>Index block points to data blocks. Fast random access, needs extra space for index.</div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-yellow-500/30">
            <h2 className="text-3xl font-bold mb-4 text-yellow-300">🏆 Scoring</h2>
            <ul className="space-y-2 text-lg">
              <li>✓ Discover cave: +50 points</li>
              <li>✓ Store treasure successfully: +100 points</li>
              <li>✓ File corruption: -50 points</li>
              <li>✓ Use Defrag Boost: +200 points</li>
              <li>✓ Achievement "Zero Corruption" (5+ files, 0 corrupted): +500 points</li>
              <li>✓ Achievement "Defrag Master" (fragmentation &lt; 10%): +300 points</li>
            </ul>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-yellow-500/30">
            <h2 className="text-3xl font-bold mb-4 text-blue-300">⚡ Power-ups</h2>
            <div className="space-y-4 text-lg">
              <div className="bg-blue-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">🔧 Defrag Boost (2 uses)</div>
                <div>Repairs fragmentation by compacting all files. Cooldown: 30 seconds</div>
              </div>
              <div className="bg-green-500/20 p-4 rounded-lg">
                <div className="font-bold mb-2">🛡️ File Shield (2 uses)</div>
                <div>Prevents file corruption for 30 seconds. Cooldown: 40 seconds</div>
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-yellow-500/30">
            <h2 className="text-3xl font-bold mb-4 text-red-300">🎮 Controls</h2>
            <ul className="space-y-2 text-lg">
              <li>⬆️⬇️⬅️➡️ or WASD: Move explorer</li>
              <li>1: Contiguous Allocation</li>
              <li>2: Linked Allocation</li>
              <li>3: Indexed Allocation</li>
              <li>I: Toggle Inode Viewer</li>
            </ul>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl font-bold text-2xl hover:scale-105 transition-transform shadow-lg"
          >
            Start Exploring 🏝️
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'won') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-green-900 to-black text-white p-8 flex items-center justify-center">
        <div className="bg-black/60 backdrop-blur-lg p-12 rounded-3xl text-center max-w-2xl border-4 border-yellow-500">
          <div className="text-8xl mb-6">🏆</div>
          <h2 className="text-5xl font-bold mb-4 text-yellow-500">Island Conquered!</h2>
          <p className="text-2xl mb-4">All treasures collected!</p>
          <div className="bg-yellow-500/20 p-6 rounded-xl mb-6">
            <div className="text-3xl mb-2">Final Statistics</div>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div>Score: {score}</div>
              <div>Treasures: {treasuresCollected}</div>
              <div>Corrupted: {corruptedFiles}</div>
              <div>Fragmentation: {fragmentation.toFixed(1)}%</div>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl font-bold text-xl hover:scale-105 transition-transform"
          >
            New Expedition
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-black text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">🏝️ File System Treasure Hunt</h1>
          <div className="flex gap-4 text-lg">
            <span className="bg-yellow-600 px-4 py-2 rounded-lg">Score: {score}</span>
            <span className="bg-green-600 px-4 py-2 rounded-lg">💎 {treasuresCollected}/10</span>
            <span className={`px-4 py-2 rounded-lg ${selectedAllocation === 'contiguous' ? 'bg-blue-600' : selectedAllocation === 'linked' ? 'bg-green-600' : 'bg-purple-600'}`}>
              {selectedAllocation.toUpperCase()}
            </span>
            <span className={`px-4 py-2 rounded-lg ${fragmentation > 50 ? 'bg-red-600' : fragmentation > 25 ? 'bg-yellow-600' : 'bg-green-600'}`}>
              Frag: {fragmentation.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {powerUps.fileShield.active && (
            <div className="bg-green-600 px-4 py-2 rounded-lg animate-pulse">
              🛡️ Shield: {powerUps.fileShield.timeLeft}s
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="fixed top-20 right-8 z-50 space-y-2">
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
        {/* Left: Island Map */}
        <div className="col-span-3 space-y-6">
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
            <h2 className="text-2xl font-bold mb-4">🗺️ Island Map (File System)</h2>
            <div className="bg-gradient-to-br from-green-800 to-yellow-800 rounded-xl p-4 border-2 border-yellow-500/50">
              <div className="grid grid-cols-8 gap-1">
                {diskBlocks.map((block, idx) => {
                  const x = idx % 8;
                  const y = Math.floor(idx / 8);
                  const isPlayer = playerPos.x === x && playerPos.y === y;
                  const cave = caves.find(c => c.x === x && c.y === y);

                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded-sm flex items-center justify-center text-xs font-bold transition-all ${
                        isPlayer ? 'bg-yellow-500 text-black scale-110 z-10 ring-2 ring-white' :
                        block.type === 'treasure' ? 'bg-yellow-400 animate-pulse' :
                        block.type === 'corrupted' ? 'bg-red-600 animate-pulse' :
                        block.type === 'allocated' ? 'bg-blue-600/50' :
                        cave ? (cave.explored ? 'bg-purple-600/50' : 'bg-purple-800') :
                        'bg-green-700/30'
                      }`}
                      title={`Block ${idx}: ${block.type}${block.file ? ` (File ${block.file})` : ''}`}
                    >
                      {isPlayer ? '🧭' : 
                       block.type === 'treasure' ? '💎' :
                       block.type === 'corrupted' ? '💀' :
                       block.type === 'allocated' ? '📁' :
                       cave ? '🏰' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                <span>Player</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-800 rounded flex items-center justify-center">🏰</div>
                <span>Cave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center">💎</div>
                <span>Treasure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600/50 rounded flex items-center justify-center text-xs">📁</div>
                <span>Allocated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">💀</div>
                <span>Corrupted</span>
              </div>
            </div>
          </div>

          {/* File List */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
            <h2 className="text-2xl font-bold mb-4">📁 Stored Files ({files.length})</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.length === 0 ? (
                <div className="text-center text-gray-400 py-4">No files stored yet</div>
              ) : (
                files.map(file => (
                  <div
                    key={file.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedFile?.id === file.id ? 'bg-yellow-600' : 
                      file.corrupted ? 'bg-red-600/30' : 'bg-gray-700'
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{file.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        file.allocationMethod === 'contiguous' ? 'bg-blue-600' :
                        file.allocationMethod === 'linked' ? 'bg-green-600' :
                        'bg-purple-600'
                      }`}>
                        {file.allocationMethod}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Blocks: {file.blocks.join(', ')} | Size: {file.size}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inode Viewer */}
          {showInodeViewer && selectedFile && (
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/50">
              <h2 className="text-2xl font-bold mb-4">🔍 Inode Viewer</h2>
              <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm space-y-2">
                <div><span className="text-cyan-400">File ID:</span> {selectedFile.id}</div>
                <div><span className="text-cyan-400">Name:</span> {selectedFile.name}</div>
                <div><span className="text-cyan-400">Allocation:</span> {selectedFile.allocationMethod}</div>
                <div><span className="text-cyan-400">Size:</span> {selectedFile.size} blocks</div>
                <div><span className="text-cyan-400">Blocks:</span> [{selectedFile.blocks.join(', ')}]</div>
                <div><span className="text-cyan-400">Corrupted:</span> {selectedFile.corrupted ? 'Yes ⚠️' : 'No ✅'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="space-y-6">
          {/* Caves */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
            <h3 className="text-xl font-bold mb-4">🏰 Caves</h3>
            <div className="space-y-2">
              {caves.map(cave => (
                <div
                  key={cave.id}
                  className={`p-3 rounded-lg ${cave.explored ? 'bg-purple-600/30' : 'bg-gray-700'}`}
                >
                  <div className="font-bold">{cave.name}</div>
                  <div className="text-xs text-gray-400">
                    {cave.explored ? '✅ Explored' : `📍 (${cave.x}, ${cave.y})`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation Method */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
            <h3 className="text-xl font-bold mb-4">💾 Allocation</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedAllocation('contiguous')}
                className={`w-full px-4 py-2 rounded-lg font-bold text-sm ${
                  selectedAllocation === 'contiguous' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                1️⃣ Contiguous
              </button>
              <button
                onClick={() => setSelectedAllocation('linked')}
                className={`w-full px-4 py-2 rounded-lg font-bold text-sm ${
                  selectedAllocation === 'linked' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                2️⃣ Linked
              </button>
              <button
                onClick={() => setSelectedAllocation('indexed')}
                className={`w-full px-4 py-2 rounded-lg font-bold text-sm ${
                  selectedAllocation === 'indexed' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                3️⃣ Indexed
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
            <h3 className="text-xl font-bold mb-4">📊 Statistics</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Files Stored:</span>
                <span className="font-bold text-blue-400">{files.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Corrupted Files:</span>
                <span className="font-bold text-red-400">{corruptedFiles}</span>
              </div>
              <div className="flex justify-between">
                <span>Fragmentation:</span>
                <span className={`font-bold ${fragmentation > 50 ? 'text-red-400' : 'text-green-400'}`}>
                  {fragmentation.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Caves Explored:</span>
                <span className="font-bold">{caves.filter(c => c.explored).length}/{caves.length}</span>
              </div>
            </div>
          </div>

          {/* Power-ups */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
            <h3 className="text-xl font-bold mb-4">⚡ Power-ups</h3>
            <div className="space-y-3">
              <button
                onClick={useDefragBoost}
                disabled={powerUps.defragBoost.count <= 0 || powerUps.defragBoost.cooldown > 0}
                className="w-full px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                🔧 Defrag Boost
                <div className="text-xs mt-1">
                  {powerUps.defragBoost.count} uses
                  {powerUps.defragBoost.cooldown > 0 && ` (${powerUps.defragBoost.cooldown}s)`}
                </div>
              </button>
              <button
                onClick={useFileShield}
                disabled={powerUps.fileShield.count <= 0 || powerUps.fileShield.cooldown > 0}
                className="w-full px-4 py-3 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
              >
                🛡️ File Shield
                <div className="text-xs mt-1">
                  {powerUps.fileShield.count} uses
                  {powerUps.fileShield.cooldown > 0 && ` (${powerUps.fileShield.cooldown}s)`}
                </div>
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
            <h3 className="text-xl font-bold mb-4">🎮 Controls</h3>
            <div className="space-y-1 text-sm">
              <div>⬆️⬇️⬅️➡️ / WASD: Move</div>
              <div>1/2/3: Change allocation</div>
              <div>I: Toggle Inode viewer</div>
            </div>
          </div>

          <button
            onClick={() => setShowInodeViewer(v => !v)}
            className="w-full px-4 py-3 bg-cyan-700 rounded-lg hover:bg-cyan-600"
          >
            {showInodeViewer ? '🔍 Hide' : '🔍 Show'} Inode Viewer
          </button>

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
