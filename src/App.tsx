import React, { useState } from 'react';
import { Activity, Zap, Play, RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck, Database } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'commands'>('overview');

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans antialiased p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-2xl font-bold tracking-tight text-white">Pulse Kinematic Fatigue Tracker</h1>
            </div>
            <p className="text-sm text-neutral-400 mt-1">
              Phase 2: Bicep Curl Kinematics, Phase Segmentation & Velocity Loss for Amazfit Active Edge (Zepp OS 3.0)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              Offline-First IMU
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
              Zepp OS v3
            </span>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-neutral-800 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            System Architecture
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pipeline' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Kinematic Pipeline
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'commands' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Watch CLI & Deployment
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Activity className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">State-Machine Detection</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Deterministic state tracking: IDLE → MOVEMENT_START → MOVING → DIRECTION_CHANGE → RETURNING → REP_VALIDATED. Rejects random wrist twitches.
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Zap className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">Phase Segmentation</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Dynamically detects concentric flexion vs eccentric lowering through rotational inflection points. Analyzes velocity loss strictly on concentric work.
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">Offline Calibration</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  3–5 controlled bicep curls establish the median baseline concentric velocity (1.00x), movement amplitude, and variance thresholds.
                </p>
              </div>
            </div>

            {/* Scientific Notice Banner */}
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 space-y-1">
                <p className="font-semibold text-amber-300">Important Scientific Limitation & Nomenclature:</p>
                <p>
                  Pulse provides a <strong>kinematic fatigue estimate</strong> (movement-performance decline) based on IMU-derived velocity loss. It does not measure physiological muscle fatigue, cellular depletion, or neurological CNS fatigue. All velocity values are presented as relative proxies (e.g. 0.82x) rather than absolute laboratory m/s.
                </p>
              </div>
            </div>

            {/* Watch UI Pages preview */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-white">Implemented Zepp OS Watch Pages (360×360 Round Display)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                  <div className="font-bold text-emerald-400">pages/home.js</div>
                  <div className="text-neutral-400">Exercise select, baseline indicator, navigation to workout, calibration, and sensor lab.</div>
                </div>
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                  <div className="font-bold text-amber-400">pages/calibration.js</div>
                  <div className="text-neutral-400">Guided 3-5 rep calibration with median baseline velocity and cadence variance check.</div>
                </div>
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                  <div className="font-bold text-cyan-400">pages/workout.js</div>
                  <div className="text-neutral-400">Real-time rep count, EST VEL (e.g. 0.82x), LOSS %, CONF %, and KINEMATIC FATIGUE status.</div>
                </div>
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                  <div className="font-bold text-purple-400">pages/setResult.js</div>
                  <div className="text-neutral-400">Set summary: total reps, baseline velocity, final velocity, max loss %, and fatigue score.</div>
                </div>
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
                  <div className="font-bold text-blue-400">pages/sensorLab.js</div>
                  <div className="text-neutral-400">Preserved Phase 1 diagnostics: live raw tri-axial acc, gyro, rate (Hz), and raw session logging.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Kinematic Pipeline */}
        {activeTab === 'pipeline' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-white">Deterministic Kinematic Signal Processing Flow</h2>
            
            <div className="space-y-4 text-xs">
              <div className="flex gap-4 items-start pb-4 border-b border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-emerald-400 shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-neutral-200">Real-Timestamp IMU Sampling & Dynamic Acceleration</h4>
                  <p className="text-neutral-400 mt-1">
                    Samples arrive via real-time callbacks without assuming a fixed 50Hz/100Hz frequency. Delta time (dt) is measured per tick. An exponential low-pass gravity filter subtracts resting gravitational vectors to yield pure dynamic linear acceleration.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start pb-4 border-b border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-cyan-400 shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-neutral-200">State-Machine Rep Candidate Tracking</h4>
                  <p className="text-neutral-400 mt-1">
                    Distinguishes intentional dumbbell curls from casual arm swings by verifying minimum rotational thresholds (28°/s), movement amplitude (3.5 m/s²), realistic durations (900ms to 6500ms), and 400ms inter-rep debounce.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start pb-4 border-b border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-amber-400 shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-neutral-200">Concentric / Eccentric Segmentation</h4>
                  <p className="text-neutral-400 mt-1">
                    Detects the apex (top inflection) of the curl where angular speed dips and directional acceleration reverses. Concentric phase is bounded between movement onset and apex inflection; eccentric phase covers lowering to rest.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start pb-4 border-b border-neutral-800">
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-purple-400 shrink-0">4</div>
                <div>
                  <h4 className="font-semibold text-neutral-200">Bounded Integration & Relative Concentric Velocity Proxy</h4>
                  <p className="text-neutral-400 mt-1">
                    To completely eliminate unbounded drift, acceleration is integrated <em>only</em> across the bounded concentric window. Combined with angular sweep, it yields the dimensionless relative velocity proxy normalized against the median calibration baseline.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-rose-400 shrink-0">5</div>
                <div>
                  <h4 className="font-semibold text-neutral-200">Velocity Loss & Kinematic Fatigue Classification</h4>
                  <p className="text-neutral-400 mt-1">
                    Velocity Loss (%) = ((Baseline - Current) / Baseline) × 100. Categorized into heuristic prototype bands: Low (&lt;5%), Mild (5–10%), Moderate (10–20%), High (20–30%), and Very High (&gt;30%). Modulated by signal confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Watch CLI & Deployment */}
        {activeTab === 'commands' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Run & Install on Amazfit Active Edge</h2>
            <p className="text-xs text-neutral-400">
              In your command prompt inside the project folder, run the standard Zeus preview command:
            </p>

            <div className="bg-neutral-950 p-4 rounded-lg font-mono text-xs text-emerald-400 border border-neutral-800">
              zeus preview
            </div>

            <div className="space-y-2 text-xs text-neutral-300">
              <p className="font-medium text-white">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                <li>Select <strong>Amazfit Active Edge</strong> from the interactive device prompt.</li>
                <li>In the Zepp App on your phone, navigate to <strong>Profile → Amazfit Active Edge → Developer Mode → Mini Program</strong>.</li>
                <li>Tap the <strong>[+]</strong> / <strong>Scan</strong> icon at the top right and scan the generated QR code.</li>
                <li>Open <strong>Pulse</strong> from your watch's app list!</li>
              </ol>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
