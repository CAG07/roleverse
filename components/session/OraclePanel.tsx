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

const LIKELIHOODS = Object.keys(LIKELIHOOD_LABELS) as Likelihood[];
const ORACLE_STATE_DEBOUNCE_MS = 800;

type Tab = 'quick' | 'mine';

interface OraclePanelProps {
  campaignId: string;
  sessionId: string;
}

export default function OraclePanel({ campaignId, sessionId }: OraclePanelProps) {
  const [tab, setTab] = useState<Tab>('quick');

  // --- Quick Oracle (built-in, fully client-side) ---
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

  const handleQuickAsk = useCallback(() => {
    setQuickResult(consultOracle(likelihood, flux));
  }, [likelihood, flux]);

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
      const { data } = await supabase.from('campaigns').select('oracle_state').eq('id', campaignId).single();
      if (!cancelled) {
        setOracleState((data?.oracle_state as string | null) ?? '');
        setOracleStateLoaded(true);
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
      </div>

      {tab === 'quick' ? (
        <div className={styles.tabBody}>
          <p className={styles.explainer}>
            RoleVerse&apos;s built-in oracle — instant, free, no setup. Uses its own Flux/Likelihood
            system (not Mythic&apos;s).
          </p>

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

          {quickResult && (
            <div className={styles.resultBox}>
              <span className={styles.resultAnswer}>{ANSWER_LABELS[quickResult.answer]}</span>
              <span className={styles.resultDetail}>
                Rolled {quickResult.roll} vs. target {quickResult.target}
                {quickResult.twist ? ' — Twist!' : ''}
              </span>
            </div>
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
