import { useState, useEffect, useCallback } from 'react';

export default function DeadlockRescueTruck({ onBack }) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameState, setGameState] = useState('playing'); // playing, deadlock
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [deadlocksResolved, setDeadlocksResolved] = useState(0);
  const [deadlocksPrevented, setDeadlocksPrevented] = useState(0);

  // Cars (processes) at 4-way intersection
  const [cars, setCars] = useState([
    { id: 1, position: 'north', color: 'bg-red-500', emoji: '🚗', needsRoad: 'east', waiting: false, honking: false },
    { id: 2, position: 'east', color: 'bg-blue-500', emoji: '🚕', needsRoad: 'south', waiting: false, honking: false },
    { id: 3, position: 'south', color: 'bg-green-500', emoji: '🚙', needsRoad: 'west', waiting: false, honking: false },
    { id: 4, position: 'west', color: 'bg-yellow-500', emoji: '🚐', needsRoad: 'north', waiting: false, honking: false }
  ]);

  // Roads (resources) - which car is using which road
  const [roads, setRoads] = useState({
    north: null,
    east: null,
    south: null,
    west: null
  });

  const [isDeadlocked, setIsDeadlocked] = useState(false);
  const [rescueTruckActive, setRescueTruckActive] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [trafficLights, setTrafficLights] = useState('red');

  // Add alert
  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 2500);
  }, []);

  // Check for circular wait (deadlock)
  const checkDeadlock = useCallback(() => {
    // Check if all cars are waiting for resources held by next car
    const northCar = cars.find(c => c.position === 'north');
    const eastCar = cars.find(c => c.position === 'east');
    const southCar = cars.find(c => c.position === 'south');
    const westCar = cars.find(c => c.position === 'west');

    if (!northCar || !eastCar || !southCar || !westCar) return false;

    // Check circular wait: north->east->south->west->north
    const circularWait = 
      northCar.waiting && roads.east === northCar.id &&
      eastCar.waiting && roads.south === eastCar.id &&
      southCar.waiting && roads.west === southCar.id &&
      westCar.waiting && roads.north === westCar.id;

    if (circularWait && !isDeadlocked) {
      setIsDeadlocked(true);
      setTrafficLights('red');
      setCars(prev => prev.map(c => ({ ...c, honking: true })));
      addAlert('🚨 DEADLOCK DETECTED!', 'error');
      return true;
    }
    return circularWait;
  }, [cars, roads, isDeadlocked, addAlert]);

  // Car requests a road
  const requestRoad = (carId) => {
    const car = cars.find(c => c.id === carId);
    if (!car || isDeadlocked) return;

    const roadNeeded = car.needsRoad;

    // Check if road is free
    if (roads[roadNeeded] === null) {
      // Allocate road to car
      setRoads(prev => ({ ...prev, [roadNeeded]: carId }));
      setCars(prev => prev.map(c => 
        c.id === carId ? { ...c, waiting: false } : c
      ));
      addAlert(`${car.emoji} got ${roadNeeded} road!`, 'success');
      setScore(prev => prev + 5);
    } else {
      // Car must wait
      setCars(prev => prev.map(c => 
        c.id === carId ? { ...c, waiting: true } : c
      ));
      addAlert(`${car.emoji} waiting for ${roadNeeded} road...`, 'warning');
    }
  };

  // Car releases a road and moves
  const releaseRoad = (carId) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return;

    // Find which road this car is using
    const roadUsed = Object.keys(roads).find(road => roads[road] === carId);
    
    if (roadUsed) {
      setRoads(prev => ({ ...prev, [roadUsed]: null }));
      addAlert(`${car.emoji} released ${roadUsed} road!`, 'info');
      setScore(prev => prev + 3);
    }
  };

  // Use rescue truck to tow a car
  const useRescueTruck = () => {
    if (!isDeadlocked || !selectedCar) {
      addAlert('Select a car to tow!', 'warning');
      return;
    }

    setRescueTruckActive(true);
    
    // Tow the selected car - release its road
    const car = cars.find(c => c.id === selectedCar);
    const roadUsed = Object.keys(roads).find(road => roads[road] === selectedCar);
    
    if (roadUsed) {
      setRoads(prev => ({ ...prev, [roadUsed]: null }));
    }

    // Reset car state
    setCars(prev => prev.map(c => 
      c.id === selectedCar 
        ? { ...c, waiting: false, honking: false }
        : { ...c, honking: false }
    ));

    setIsDeadlocked(false);
    setTrafficLights('green');
    setDeadlocksResolved(prev => prev + 1);
    setScore(prev => prev + 50);
    addAlert('🚛 Deadlock Broken! +50', 'success');

    setTimeout(() => {
      setRescueTruckActive(false);
      setSelectedCar(null);
    }, 1500);
  };

  // Prevent deadlock by smart scheduling
  const preventDeadlock = () => {
    // Release all roads and reset
    setRoads({ north: null, east: null, south: null, west: null });
    setCars(prev => prev.map(c => ({ ...c, waiting: false, honking: false })));
    setDeadlocksPrevented(prev => prev + 1);
    setScore(prev => prev + 30);
    addAlert('✅ Deadlock Prevented! +30', 'success');
  };

  // Auto-simulation
  useEffect(() => {
    if (gameState !== 'playing' || isDeadlocked) return;

    const interval = setInterval(() => {
      // Randomly request/release roads
      const randomCar = cars[Math.floor(Math.random() * cars.length)];
      
      if (Math.random() < 0.4) {
        requestRoad(randomCar.id);
      } else if (Math.random() < 0.2) {
        releaseRoad(randomCar.id);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameState, isDeadlocked, cars]);

  // Check for deadlock periodically
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      checkDeadlock();
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, checkDeadlock]);

  // Level up
  useEffect(() => {
    if (deadlocksResolved >= level * 3) {
      setLevel(prev => prev + 1);
      addAlert(`🎉 Level ${level + 1}!`, 'success');
    }
  }, [deadlocksResolved, level, addAlert]);

  if (showInstructions) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-red-900 to-blue-900 flex items-center justify-center z-50 p-6 overflow-y-auto">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 max-w-3xl border-2 border-red-500/50 shadow-2xl my-8">
          <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 bg-clip-text text-transparent">
            🚗 DEADLOCK RESCUE TRUCK 🚛
          </h2>
          
          <div className="space-y-6 text-gray-200">
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-2">⭐ OS Concepts:</h3>
              <p className="text-gray-300">• Deadlock Detection & Resolution</p>
              <p className="text-gray-300">• Circular Wait Condition</p>
              <p className="text-gray-300">• Resource Preemption</p>
              <p className="text-gray-300">• Deadlock Prevention</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-2">🎮 How to Play:</h3>
              <p className="text-gray-300">• 4 cars (processes) at a 4-way crossing</p>
              <p className="text-gray-300">• Each car needs a "resource road" to move</p>
              <p className="text-gray-300">• If all wait for each other → <strong>DEADLOCK!</strong> 🚨</p>
              <p className="text-gray-300">• <strong>Manual Controls:</strong></p>
              <p className="text-gray-300 ml-4">→ Click car to request road</p>
              <p className="text-gray-300 ml-4">→ Click "Release" to free road</p>
              <p className="text-gray-300">• Use rescue truck 🚛 to tow one car and break the cycle</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-2">🎨 Animations:</h3>
              <p className="text-gray-300">• Cars honk in frustration 📢</p>
              <p className="text-gray-300">• Traffic lights turn red 🔴</p>
              <p className="text-gray-300">• Rescue truck tows with rope animation 🚛</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-green-400 mb-2">🏆 Scoring:</h3>
              <p className="text-gray-300">• Request Road: +5</p>
              <p className="text-gray-300">• Release Road: +3</p>
              <p className="text-gray-300">• Prevent Deadlock: +30</p>
              <p className="text-gray-300">• Break Deadlock: +50</p>
            </div>

            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => setShowInstructions(false)}
                className="px-8 py-3 bg-gradient-to-r from-red-500 to-blue-500 rounded-lg font-bold text-white hover:scale-105 transition shadow-lg"
              >
                🚗 Start Traffic Control
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-blue-900 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 bg-clip-text text-transparent">
            🚗 Deadlock Rescue Truck 🚛
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
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{score}</div>
            <div className="text-xs text-gray-400">Score</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{level}</div>
            <div className="text-xs text-gray-400">Level</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{deadlocksResolved}</div>
            <div className="text-xs text-gray-400">Resolved</div>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-400">{deadlocksPrevented}</div>
            <div className="text-xs text-gray-400">Prevented</div>
          </div>
        </div>
      </div>

      {/* Intersection */}
      <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-2xl border-2 border-gray-700 p-8 relative" style={{ height: '500px' }}>
        {/* Traffic Lights */}
        <div className="absolute top-4 right-4 flex gap-2">
          <div className={`w-8 h-8 rounded-full ${trafficLights === 'red' ? 'bg-red-500 animate-pulse' : 'bg-red-900'}`}></div>
          <div className={`w-8 h-8 rounded-full ${trafficLights === 'green' ? 'bg-green-500 animate-pulse' : 'bg-green-900'}`}></div>
        </div>

        {/* Roads */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-80 h-80">
            {/* Horizontal Road */}
            <div className="absolute top-1/2 left-0 right-0 h-24 bg-gray-700 transform -translate-y-1/2">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-1 border-t-2 border-dashed border-yellow-400"></div>
              </div>
            </div>
            
            {/* Vertical Road */}
            <div className="absolute left-1/2 top-0 bottom-0 w-24 bg-gray-700 transform -translate-x-1/2">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-1 border-l-2 border-dashed border-yellow-400"></div>
              </div>
            </div>

            {/* Center Intersection */}
            <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gray-600 rounded-lg ${
              isDeadlocked ? 'ring-4 ring-red-500 animate-pulse' : ''
            }`}>
              {isDeadlocked && (
                <div className="flex items-center justify-center h-full text-4xl animate-bounce">
                  🚨
                </div>
              )}
            </div>

            {/* Cars */}
            {cars.map(car => {
              const positions = {
                north: { x: '50%', y: '-10%', transform: 'translateX(-50%)' },
                east: { x: '110%', y: '50%', transform: 'translateY(-50%)' },
                south: { x: '50%', y: '110%', transform: 'translateX(-50%)' },
                west: { x: '-10%', y: '50%', transform: 'translateY(-50%)' }
              };

              const pos = positions[car.position];

              return (
                <div
                  key={car.id}
                  onClick={() => {
                    if (isDeadlocked) {
                      setSelectedCar(car.id);
                    } else {
                      requestRoad(car.id);
                    }
                  }}
                  className={`absolute cursor-pointer transition-all duration-300 ${
                    car.waiting ? 'animate-bounce' : ''
                  } ${selectedCar === car.id ? 'ring-4 ring-white' : ''}`}
                  style={{ left: pos.x, top: pos.y, transform: pos.transform }}
                >
                  <div className={`${car.color} w-16 h-16 rounded-lg flex items-center justify-center text-3xl shadow-lg border-2 border-white/50 hover:scale-110 transition`}>
                    {car.emoji}
                  </div>
                  {car.waiting && (
                    <div className="absolute -top-2 -right-2 text-xl animate-pulse">
                      💨
                    </div>
                  )}
                  {car.honking && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xl animate-ping">
                      📢
                    </div>
                  )}
                  <div className="text-center text-xs text-white mt-1 bg-gray-900/80 rounded px-1">
                    {car.position} → {car.needsRoad}
                  </div>
                </div>
              );
            })}

            {/* Rescue Truck Animation */}
            {rescueTruckActive && selectedCar && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce z-50">
                🚛
              </div>
            )}
          </div>
        </div>

        {/* Deadlock Warning */}
        {isDeadlocked && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg font-bold animate-pulse shadow-2xl">
            🚨 CIRCULAR WAIT DETECTED! 🚨
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="max-w-4xl mx-auto mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Road Status:</h3>
          <div className="space-y-2 text-xs">
            {Object.entries(roads).map(([road, carId]) => {
              const car = cars.find(c => c.id === carId);
              return (
                <div key={road} className="flex items-center justify-between">
                  <span className="text-gray-300 capitalize">{road} Road:</span>
                  <span className={`font-bold ${carId ? 'text-red-400' : 'text-green-400'}`}>
                    {carId ? `${car?.emoji} Occupied` : '✅ Free'}
                  </span>
                  {carId && (
                    <button
                      onClick={() => releaseRoad(carId)}
                      className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      disabled={isDeadlocked}
                    >
                      Release
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Actions:</h3>
          <div className="space-y-2">
            <button
              onClick={useRescueTruck}
              disabled={!isDeadlocked || !selectedCar}
              className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-bold text-white hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚛 Use Rescue Truck
            </button>
            <button
              onClick={preventDeadlock}
              disabled={isDeadlocked}
              className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-bold text-white hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Prevent Deadlock
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {isDeadlocked ? '⚠️ Select a car to tow!' : '💡 Click cars to request roads'}
          </p>
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
    </div>
  );
}
