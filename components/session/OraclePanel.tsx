'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './OraclePanel.module.css';
import { createClient } from '@/lib/supabase/client';
import {
  consultOracle,
  LIKELIHOOD_LABELS,
  ANSWER_LABELS,
  MIN_FLUX,
  MAX_FLUX,
  NEUTRAL_FLUX,
  type Likelihood,
  type OracleResult,
} from '@/lib/oracle/builtin-oracle';
import { rollScaleCheck, SCALE_BAND_LABELS, type ScaleCheckResult } from '@/lib/oracle/scale-check';
import { generatePlotHook, formatPlotHook } from '@/lib/oracle/plot-hook-generator';
import { drawStory, formatStoryDraw } from '@/lib/oracle/story-draw-generator';
import { generateName } from '@/lib/oracle/name-generator';
import { generateQuickNpc, formatQuickNpc } from '@/lib/oracle/quick-npc-generator';
import { logOracleResult } from '@/lib/oracle/log-oracle-result';

const LIKELIHOODS = Object.keys(LIKELIHOOD_LABELS) as Likelihood[];
const ORACLE_STATE_DEBOUNCE_MS = 800;

type Tab = 'quick' | 'mine' | 'generators';
type QuickMode = 'ask' | 'scale';
type GeneratorMode = 'seed' | 'story' | 'name' | 'npc';

interface OraclePreset {
  id: string;
  label: string;
  likelihood: Likelihood;
}

interface OraclePanelProps {
  campaignId: string;
  sessionId: string;
}

export default function OraclePanel({ campaignId, sessionId }: OraclePanelProps) {
  const [tab, setTab] = useState<Tab>('quick');
  const [quickMode, setQuickMode] = useState<QuickMode>('ask');
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode>('seed');

  // --- Quick Oracle: Ask (built-in, fully client-side) ---
  const fluxStorageKey = `roleverse-oracle-flux-${campaignId}`;
  const [likelihood, setLikelihood] = useState<Likelihood>('fifty-fifty');
  const [flux, setFlux] = useState(() => {
    if (typeof window === 'undefined') return NEUTRAL_FLUX;
    const stored = Number(localStorage.getItem(fluxStorageKey));
    return stored >= MIN_FLUX && stored <= MAX_FLUX ? stored : NEUTRAL_FLUX;
  });
  const [quickResult, setQuickResult] = useState<OracleResult | null>(null);

  const handleFluxChange = useCallback(
    (value: number) => {
      setFlux(value);
      localStorage.setItem(fluxStorageKey, String(value));
    },
    [fluxStorageKey]
  );

  const logQuickResult = useCallback(
    (label: string, result: OracleResult) => {
      logOracleResult(
        sessionId,
        `${label} (Flux ${result.flux}) → ${ANSWER_LABELS[result.answer]}${result.twist ? ' — Twist!' : ''} ` +
          `[rolled ${result.roll} vs ${result.target}]`
      );
    },
    [sessionId]
  );

  const handleQuickAsk = useCallback(() => {
    const result = consultOracle(likelihood, flux);
    setQuickResult(result);
    logQuickResult(LIKELIHOOD_LABELS[likelihood], result);
  }, [likelihood, flux, logQuickResult]);

  // --- Quick Oracle: saved question presets ("clustered oracles") ---
  const [presets, setPresets] = useState<OraclePreset[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [newPresetLabel, setNewPresetLabel] = useState('');

  const persistPresets = useCallback(
    (next: OraclePreset[]) => {
      setPresets(next);
      const supabase = createClient();
      void supabase.from('campaigns').update({ oracle_presets: next }).eq('id', campaignId);
    },
    [campaignId]
  );

  const handleSavePreset = useCallback(() => {
    const label = newPresetLabel.trim();
    if (!label) return;
    const preset: OraclePreset = { id: crypto.randomUUID(), label, likelihood };
    persistPresets([...presets, preset]);
    setNewPresetLabel('');
  }, [newPresetLabel, likelihood, presets, persistPresets]);

  const handleDeletePreset = useCallback(
    (id: string) => {
      persistPresets(presets.filter((p) => p.id !== id));
    },
    [presets, persistPresets]
  );

  const handleAskPreset = useCallback(
    (preset: OraclePreset) => {
      const result = consultOracle(preset.likelihood, flux);
      setQuickResult(result);
      logQuickResult(preset.label, result);
    },
    [flux, logQuickResult]
  );

  // --- Quick Oracle: Scale Check ---
  const [scaleResult, setScaleResult] = useState<ScaleCheckResult | null>(null);

  const handleScaleCheck = useCallback(() => {
    const result = rollScaleCheck();
    setScaleResult(result);
    logOracleResult(sessionId, `Scale Check → ${SCALE_BAND_LABELS[result.band]} (${result.roll}/10)`);
  }, [sessionId]);

  // --- Generators (built-in, fully client-side) ---
  const [plotHook, setPlotHook] = useState<string | null>(null);
  const handleGenerateHook = useCallback(() => {
    const hook = formatPlotHook(generatePlotHook());
    setPlotHook(hook);
    logOracleResult(sessionId, `Plot Seed → ${hook}`);
  }, [sessionId]);

  const [storyDraw, setStoryDraw] = useState<string | null>(null);
  const handleDrawStory = useCallback(() => {
    const draw = formatStoryDraw(drawStory());
    setStoryDraw(draw);
    logOracleResult(sessionId, `Story Draw → ${draw}`);
  }, [sessionId]);

  const [generatedName, setGeneratedName] = useState<string | null>(null);
  const handleGenerateName = useCallback(() => {
    const name = generateName();
    setGeneratedName(name);
    logOracleResult(sessionId, `Name → ${name}`);
  }, [sessionId]);

  const [quickNpc, setQuickNpc] = useState<string | null>(null);
  const handleGenerateNpc = useCallback(() => {
    const npc = formatQuickNpc(generateQuickNpc());
    setQuickNpc(npc);
    logOracleResult(sessionId, `Quick NPC → ${npc}`);
  }, [sessionId]);

  // --- My Oracle (bring-your-own, retrieval-grounded) ---
  const [oracleState, setOracleState] = useState('');
  const [oracleStateLoaded, setOracleStateLoaded] = useState(false);
  const [question, setQuestion] = useState('');
  const [consulting, setConsulting] = useState(false);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [myError, setMyError] = useState('');
  const oracleStateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('campaigns')
        .select('oracle_state, oracle_presets')
        .eq('id', campaignId)
        .single();
      if (!cancelled) {
        setOracleState((data?.oracle_state as string | null) ?? '');
        setOracleStateLoaded(true);
        setPresets((data?.oracle_presets as OraclePreset[] | null) ?? []);
        setPresetsLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const handleOracleStateChange = useCallback(
    (value: string) => {
      setOracleState(value);
      if (oracleStateDebounceRef.current) clearTimeout(oracleStateDebounceRef.current);
      oracleStateDebounceRef.current = setTimeout(() => {
        const supabase = createClient();
        void supabase.from('campaigns').update({ oracle_state: value }).eq('id', campaignId);
      }, ORACLE_STATE_DEBOUNCE_MS);
    },
    [campaignId]
  );

  useEffect(() => {
    return () => {
      if (oracleStateDebounceRef.current) clearTimeout(oracleStateDebounceRef.current);
    };
  }, []);

  const handleConsult = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || consulting) return;
    setConsulting(true);
    setMyError('');
    setMyAnswer(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/oracle/consult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, question: trimmed }),
      });
      const data = await res.json().catch(() => ({ error: 'Request failed' }));
      if (!res.ok) {
        setMyError((data as { error?: string }).error ?? 'Oracle consultation failed.');
        return;
      }
      setMyAnswer((data as { answer: string }).answer);
      setQuestion('');
    } catch {
      setMyError('Oracle consultation failed. Please try again.');
    } finally {
      setConsulting(false);
    }
  }, [campaignId, sessionId, question, consulting]);

  return (
    <div className={styles.oraclePanel}>
      <div className={styles.sectionLabel}>Oracle</div>

      <div className={styles.tabRow}>
        <button
          type="button"
          className={`${styles.tabBtn}${tab === 'quick' ? ` ${styles.tabBtnActive}` : ''}`}
          onClick={() => setTab('quick')}
        >
          Quick Oracle
        </button>
        <button
          type="button"
          className={`${styles.tabBtn}${tab === 'mine' ? ` ${styles.tabBtnActive}` : ''}`}
          onClick={() => setTab('mine')}
        >
          My Oracle
        </button>
        <button
          type="button"
          className={`${styles.tabBtn}${tab === 'generators' ? ` ${styles.tabBtnActive}` : ''}`}
          onClick={() => setTab('generators')}
        >
          Generators
        </button>
      </div>

      {tab === 'quick' ? (
        <div className={styles.tabBody}>
          <div className={styles.subModeRow}>
            <button
              type="button"
              className={`${styles.subModeBtn}${quickMode === 'ask' ? ` ${styles.subModeBtnActive}` : ''}`}
              onClick={() => setQuickMode('ask')}
            >
              Ask
            </button>
            <button
              type="button"
              className={`${styles.subModeBtn}${quickMode === 'scale' ? ` ${styles.subModeBtnActive}` : ''}`}
              onClick={() => setQuickMode('scale')}
            >
              Scale Check
            </button>
          </div>

          {quickMode === 'ask' ? (
            <>
              <p className={styles.explainer}>
                RoleVerse&apos;s built-in oracle — instant, free, no setup. Uses its own
                Flux/Likelihood system (not Mythic&apos;s).
              </p>

              {presetsLoaded && presets.length > 0 && (
                <div className={styles.presetList}>
                  {presets.map((preset) => (
                    <div key={preset.id} className={styles.presetRow}>
                      <button
                        type="button"
                        className={styles.presetBtn}
                        onClick={() => handleAskPreset(preset)}
                      >
                        {preset.label}
                        <span className={styles.presetLikelihood}>
                          {LIKELIHOOD_LABELS[preset.likelihood]}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.presetDelete}
                        onClick={() => handleDeletePreset(preset.id)}
                        aria-label={`Delete preset ${preset.label}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.likelihoodRow}>
                {LIKELIHOODS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`${styles.likelihoodBtn}${likelihood === l ? ` ${styles.likelihoodBtnActive}` : ''}`}
                    onClick={() => setLikelihood(l)}
                  >
                    {LIKELIHOOD_LABELS[l]}
                  </button>
                ))}
              </div>

              <div className={styles.fluxRow}>
                <label htmlFor="oracle-flux" className={styles.fluxLabel}>
                  Flux: {flux}
                </label>
                <input
                  id="oracle-flux"
                  type="range"
                  min={MIN_FLUX}
                  max={MAX_FLUX}
                  value={flux}
                  onChange={(e) => handleFluxChange(Number(e.target.value))}
                  className={styles.fluxSlider}
                />
              </div>

              <button type="button" className={styles.askBtn} onClick={handleQuickAsk}>
                Ask
              </button>

              <div className={styles.savePresetRow}>
                <input
                  className={styles.presetInput}
                  value={newPresetLabel}
                  onChange={(e) => setNewPresetLabel(e.target.value)}
                  placeholder="Save this question as..."
                />
                <button
                  type="button"
                  className={styles.savePresetBtn}
                  onClick={handleSavePreset}
                  disabled={!newPresetLabel.trim()}
                >
                  Save
                </button>
              </div>

              {quickResult && (
                <div className={styles.resultBox}>
                  <span className={styles.resultAnswer}>{ANSWER_LABELS[quickResult.answer]}</span>
                  <span className={styles.resultDetail}>
                    Rolled {quickResult.roll} vs. target {quickResult.target}
                    {quickResult.twist ? ' — Twist!' : ''}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <p className={styles.explainer}>
                A graduated 1–10 read for questions that don&apos;t fit yes/no — &quot;What
                condition is this in?&quot;, &quot;How good is this item?&quot;
              </p>

              <button type="button" className={styles.askBtn} onClick={handleScaleCheck}>
                Roll
              </button>

              {scaleResult && (
                <div className={styles.resultBox}>
                  <span className={styles.resultAnswer}>{SCALE_BAND_LABELS[scaleResult.band]}</span>
                  <span className={styles.resultDetail}>{scaleResult.roll} / 10</span>
                </div>
              )}
            </>
          )}
        </div>
      ) : tab === 'generators' ? (
        <div className={styles.tabBody}>
          <div className={styles.subModeRow}>
            <button
              type="button"
              className={`${styles.subModeBtn}${generatorMode === 'seed' ? ` ${styles.subModeBtnActive}` : ''}`}
              onClick={() => setGeneratorMode('seed')}
            >
              Plot Seed
            </button>
            <button
              type="button"
              className={`${styles.subModeBtn}${generatorMode === 'story' ? ` ${styles.subModeBtnActive}` : ''}`}
              onClick={() => setGeneratorMode('story')}
            >
              Story Draw
            </button>
            <button
              type="button"
              className={`${styles.subModeBtn}${generatorMode === 'name' ? ` ${styles.subModeBtnActive}` : ''}`}
              onClick={() => setGeneratorMode('name')}
            >
              Name
            </button>
            <button
              type="button"
              className={`${styles.subModeBtn}${generatorMode === 'npc' ? ` ${styles.subModeBtnActive}` : ''}`}
              onClick={() => setGeneratorMode('npc')}
            >
              Quick NPC
            </button>
          </div>

          {generatorMode === 'seed' && (
            <>
              <p className={styles.explainer}>
                Instant, free, no setup — a random plot hook for sandbox play with no
                prewritten adventure.
              </p>
              <button type="button" className={styles.askBtn} onClick={handleGenerateHook}>
                Generate
              </button>
              {plotHook && <p className={styles.myAnswer}>{plotHook}</p>}
            </>
          )}

          {generatorMode === 'story' && (
            <>
              <p className={styles.explainer}>
                A beginning/middle/end prompt for &quot;what story does this NPC tell me&quot;
                style questions.
              </p>
              <button type="button" className={styles.askBtn} onClick={handleDrawStory}>
                Draw
              </button>
              {storyDraw && <p className={styles.myAnswer}>{storyDraw}</p>}
            </>
          )}

          {generatorMode === 'name' && (
            <>
              <p className={styles.explainer}>A random name for an NPC on the spot.</p>
              <button type="button" className={styles.askBtn} onClick={handleGenerateName}>
                Generate
              </button>
              {generatedName && <p className={styles.myAnswer}>{generatedName}</p>}
            </>
          )}

          {generatorMode === 'npc' && (
            <>
              <p className={styles.explainer}>
                A one-roll role, disposition, and quirk for deciding who an NPC is before
                asking anything else about them.
              </p>
              <button type="button" className={styles.askBtn} onClick={handleGenerateNpc}>
                Generate
              </button>
              {quickNpc && <p className={styles.myAnswer}>{quickNpc}</p>}
            </>
          )}
        </div>
      ) : (
        <div className={styles.tabBody}>
          <p className={styles.explainer}>
            Bring your own oracle. Upload the reference for whichever solo-play oracle system you
            own — Mythic is the most popular, battle-tested choice, but any system (or your own
            homebrew) works.
          </p>

          <label className={styles.fieldLabel} htmlFor="oracle-state">
            Oracle State
          </label>
          <input
            id="oracle-state"
            className={styles.stateInput}
            value={oracleState}
            onChange={(e) => handleOracleStateChange(e.target.value)}
            placeholder="e.g. Chaos Factor: 5"
            disabled={!oracleStateLoaded}
          />

          <label className={styles.fieldLabel} htmlFor="oracle-question">
            Question
          </label>
          <textarea
            id="oracle-question"
            className={styles.questionInput}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="Does the guard notice me?"
            disabled={consulting}
          />

          <button
            type="button"
            className={styles.askBtn}
            onClick={() => void handleConsult()}
            disabled={consulting || !question.trim()}
          >
            {consulting ? 'Consulting…' : 'Consult'}
          </button>

          {myAnswer && <p className={styles.myAnswer}>{myAnswer}</p>}
          {myError && <p className={styles.myError}>{myError}</p>}
        </div>
      )}
    </div>
  );
}
