'use client';

// app/(app)/admin/page.tsx
// Admin panel — RAG ingestion controls.
// Only accessible to users whose email is in ADMIN_EMAILS (enforced server-side).

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IngestionJob {
  id: string;
  game_system: string;
  source_label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_chunks: number;
  processed_chunks: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

type IngestableSystem = '5E_2014' | 'PATHFINDER_2E' | 'ADD2E';

interface SystemConfig {
  id: IngestableSystem;
  label: string;
  source: string;
  description: string;
}

const SYSTEMS: SystemConfig[] = [
  {
    id: '5E_2014',
    label: 'D&D 5E 2014',
    source: 'Open5e API',
    description: 'Fetches spells, monsters, classes, races, and rules from api.open5e.com.',
  },
  {
    id: 'PATHFINDER_2E',
    label: 'Pathfinder 2E',
    source: 'Foundry VTT pf2e packs',
    description: 'Downloads compendium data from the Foundry VTT pf2e GitHub repository.',
  },
  {
    id: 'ADD2E',
    label: 'AD&D 2nd Edition',
    source: 'OSRIC stub',
    description: 'Ingests the local OSRIC placeholder (data/osric-stub.md) into the index.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: IngestionJob['status']): string {
  switch (status) {
    case 'completed':
      return 'text-green-400';
    case 'failed':
      return 'text-red-400';
    case 'running':
      return 'text-yellow-400';
    default:
      return 'text-zinc-400';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminIngestPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<Set<IngestableSystem>>(new Set());
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Keep a stable ref to startPolling so loadJobs (and handleIngest) can call it
  // without needing it as a useCallback dependency.
  const startPollingRef = useRef<(jobId: string) => void>(() => undefined);

  startPollingRef.current = (jobId: string) => {
    if (pollTimers.current.has(jobId)) return;

    setRunningJobs((prev) => new Set(prev).add(jobId));

    const timer = setInterval(async () => {
      const res = await fetch(`/api/admin/ingest/${jobId}`);
      if (!res.ok) return;

      const data = (await res.json()) as { job: IngestionJob };
      const job = data.job;

      setJobs((prev: IngestionJob[]) => prev.map((j) => (j.id === jobId ? job : j)));

      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(pollTimers.current.get(jobId));
        pollTimers.current.delete(jobId);
        setRunningJobs((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    }, 2000);

    pollTimers.current.set(jobId, timer);
  };

  // Fetch job list on mount
  const loadJobs = useCallback(async () => {
    const res = await fetch('/api/admin/ingest');
    if (res.status === 403) {
      setError('Access denied — admin privileges required.');
      return;
    }
    if (!res.ok) {
      setError('Failed to load ingestion jobs.');
      return;
    }
    const data = (await res.json()) as { jobs: IngestionJob[] };
    setJobs(data.jobs ?? []);

    // Resume polling for any active jobs via the stable ref.
    for (const job of data.jobs ?? []) {
      if (job.status === 'running' || job.status === 'pending') {
        startPollingRef.current(job.id);
      }
    }
  }, []);

  useEffect(() => {
    void loadJobs();
    return () => {
      // Clean up all poll timers on unmount
      for (const timer of pollTimers.current.values()) {
        clearInterval(timer);
      }
    };
  }, [loadJobs]);

  async function handleIngest(system: IngestableSystem) {
    setError(null);
    setStarting((prev: Set<IngestableSystem>) => new Set(prev).add(system));

    const res = await fetch('/api/admin/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameSystem: system }),
    });

    setStarting((prev: Set<IngestableSystem>) => {
      const next = new Set(prev);
      next.delete(system);
      return next;
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setError(body.error ?? 'Failed to start ingestion.');
      return;
    }

    const data = (await res.json()) as { jobId: string };

    // Add a placeholder job row while polling kicks in
    const placeholder: IngestionJob = {
      id: data.jobId,
      game_system: system,
      source_label: '',
      status: 'pending',
      total_chunks: 0,
      processed_chunks: 0,
      error_message: null,
      started_at: new Date().toISOString(),
      completed_at: null,
    };

    setJobs((prev: IngestionJob[]) => [placeholder, ...prev]);
    startPollingRef.current(data.jobId);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Admin — RAG Ingestion</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Trigger baseline rules ingestion for supported game systems. Each run fetches
            content from the configured source, splits it into chunks, embeds them with
            text-embedding-3-small, and stores them in the vector index.
          </p>
        </div>

        {error && (
          <div className="rounded border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* System cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {SYSTEMS.map((sys) => (
            <div
              key={sys.id}
              className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div>
                <p className="font-semibold text-zinc-100">{sys.label}</p>
                <p className="text-xs text-amber-400">{sys.source}</p>
                <p className="mt-1 text-xs text-zinc-400">{sys.description}</p>
              </div>
              <Button
                size="sm"
                disabled={starting.has(sys.id)}
                onClick={() => void handleIngest(sys.id)}
                className="mt-auto"
              >
                {starting.has(sys.id) ? 'Starting…' : 'Run Ingestion'}
              </Button>
            </div>
          ))}
        </div>

        {/* Jobs table */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">Recent Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-zinc-500">No ingestion jobs yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">
                      System
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">
                      Source
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">
                      Status
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">
                      Progress
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">
                      Started
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {jobs.map((job) => (
                    <tr key={job.id} className="bg-zinc-950 hover:bg-zinc-900">
                      <td className="px-4 py-2 font-mono text-xs text-zinc-200">
                        {job.game_system}
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-400">{job.source_label}</td>
                      <td className={`px-4 py-2 text-xs font-medium ${statusColor(job.status)}`}>
                        {job.status}
                        {runningJobs.has(job.id) && (
                          <span className="ml-1 animate-pulse">…</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-zinc-400">
                        {job.total_chunks > 0
                          ? `${job.processed_chunks} / ${job.total_chunks}`
                          : job.processed_chunks > 0
                            ? `${job.processed_chunks}`
                            : '—'}
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-400">
                        {formatDate(job.started_at)}
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-400">
                        {formatDate(job.completed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jobs.some((j) => j.error_message) && (
                <div className="space-y-1 border-t border-zinc-800 px-4 py-2">
                  {jobs
                    .filter((j) => j.error_message)
                    .map((j) => (
                      <p key={j.id} className="text-xs text-red-400">
                        <span className="font-mono">{j.game_system}</span>:{' '}
                        {j.error_message}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
