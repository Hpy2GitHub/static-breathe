import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './App.module.css'

// ── helpers ───────────────────────────────────────────────────────────────────

function getRatios(pattern) {
  const [a, b] = pattern.split(':').map(Number)
  const t = a + b
  return { inhale: a / t, exhale: b / t }
}

function cycleSecs(bpm) { return 60 / bpm }

function phaseDur(phase, bpm, pattern, holdSecs) {
  if (phase === 'hold') return holdSecs
  const r = getRatios(pattern)
  return cycleSecs(bpm) * (phase === 'inhale' ? r.inhale : r.exhale)
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function cycleInfo(bpm, pattern, holdSecs) {
  const total = cycleSecs(bpm)
  const r = getRatios(pattern)
  const inS  = (total * r.inhale).toFixed(1)
  const exS  = (total * r.exhale).toFixed(1)
  const hold = holdSecs > 0 ? ` · ${holdSecs}s hold` : ''
  return `${inS}s inhale${hold} · ${exS}s exhale`
}

function nextPhase(phase, holdSecs) {
  if (phase === 'inhale') return holdSecs > 0 ? 'hold' : 'exhale'
  if (phase === 'hold')   return 'exhale'
  return 'inhale'
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

const PATTERNS = ['1:1', '1:2', '1:3', '2:1', '3:1']

// ── localStorage persistence ──────────────────────────────────────────────────

const STORAGE_KEY = 'breathing-app-settings'

const DEFAULTS = {
  maxRadius:       70,
  sessionMinutes:  5,
  bpm:             6,
  pattern:         '1:1',
  holdSecs:        1,
  showTimer:       true,
  showBreathCount: true,
  showProgressBar: true,
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULTS }
}

function saveSettings(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch {}
}

// ── component ─────────────────────────────────────────────────────────────────

export default function App() {
  // initialise all settings from localStorage (lazy init avoids reading on every render)
  const [maxRadius,       setMaxRadius]       = useState(() => loadSettings().maxRadius)
  const [sessionMinutes,  setSessionMinutes]  = useState(() => loadSettings().sessionMinutes)
  const [bpm,             setBpm]             = useState(() => loadSettings().bpm)
  const [pattern,         setPattern]         = useState(() => loadSettings().pattern)
  const [holdSecs,        setHoldSecs]        = useState(() => loadSettings().holdSecs)
  const [showTimer,       setShowTimer]       = useState(() => loadSettings().showTimer)
  const [showBreathCount, setShowBreathCount] = useState(() => loadSettings().showBreathCount)
  const [showProgressBar, setShowProgressBar] = useState(() => loadSettings().showProgressBar)
  const [showSettings,    setShowSettings]    = useState(false)

  // persist whenever any setting changes
  useEffect(() => {
    saveSettings({ maxRadius, sessionMinutes, bpm, pattern, holdSecs,
                   showTimer, showBreathCount, showProgressBar })
  }, [maxRadius, sessionMinutes, bpm, pattern, holdSecs,
      showTimer, showBreathCount, showProgressBar])

  // display state
  const [status,         setStatus]         = useState('idle')
  const [displayPhase,   setDisplayPhase]   = useState('Ready')
  const [displaySub,     setDisplaySub]     = useState('Press start')
  const [sessionDisplay, setSessionDisplay] = useState(() => fmtTime(loadSettings().sessionMinutes * 60))
  const [circleR,        setCircleR]        = useState(() => loadSettings().maxRadius * 0.42)
  const [phaseProgress,  setPhaseProgress]  = useState(0)
  const [breathDisplay,  setBreathDisplay]  = useState('—')

  // animation refs
  const animRef   = useRef(null)
  const sessRef   = useRef(null)
  const loopState = useRef({
    phase: 'inhale', phaseElapsed: 0, lastTs: null, breathCount: 0, sessionLeft: 0,
  })
  const settingsRef = useRef({ maxRadius, bpm, pattern, holdSecs })

  useEffect(() => {
    settingsRef.current = { maxRadius, bpm, pattern, holdSecs }
  }, [maxRadius, bpm, pattern, holdSecs])

  const minR = useCallback((max) => max * 0.42, [])

  // ── animation loop ────────────────────────────────────────────────────────
  const animate = useCallback((ts) => {
    const ls = loopState.current
    const ss = settingsRef.current

    if (!ls.lastTs) ls.lastTs = ts
    const dt = (ts - ls.lastTs) / 1000
    ls.lastTs = ts
    ls.phaseElapsed += dt

    const dur  = phaseDur(ls.phase, ss.bpm, ss.pattern, ss.holdSecs)
    const prog = Math.min(ls.phaseElapsed / dur, 1)
    const lo   = minR(ss.maxRadius)
    const hi   = ss.maxRadius

    const eased = easeInOutSine(prog)
    let r
    if (ls.phase === 'inhale') r = lo + (hi - lo) * eased
    else if (ls.phase === 'hold') r = hi
    else r = hi - (hi - lo) * eased

    setCircleR(r)
    setPhaseProgress(prog)
    setDisplaySub(`${Math.max(0, Math.ceil(dur - ls.phaseElapsed))}s`)

    if (prog >= 1) {
      ls.phaseElapsed = 0
      ls.phase = nextPhase(ls.phase, ss.holdSecs)
      if (ls.phase === 'inhale') {
        ls.breathCount++
        setBreathDisplay(`${ls.breathCount} breath${ls.breathCount === 1 ? '' : 's'}`)
      }
      const labels = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale' }
      setDisplayPhase(labels[ls.phase])
    }

    if (ls.running) animRef.current = requestAnimationFrame(animate)
  }, [minR])

  // ── controls ──────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const ls = loopState.current
    ls.running = true; ls.phase = 'inhale'; ls.phaseElapsed = 0; ls.lastTs = null
    setStatus('running'); setDisplayPhase('Inhale'); setDisplaySub('')
    animRef.current = requestAnimationFrame(animate)
    sessRef.current = setInterval(() => {
      const ls = loopState.current
      ls.sessionLeft = Math.max(0, ls.sessionLeft - 1)
      setSessionDisplay(fmtTime(ls.sessionLeft))
      if (ls.sessionLeft <= 0) finish()
    }, 1000)
  }, [animate])

  const pause = useCallback(() => {
    loopState.current.running = false
    cancelAnimationFrame(animRef.current)
    clearInterval(sessRef.current); sessRef.current = null
    setStatus('paused'); setDisplayPhase('Paused'); setDisplaySub('—')
  }, [])

  const finish = useCallback(() => {
    loopState.current.running = false
    cancelAnimationFrame(animRef.current)
    clearInterval(sessRef.current); sessRef.current = null
    setStatus('done'); setDisplayPhase('Complete')
    setDisplaySub(`${loopState.current.breathCount} breaths`); setPhaseProgress(0)
  }, [])

  const reset = useCallback(() => {
    loopState.current.running = false
    cancelAnimationFrame(animRef.current)
    clearInterval(sessRef.current); sessRef.current = null
    const ls = loopState.current
    ls.phase = 'inhale'; ls.phaseElapsed = 0; ls.lastTs = null
    ls.breathCount = 0; ls.sessionLeft = sessionMinutes * 60
    setStatus('idle'); setDisplayPhase('Ready'); setDisplaySub('Press start')
    setSessionDisplay(fmtTime(sessionMinutes * 60))
    setCircleR(minR(maxRadius)); setPhaseProgress(0); setBreathDisplay('—')
  }, [sessionMinutes, maxRadius, minR])

  const toggleBreath = () => {
    if (status === 'running') pause()
    else if (status === 'paused') start()
    else { loopState.current.sessionLeft = sessionMinutes * 60; start() }
  }

  useEffect(() => {
    if (status === 'idle') setCircleR(minR(maxRadius))
  }, [maxRadius, status, minR])

  useEffect(() => {
    if (status === 'idle') {
      loopState.current.sessionLeft = sessionMinutes * 60
      setSessionDisplay(fmtTime(sessionMinutes * 60))
    }
  }, [sessionMinutes, status])

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current); clearInterval(sessRef.current)
  }, [])

  const startLabel = status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start'
  const SVG_SIZE = 280, cx = SVG_SIZE / 2

  return (
    <main className={styles.app}>

      {/* ── 3D ball ── */}
      <div className={styles.circleWrap}>
        <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <radialGradient id="sphereGrad" cx="38%" cy="32%" r="62%" fx="38%" fy="32%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="1" />
              <stop offset="40%"  stopColor="#dde8f8" stopOpacity="1" />
              <stop offset="75%"  stopColor="#a8c4e8" stopOpacity="1" />
              <stop offset="100%" stopColor="#6a96cc" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#000814" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#000814" stopOpacity="0"   />
            </radialGradient>
          </defs>
          <ellipse cx={cx} cy={cx + circleR * 0.72}
            rx={circleR * 0.75} ry={circleR * 0.18} fill="url(#shadowGrad)" />
          <circle cx={cx} cy={cx} r={circleR} fill="url(#sphereGrad)" />
          <ellipse
            cx={cx - circleR * 0.22} cy={cx - circleR * 0.26}
            rx={circleR * 0.18} ry={circleR * 0.11}
            fill="white" opacity="0.55"
            style={{ transform: 'rotate(-35deg)',
                     transformOrigin: `${cx - circleR * 0.22}px ${cx - circleR * 0.26}px` }}
          />
        </svg>
        <div className={styles.phaseOverlay}>
          <span className={styles.phaseSub}>{displayPhase}</span>
          <span className={styles.phaseSub}>{displaySub}</span>
        </div>
      </div>

      {/* ── optional numbers ── */}
      {showTimer       && <div className={styles.timerDisplay}>{sessionDisplay}</div>}
      {showBreathCount && <div className={styles.breathCount}>{breathDisplay}</div>}

      {/* ── optional progress bar ── */}
      {showProgressBar && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar} style={{ width: `${(phaseProgress * 100).toFixed(1)}%` }} />
        </div>
      )}

      {/* spacer so controls don't jump when elements are hidden */}
      {(!showTimer || !showBreathCount || !showProgressBar) && (
        <div style={{ height: `${
          (!showTimer ? 52 : 0) + (!showBreathCount ? 22 : 0) + (!showProgressBar ? 24 : 0)
        }px` }} />
      )}

      {/* ── controls ── */}
      <div className={styles.controls}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={toggleBreath}>{startLabel}</button>
        <button className={styles.btn} onClick={reset}>Reset</button>
        <button className={styles.btn} onClick={() => setShowSettings(s => !s)}>
          {showSettings ? 'Close' : 'Settings'}
        </button>
      </div>

      {/* ── settings panel ── */}
      {showSettings && (
        <div className={styles.settings}>

          <div className={styles.settingsSection}>
            <p className={styles.settingsSectionLabel}>Circle</p>
            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel} htmlFor="sl-radius">Ball size</label>
              <input id="sl-radius" type="range" min="45" max="105" step="5"
                value={maxRadius} onChange={e => setMaxRadius(Number(e.target.value))} />
              <span className={styles.settingsVal}>{maxRadius}</span>
            </div>
          </div>

          <div className={styles.settingsSection}>
            <p className={styles.settingsSectionLabel}>Session</p>
            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel} htmlFor="sl-session">Duration</label>
              <input id="sl-session" type="range" min="1" max="30" step="1"
                value={sessionMinutes} onChange={e => setSessionMinutes(Number(e.target.value))} />
              <span className={styles.settingsVal}>{sessionMinutes} min</span>
            </div>
          </div>

          <div className={styles.settingsSection}>
            <p className={styles.settingsSectionLabel}>Breathing</p>
            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel} htmlFor="sl-bpm">Breaths / min</label>
              <input id="sl-bpm" type="range" min="2" max="20" step="1"
                value={bpm} onChange={e => setBpm(Number(e.target.value))} />
              <span className={styles.settingsVal}>{bpm}</span>
            </div>
            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel} htmlFor="sl-hold">Hold after inhale</label>
              <input id="sl-hold" type="range" min="0" max="8" step="0.5"
                value={holdSecs} onChange={e => setHoldSecs(Number(e.target.value))} />
              <span className={styles.settingsVal}>{holdSecs === 0 ? 'off' : `${holdSecs}s`}</span>
            </div>
            <div className={styles.settingsRow} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
              <span className={styles.settingsLabel}>Pattern (in : out)</span>
              <div className={styles.patternBtns}>
                {PATTERNS.map(p => (
                  <button key={p}
                    className={`${styles.patBtn} ${pattern === p ? styles.patBtnActive : ''}`}
                    onClick={() => setPattern(p)}>{p}
                  </button>
                ))}
              </div>
            </div>
            <p className={styles.cycleInfo}>{cycleInfo(bpm, pattern, holdSecs)}</p>
          </div>

          <div className={styles.settingsSection}>
            <p className={styles.settingsSectionLabel}>Display</p>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={showTimer}
                onChange={e => setShowTimer(e.target.checked)} />
              <span>Session timer</span>
            </label>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={showBreathCount}
                onChange={e => setShowBreathCount(e.target.checked)} />
              <span>Breath count</span>
            </label>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={showProgressBar}
                onChange={e => setShowProgressBar(e.target.checked)} />
              <span>Progress bar</span>
            </label>
          </div>

        </div>
      )}
    </main>
  )
}
