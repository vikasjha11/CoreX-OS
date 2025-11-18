import { useState } from 'react';
import CPUSchedulerSimulator from '../games/CPUSchedulerSimulator';
import MemoryTetris from '../games/MemoryTetris';
import DeadlockDungeon from '../games/DeadlockDungeon';
import SemaphoreTower from '../games/SemaphoreTower';
import PagingExplorer from '../games/PagingExplorer';
import OSTycoon from '../games/OSTycoon';
import ProducerConsumerFactory from '../games/ProducerConsumerFactory';
import FileSystemTreasureHunt from '../games/FileSystemTreasureHunt';
import ProcessPlanet from '../games/ProcessPlanet';
import MemoryFarm from '../games/MemoryFarm';
import DeadlockRescueTruck from '../games/DeadlockRescueTruck';
import PageRunner from '../games/PageRunner';
import SemaphoreDoor from '../games/SemaphoreDoor';

// Game data configuration
const GAMES_CONFIG = [
  {
    id: 'cpu-scheduler',
    title: 'CPU Scheduler Simulator',
    emoji: '🚂',
    subtitle: 'Mini Metro Style Process Scheduling',
    concepts: ['FCFS, SJF, RR, Priority', 'Waiting & Turnaround Time', 'CPU Utilization', 'Starvation Prevention'],
    difficulty: 'Medium',
    color: 'blue'
  },
  {
    id: 'memory-tetris',
    title: 'Memory Tetris',
    emoji: '🧩',
    subtitle: 'Fit Memory Blocks Efficiently',
    concepts: ['First/Best/Worst Fit', 'Fragmentation', 'Compaction', 'Memory Allocation'],
    difficulty: 'Easy',
    color: 'purple'
  },
  {
    id: 'deadlock-dungeon',
    title: 'Deadlock Dungeon',
    emoji: '🏰',
    subtitle: 'Break the Resource Cycle',
    concepts: ['Deadlock Detection', 'Resource Allocation Graph', 'Banker\'s Algorithm', 'Preemption & Recovery'],
    difficulty: 'Hard',
    color: 'purple'
  },
  {
    id: 'semaphore-tower',
    title: 'Semaphore Tower Escape',
    emoji: '🗼',
    subtitle: 'Synchronize to Survive',
    concepts: ['Semaphores (P & V)', 'Producer-Consumer', 'Reader-Writer', 'Dining Philosophers'],
    difficulty: 'Medium',
    color: 'indigo'
  },
  {
    id: 'paging-explorer',
    title: 'Paging Explorer',
    emoji: '🗺️',
    subtitle: 'Navigate Memory Space',
    concepts: ['Virtual Memory & Paging', 'Page Faults', 'LRU & FIFO Replacement', 'TLB & Caching'],
    difficulty: 'Easy',
    color: 'cyan'
  },
  {
    id: 'os-tycoon',
    title: 'OS Manager Tycoon',
    emoji: '💻',
    subtitle: 'Build & Manage Your OS',
    concepts: ['Process Management', 'CPU Load & Scheduling', 'Memory Management', 'Resource Allocation'],
    difficulty: 'Medium',
    color: 'green'
  },
  {
    id: 'producer-consumer',
    title: 'Producer-Consumer Factory',
    emoji: '🏭',
    subtitle: 'Master Synchronization',
    concepts: ['Buffers & Bounded Storage', 'Semaphores (P & V)', 'Synchronization', 'Race Conditions'],
    difficulty: 'Medium',
    color: 'orange'
  },
  {
    id: 'file-system-hunt',
    title: 'File System Treasure Hunt',
    emoji: '🏝️',
    subtitle: 'Explore & Store Wisely',
    concepts: ['Directory Structure', 'File Allocation Methods', 'Inodes & Metadata', 'Disk Fragmentation'],
    difficulty: 'Easy',
    color: 'yellow'
  },
  {
    id: 'process-planet',
    title: 'Process Planet',
    emoji: '👾',
    subtitle: 'Manage Process States',
    concepts: ['Process States', 'Context Switching', 'CPU Scheduling', 'Overload Prevention'],
    difficulty: 'Easy',
    color: 'blue'
  },
  {
    id: 'memory-farm',
    title: 'Memory Farm',
    emoji: '🌱',
    subtitle: 'Grow Your Memory',
    concepts: ['First & Best Fit', 'Fragmentation', 'Compaction', 'Memory Allocation'],
    difficulty: 'Easy',
    color: 'green'
  },
  {
    id: 'deadlock-rescue',
    title: 'Deadlock Rescue Truck',
    emoji: '🚗',
    subtitle: 'Break the Circular Wait',
    concepts: ['Deadlock Detection', 'Circular Wait', 'Resource Preemption', 'Prevention'],
    difficulty: 'Medium',
    color: 'red'
  },
  {
    id: 'page-runner',
    title: 'Page Runner',
    emoji: '🏃',
    subtitle: 'Run Through Memory',
    concepts: ['Paging & Page Faults', 'LRU & FIFO', 'TLB Cache', 'Working Set'],
    difficulty: 'Easy',
    color: 'cyan'
  },
  {
    id: 'semaphore-door',
    title: 'Semaphore Door',
    emoji: '🚪',
    subtitle: 'Unlock with P & V',
    concepts: ['Binary Semaphores', 'Wait & Signal', 'Mutual Exclusion', 'Synchronization'],
    difficulty: 'Easy',
    color: 'purple'
  },
];

// Main Gamification Component
export default function Gamification() {
  const [currentGame, setCurrentGame] = useState(null);
  const [playerStats, setPlayerStats] = useState({
    level: 1,
    totalScore: 0,
    gamesPlayed: 0,
    achievements: []
  });

  const handleBackToArcade = () => {
    console.log('Back button clicked, returning to game list');
    setCurrentGame(null);
    // Prevent browser back button from navigating away
    window.history.pushState(null, '', '/gamification');
  };

  // Game component mapping
  const gameComponents = {
    'cpu-scheduler': CPUSchedulerSimulator,
    'memory-tetris': MemoryTetris,
    'deadlock-dungeon': DeadlockDungeon,
    'semaphore-tower': SemaphoreTower,
    'paging-explorer': PagingExplorer,
    'os-tycoon': OSTycoon,
    'producer-consumer': ProducerConsumerFactory,
    'file-system-hunt': FileSystemTreasureHunt,
    'process-planet': ProcessPlanet,
    'memory-farm': MemoryFarm,
    'deadlock-rescue': DeadlockRescueTruck,
    'page-runner': PageRunner,
    'semaphore-door': SemaphoreDoor,
  };

  if (currentGame) {
    const GameComponent = gameComponents[currentGame];
    if (GameComponent) {
      return (
        <div className="min-h-screen">
          <GameComponent onBack={handleBackToArcade} />
        </div>
      );
    }
    // If game ID doesn't match any component
    console.error(`Game not found: ${currentGame}`);
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-white mb-4">Game not found</h2>
          <button
            onClick={handleBackToArcade}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Return to Arcade
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      title="OS Gaming Arcade 🎮"
      subtitle="Master Operating Systems Through Interactive Mini-Games">
      
      {/* Player Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition">
          <div className="text-4xl font-bold text-blue-400 mb-1">{playerStats.level}</div>
          <div className="text-gray-400 text-sm">Player Level</div>
          <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-3/4"></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-6 border border-purple-500/30 hover:border-purple-400/50 transition">
          <div className="text-4xl font-bold text-purple-400 mb-1">{playerStats.totalScore}</div>
          <div className="text-gray-400 text-sm">Total Score</div>
          <div className="text-purple-300 text-xs mt-2">🏆 Rank: Novice</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl p-6 border border-green-500/30 hover:border-green-400/50 transition">
          <div className="text-4xl font-bold text-green-400 mb-1">{playerStats.gamesPlayed}</div>
          <div className="text-gray-400 text-sm">Games Played</div>
          <div className="text-green-300 text-xs mt-2">🎮 {GAMES_CONFIG.length} Available</div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {GAMES_CONFIG.map((game) => {
          const colorClasses = {
            blue: 'from-blue-900/30 to-indigo-900/30 border-blue-500/30 hover:border-blue-400 hover:shadow-blue-500/50',
            purple: 'from-purple-900/30 to-indigo-900/30 border-purple-500/30 hover:border-purple-400 hover:shadow-purple-500/50',
            indigo: 'from-indigo-900/30 to-purple-900/30 border-indigo-500/30 hover:border-indigo-400 hover:shadow-indigo-500/50',
            cyan: 'from-cyan-900/30 to-blue-900/30 border-cyan-500/30 hover:border-cyan-400 hover:shadow-cyan-500/50',
            green: 'from-green-900/30 to-emerald-900/30 border-green-500/30 hover:border-green-400 hover:shadow-green-500/50',
            orange: 'from-orange-900/30 to-red-900/30 border-orange-500/30 hover:border-orange-400 hover:shadow-orange-500/50',
            yellow: 'from-yellow-900/30 to-orange-900/30 border-yellow-500/30 hover:border-yellow-400 hover:shadow-yellow-500/50',
            red: 'from-red-900/30 to-orange-900/30 border-red-500/30 hover:border-red-400 hover:shadow-red-500/50',
          };

          const classes = colorClasses[game.color] || colorClasses.blue;

          return (
            <div
              key={game.id}
              onClick={() => {
                console.log(`Launching game: ${game.id}`);
                setCurrentGame(game.id);
              }}
              className={`group cursor-pointer bg-gradient-to-br ${classes} rounded-xl p-4 border-2 hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
            >
              <div className="text-lg mb-2 group-hover:scale-110 transition-transform">{game.emoji}</div>
              <h3 className="text-xl font-bold text-white mb-1">{game.title}</h3>
              <p className="text-gray-400 text-xs mb-3 min-h-[32px]">{game.subtitle}</p>
              
              <div className="space-y-1 mb-3">
                {game.concepts.map((concept, i) => (
                  <div key={i} className="text-[10px] text-gray-400 flex items-center gap-1">
                    <span className="text-blue-400">•</span>
                    {concept}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className={`font-semibold ${
                  game.difficulty === 'Easy' ? 'text-green-400' :
                  game.difficulty === 'Medium' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {game.difficulty === 'Easy' ? '⭐' : game.difficulty === 'Medium' ? '⭐⭐' : '⭐⭐⭐'} {game.difficulty}
                </span>
                <span className="text-gray-400 group-hover:text-white transition">Play Now →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="mt-16 bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
        <h3 className="text-3xl font-bold mb-6 text-blue-400 text-center">🎮 How the Arcade Works</h3>
        <div className="grid md:grid-cols-3 gap-8 text-gray-300">
          <div>
            <h4 className="font-bold text-white mb-3 text-lg">🏆 Earn Points & Level Up</h4>
            <ul className="space-y-2 text-sm">
              <li>• Complete games to earn score points</li>
              <li>• Build combos for bonus multipliers</li>
              <li>• Achieve high efficiency for rewards</li>
              <li>• Unlock achievements and badges</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 text-lg">📚 Learn OS Concepts</h4>
            <ul className="space-y-2 text-sm">
              <li>• Each game teaches real OS algorithms</li>
              <li>• Visual demonstrations of concepts</li>
              <li>• Hands-on practice with theory</li>
              <li>• Progress from basics to advanced</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3 text-lg">🎯 Master Through Play</h4>
            <ul className="space-y-2 text-sm">
              <li>• Practice makes perfect</li>
              <li>• Detailed feedback and hints</li>
              <li>• Learn at your own pace</li>
              <li>• Track your progress over time</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function PageLayout({ title, subtitle, children }) {
  return (
    <section className="py-20 max-w-7xl mx-auto px-6 space-y-12">
      <header className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
          {title}
        </h1>
        {subtitle && <p className="text-lg text-gray-400 mt-3">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
