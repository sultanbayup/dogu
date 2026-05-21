import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { ToolLayout } from '../../layouts/ToolLayout'
import { CopyButton } from '../../components/CopyButton'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useUrlHashState } from '../../hooks/useUrlHashState'
import { splitTeams } from './splitTeams'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamSplitterStorage {
  namesText: string
  teamCount: number
  balanced: boolean
}

/** 2-D array: [teamIndex][memberIndex] */
type TeamAssignment = string[][]

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_STORAGE: TeamSplitterStorage = {
  namesText: '',
  teamCount: 2,
  balanced: true,
}

const NULL_ASSIGNMENT: TeamAssignment | null = null

// Team colour palette — cycles for > 2 teams
const TEAM_COLORS = [
  {
    label: 'Team Blue',
    heading: 'text-blue-400',
    border: 'border-blue-400/30',
    headingBorder: 'border-b-blue-400/40',
    item: 'bg-blue-500/10',
  },
  {
    label: 'Team Red',
    heading: 'text-red-400',
    border: 'border-red-400/30',
    headingBorder: 'border-b-red-400/40',
    item: 'bg-red-500/10',
  },
  {
    label: 'Team Green',
    heading: 'text-emerald-400',
    border: 'border-emerald-400/30',
    headingBorder: 'border-b-emerald-400/40',
    item: 'bg-emerald-500/10',
  },
  {
    label: 'Team Yellow',
    heading: 'text-yellow-400',
    border: 'border-yellow-400/30',
    headingBorder: 'border-b-yellow-400/40',
    item: 'bg-yellow-500/10',
  },
  {
    label: 'Team Purple',
    heading: 'text-purple-400',
    border: 'border-purple-400/30',
    headingBorder: 'border-b-purple-400/40',
    item: 'bg-purple-500/10',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNames(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 100)
    .map((name) => name.slice(0, 50))
}

function buildCopyPayload(teams: TeamAssignment): string {
  return teams
    .map((members, i) => {
      const color = TEAM_COLORS[i % TEAM_COLORS.length]
      return `${color.label}: ${members.join(', ')}`
    })
    .join('\n')
}

function getStaggerClass(index: number): string {
  const n = Math.min(index + 1, 10)
  return `stagger-${n}`
}

// ─── Team Results ─────────────────────────────────────────────────────────────

interface TeamResultsProps {
  teams: TeamAssignment
  /** Incremented on each reshuffle to force re-mount and re-animate */
  animKey: number
  onReset: () => void
  onReshuffle: () => void
}

function TeamResults({ teams, animKey, onReset, onReshuffle }: TeamResultsProps) {
  const copyPayload = buildCopyPayload(teams)

  // Two-column for exactly 2 teams, single column otherwise
  const gridClass =
    teams.length === 2
      ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
      : 'grid grid-cols-1 gap-4'

  return (
    <div className="flex flex-col gap-6 animate-slide-up w-full max-w-lg" key={animKey}>
      {/* Team cards */}
      <div className={gridClass}>
        {teams.map((members, i) => {
          const color = TEAM_COLORS[i % TEAM_COLORS.length]
          return (
            <div
              key={i}
              className={[
                'glass-panel rounded-card p-5 flex flex-col gap-3',
                color.border,
              ].join(' ')}
            >
              <h2
                className={[
                  'text-base font-semibold text-center pb-2 border-b',
                  color.heading,
                  color.headingBorder,
                ].join(' ')}
              >
                {color.label}
              </h2>
              <ul className="flex flex-col gap-2" role="list">
                {members.map((name, j) => (
                  <li
                    key={j}
                    className={[
                      'animate-pop-in',
                      getStaggerClass(j),
                      color.item,
                      'rounded-button px-3 py-2 text-sm text-text',
                    ].join(' ')}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <CopyButton payload={copyPayload} />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            aria-label="Reset — go back to the input form"
            onClick={onReset}
            className={[
              'min-h-[44px] px-5 py-2',
              'rounded-button text-sm font-medium',
              'glass-panel text-text-secondary',
              'hover:text-text transition-colors duration-fast cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            ].join(' ')}
          >
            Reset
          </button>
          <button
            type="button"
            aria-label="Reshuffle — generate new random teams from the same names"
            onClick={onReshuffle}
            className={[
              'min-h-[44px] px-5 py-2',
              'rounded-button text-sm font-medium text-white',
              'bg-accent hover:opacity-90 active:opacity-75 cursor-pointer',
              'transition-opacity duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            ].join(' ')}
          >
            Reshuffle
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeamSplitterTool() {
  const prefersReducedMotion = useReducedMotion()

  const [storage, setStorage] = useLocalStorage<TeamSplitterStorage>(
    'team-splitter',
    DEFAULT_STORAGE,
  )

  const [hashResult, setHashResult] = useUrlHashState<TeamAssignment | null>(
    NULL_ASSIGNMENT,
  )

  // Whether we're showing results or the input form
  const [showResults, setShowResults] = useState(false)

  // Incremented on each reshuffle to force re-mount of TeamResults (re-triggers animations)
  const [animKey, setAnimKey] = useState(0)

  // Show results automatically if there's a hash result on load
  useEffect(() => {
    if (hashResult && hashResult.length > 0) {
      setShowResults(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ──────────────────────────────────────────────────────────

  const validNames = useMemo(() => parseNames(storage.namesText), [storage.namesText])
  const participantCount = validNames.length
  const teamCount = storage.teamCount
  const balanced = storage.balanced

  const kTooLow = teamCount < 2
  const kTooHigh = teamCount > 20
  const kOutOfRange = kTooLow || kTooHigh
  const kExceedsN = !kOutOfRange && participantCount >= 2 && teamCount > participantCount
  const tooFewNames = participantCount < 2
  const isDisabled = tooFewNames || kOutOfRange || kExceedsN

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNamesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setStorage({ ...storage, namesText: e.target.value })
    },
    [storage, setStorage],
  )

  const handleTeamCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10)
      setStorage({ ...storage, teamCount: isNaN(parsed) ? 0 : parsed })
    },
    [storage, setStorage],
  )

  const handleBalancedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setStorage({ ...storage, balanced: e.target.checked })
    },
    [storage, setStorage],
  )

  const generate = useCallback(
    (isReshuffle = false) => {
      if (isDisabled) return
      const result = splitTeams(validNames, teamCount, balanced)
      try {
        setHashResult(result)
      } catch {
        console.warn('TeamSplitter: result too large to encode in URL hash')
      }
      setShowResults(true)
      if (isReshuffle) {
        setAnimKey((k) => k + 1)
      }
      if (!prefersReducedMotion) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } })
      }
    },
    [isDisabled, validNames, teamCount, balanced, setHashResult, prefersReducedMotion],
  )

  const handleReset = useCallback(() => {
    setShowResults(false)
  }, [])

  const handleReshuffle = useCallback(() => {
    generate(true)
  }, [generate])

  // ── Counter colour ──────────────────────────────────────────────────────────

  const counterColor =
    participantCount === 0
      ? 'text-text-secondary'
      : participantCount < 2
        ? 'text-red-400'
        : 'text-emerald-400'

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ToolLayout title="Team Splitter">
      {showResults && hashResult && hashResult.length > 0 ? (
        <TeamResults
          teams={hashResult}
          animKey={animKey}
          onReset={handleReset}
          onReshuffle={handleReshuffle}
        />
      ) : (
        <div className="flex flex-col gap-6 max-w-lg w-full animate-slide-up">

          {/* Names textarea */}
          <div className="glass-panel rounded-card p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="ts-names" className="text-sm font-medium text-text-secondary">
                Enter Names
                <span className="ml-1 text-text-secondary/60 font-normal">(one per line)</span>
              </label>
              <textarea
                id="ts-names"
                aria-label="Participant names, one per line"
                value={storage.namesText}
                onChange={handleNamesChange}
                rows={8}
                placeholder={"Player 1\nPlayer 2\nPlayer 3\nPlayer 4\nPlayer 5\nPlayer 6\nPlayer 7\nPlayer 8\nPlayer 9\nPlayer 10"}
                className={[
                  'w-full min-h-[44px] resize-y',
                  'bg-bg/60 text-text placeholder:text-text-secondary/40',
                  'border border-white/10 rounded-button',
                  'px-3 py-2 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  'transition-shadow duration-fast',
                ].join(' ')}
              />
              <div className="flex items-center justify-between">
                <span className={['text-xs font-semibold', counterColor].join(' ')}>
                  {participantCount} name{participantCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Team count + balanced row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="ts-team-count" className="text-sm font-medium text-text-secondary">
                  Number of teams
                </label>
                <input
                  id="ts-team-count"
                  type="number"
                  aria-label="Number of teams (2 to 20)"
                  min={2}
                  max={20}
                  value={storage.teamCount}
                  onChange={handleTeamCountChange}
                  className={[
                    'w-full min-h-[44px]',
                    'bg-bg/60 text-text',
                    'border rounded-button px-3 py-2 text-sm',
                    kOutOfRange
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : 'border-white/10 focus-visible:ring-accent',
                    'focus-visible:outline-none focus-visible:ring-2',
                  ].join(' ')}
                />
              </div>

              {/* Balanced toggle */}
              <div className="flex flex-col gap-2 justify-end">
                <label
                  htmlFor="ts-balanced"
                  className="flex items-center gap-3 cursor-pointer select-none min-h-[44px]"
                >
                  <span className="relative inline-flex items-center">
                    <input
                      id="ts-balanced"
                      type="checkbox"
                      role="switch"
                      aria-label="Balanced mode — teams will have equal or near-equal sizes"
                      aria-checked={balanced}
                      checked={balanced}
                      onChange={handleBalancedChange}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={[
                        'block w-11 h-6 rounded-full transition-colors duration-fast',
                        balanced ? 'bg-accent' : 'bg-white/20',
                      ].join(' ')}
                    />
                    <span
                      aria-hidden="true"
                      className={[
                        'absolute left-0.5 top-0.5 block w-5 h-5 rounded-full bg-white shadow transition-transform duration-fast',
                        balanced ? 'translate-x-5' : 'translate-x-0',
                      ].join(' ')}
                    />
                  </span>
                  <span className="text-sm text-text-secondary">Balanced</span>
                </label>
              </div>
            </div>

            {/* Validation messages */}
            {kOutOfRange && (
              <p role="alert" className="text-xs text-red-400">
                Number of teams must be between 2 and 20
              </p>
            )}
            {kExceedsN && (
              <p role="alert" className="text-xs text-red-400">
                Fewer names than teams ({participantCount} participant{participantCount !== 1 ? 's' : ''}, {teamCount} teams)
              </p>
            )}

            {/* Split button */}
            <button
              type="button"
              disabled={isDisabled}
              aria-label="Split teams"
              onClick={() => generate(false)}
              className={[
                'min-h-[44px] w-full',
                'rounded-button px-4 py-2',
                'text-sm font-semibold text-white',
                'transition-opacity duration-fast',
                isDisabled
                  ? 'bg-accent/40 cursor-not-allowed opacity-50'
                  : 'bg-accent hover:opacity-90 active:opacity-75 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              ].join(' ')}
            >
              Split Teams
            </button>
          </div>

          {/* View last result — shown when there's a hash result but we're on the input screen */}
          {hashResult && hashResult.length > 0 && (
            <button
              type="button"
              aria-label="View last result"
              onClick={() => setShowResults(true)}
              className={[
                'min-h-[44px] w-full',
                'rounded-button px-4 py-2',
                'text-sm font-medium',
                'glass-panel text-text-secondary',
                'hover:text-text transition-colors duration-fast cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              ].join(' ')}
            >
              View last result
            </button>
          )}
        </div>
      )}
    </ToolLayout>
  )
}
