'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type UIEvent,
} from 'react';
import { Send, Mic, Keyboard, Image as ImageIcon, ChevronDown } from 'lucide-react';
import styles from './ChatWindow.module.css';
import type { ChatMessage, SceneMedia, AgentType, TranscriptEntry } from '@/lib/types/session';
import type { AgentMessage } from '@/lib/mcp/types';
import type { FlaggedNpc } from '@/lib/types/npc';

// Agent color/label mapping — matches design spec
const AGENT_CONFIG: Record<string, { accent: string; label: string }> = {
  game_master: { accent: '#b8882a', label: 'Game Master' },
  rules_arbiter: { accent: '#7a8a9a', label: 'Rules Arbiter' },
  lore_keeper: { accent: '#6a3a8a', label: 'Lore Keeper' },
};
const DEFAULT_AGENT = AGENT_CONFIG.game_master;

function getAgentConfig(agentType: string | undefined): { accent: string; label: string } {
  return (agentType ? AGENT_CONFIG[agentType] : null) ?? DEFAULT_AGENT;
}

// Simple markdown: **bold** and *italic*
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

function parseSSEEvent(raw: string): { event: string; data: unknown } | null {
  const lines = raw.split('\n');
  let event = 'message';
  let dataStr = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      event = line.slice(7);
    } else if (line.startsWith('data: ')) {
      dataStr += line.slice(6);
    }
  }

  if (!dataStr) return null;

  try {
    return { event, data: JSON.parse(dataStr) as unknown };
  } catch {
    return { event, data: dataStr };
  }
}

interface StreamingMsg {
  id: string;
  agentType: AgentType;
  content: string;
  flaggedNpcs?: FlaggedNpc[];
}

/** How close to the bottom (px) counts as "at bottom" for auto-scroll / button visibility */
const NEAR_BOTTOM_THRESHOLD = 150;

interface ChatWindowProps {
  onSceneMediaUpdate?: (media: SceneMedia) => void;
  sessionId: string;
  campaignId: string;
  initialTranscript?: TranscriptEntry[];
}

function transcriptToMessages(entries: TranscriptEntry[]): ChatMessage[] {
  return entries.map((entry, i) => {
    const parsedTimestamp = entry.timestamp ? new Date(entry.timestamp) : null;
    const timestamp =
      parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime()) ? parsedTimestamp : new Date();
    if (entry.role === 'player') {
      return {
        id: `hist-${i}`,
        role: 'player' as const,
        playerName: 'You',
        content: entry.content ?? '',
        source: 'typed' as const,
        timestamp,
      };
    }
    return {
      id: `hist-${i}`,
      role: 'agent' as const,
      agentType:
        entry.agentType === 'game_master' ||
        entry.agentType === 'rules_arbiter' ||
        entry.agentType === 'lore_keeper'
          ? (entry.agentType as AgentType)
          : undefined,
      content: entry.content ?? '',
      timestamp,
    };
  });
}

export default function ChatWindow({
  onSceneMediaUpdate: _onSceneMediaUpdate,
  sessionId,
  campaignId,
  initialTranscript = [],
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    transcriptToMessages(initialTranscript)
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMsg | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  /** NPC names already added or dismissed this session — suppresses repeat prompts. */
  const resolvedNpcNamesRef = useRef<Set<string>>(new Set());
  const [npcActionState, setNpcActionState] = useState<Record<string, 'adding' | 'resolved' | 'error'>>({});

  const feedRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const streamingMsgRef = useRef<StreamingMsg | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const isInitialRender = useRef(true);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll: always on first render; on subsequent renders, only if near bottom
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    if (isInitialRender.current) {
      isInitialRender.current = false;
      el.scrollTop = el.scrollHeight;
      setShowScrollButton(false);
      return;
    }
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
      setShowScrollButton(false);
    } else {
      setShowScrollButton(true);
    }
  }, [messages]);

  const streamingContent = streamingMessage?.content;

  useEffect(() => {
    const el = feedRef.current;
    if (!el || streamingContent === undefined) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
      setShowScrollButton(false);
    } else {
      // New content arrived below the viewport while the player is scrolled up.
      setShowScrollButton(true);
    }
  }, [streamingContent]);

  const handleFeedScroll = useCallback((_e: UIEvent<HTMLDivElement>) => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = feedRef.current;
      if (!el) return;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
      setShowScrollButton(!isNearBottom);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowScrollButton(false);
  }, []);

  const finalizeStream = useCallback(() => {
    const sm = streamingMsgRef.current;
    if (!sm) return;
    setMessages((prev) => [
      ...prev,
      {
        id: sm.id,
        role: 'agent' as const,
        agentType: sm.agentType,
        content: sm.content,
        flaggedNpcs: sm.flaggedNpcs,
        timestamp: new Date(),
      },
    ]);
    streamingMsgRef.current = null;
    setStreamingMessage(null);
  }, []);

  const handleNpcAction = useCallback(
    async (npc: FlaggedNpc, action: 'add' | 'dismiss') => {
      resolvedNpcNamesRef.current.add(npc.name.toLowerCase());

      if (action === 'dismiss') {
        setNpcActionState((prev) => ({ ...prev, [npc.name]: 'resolved' }));
        return;
      }

      setNpcActionState((prev) => ({ ...prev, [npc.name]: 'adding' }));
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/npcs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: npc.name,
            race: npc.race,
            occupation: npc.occupation,
            description: npc.description,
            personality: npc.personality,
            disposition: npc.disposition,
            current_location: npc.current_location,
            known_facts: npc.known_fact
              ? [{ fact: npc.known_fact, learned_in_session: sessionId, learned_at: new Date().toISOString() }]
              : [],
          }),
        });
        setNpcActionState((prev) => ({ ...prev, [npc.name]: res.ok ? 'resolved' : 'error' }));
      } catch {
        setNpcActionState((prev) => ({ ...prev, [npc.name]: 'error' }));
      }
    },
    [campaignId, sessionId]
  );

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const playerMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'player',
      playerName: 'You',
      content: text,
      source: 'typed',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, playerMsg]);
    setInput('');
    setIsLoading(true);

    const currentMessages = [...messagesRef.current, playerMsg];
    const history: AgentMessage[] = currentMessages
      .filter((m) => m.role === 'player' || m.role === 'agent')
      .map((m) => {
        if (m.role === 'player') return { role: 'user' as const, content: m.content };
        const cfg = getAgentConfig(m.agentType);
        return { role: 'assistant' as const, content: `[${cfg.label}] ${m.content}` };
      });

    try {
      const response = await fetch(`/api/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationHistory: history }),
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-err-${Date.now()}`,
            role: 'system',
            content: `Error: ${(err as { error?: string }).error ?? 'Request failed'}`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const eventText of events) {
          const parsed = parseSSEEvent(eventText);
          if (!parsed) continue;

          switch (parsed.event) {
            case 'agent_type': {
              const agentType = (parsed.data as { agentType: AgentType }).agentType;
              const id = `msg-stream-${Date.now()}`;
              const sm: StreamingMsg = { id, agentType, content: '' };
              streamingMsgRef.current = sm;
              setStreamingMessage(sm);
              break;
            }
            case 'token': {
              const chunk = (parsed.data as { text: string }).text;
              if (streamingMsgRef.current) {
                const updated = {
                  ...streamingMsgRef.current,
                  content: streamingMsgRef.current.content + chunk,
                };
                streamingMsgRef.current = updated;
                setStreamingMessage(updated);
              }
              break;
            }
            case 'npc_flag': {
              const npc = (parsed.data as { npc: FlaggedNpc }).npc;
              if (streamingMsgRef.current && !resolvedNpcNamesRef.current.has(npc.name.toLowerCase())) {
                const prev = streamingMsgRef.current;
                const updated = {
                  ...prev,
                  flaggedNpcs: [...(prev.flaggedNpcs ?? []), npc],
                };
                streamingMsgRef.current = updated;
                setStreamingMessage(updated);
              }
              break;
            }
            case 'error': {
              const errorText = (parsed.data as { error: string }).error;
              if (streamingMsgRef.current) {
                const prev = streamingMsgRef.current;
                const updated = {
                  ...prev,
                  content: prev.content
                    ? `${prev.content}\n\n[Error: ${errorText}]`
                    : `[Error: ${errorText}]`,
                };
                streamingMsgRef.current = updated;
                setStreamingMessage(updated);
                finalizeStream();
              } else {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `msg-err-${Date.now()}`,
                    role: 'system',
                    content: `Error: ${errorText}`,
                    timestamp: new Date(),
                  },
                ]);
              }
              break;
            }
            case 'done': {
              finalizeStream();
              break;
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'system',
          content: 'Error: Could not reach the Game Master. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      if (streamingMsgRef.current) {
        finalizeStream();
      }
    }
  }, [input, isLoading, sessionId, finalizeStream]);

  // Brand-new session (no transcript yet) — auto-trigger one GM turn instead of
  // leaving the player staring at an empty feed. The GM already has the previous
  // session's summary and campaign context in its system prompt (see
  // buildSystemPrompt in lib/mcp/agents/game-master.ts), so this naturally becomes
  // a fresh opening scene for a first session or a narrated recap-into-scene for a
  // continuing one. Sent as an ordinary player message — no transcript format change.
  const autoIntroFired = useRef(false);
  useEffect(() => {
    if (initialTranscript.length > 0 || autoIntroFired.current) return;
    autoIntroFired.current = true;
    void handleSend("I'm ready to begin.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className={styles.chatWindow}>
      {/* Message feed */}
      <div className={styles.feedWrapper}>
        <div ref={feedRef} className={styles.feed} onScroll={handleFeedScroll}>
          {messages.map((msg: ChatMessage) => {
            if (msg.role === 'system') {
              const isError = msg.content.startsWith('Error:');
              return (
                <div key={msg.id} className={styles.msgSystem}>
                  <span className={`${styles.msgSystemInner}${isError ? ` ${styles.error}` : ''}`}>
                    {msg.content}
                  </span>
                </div>
              );
            }

            if (msg.role === 'agent' && msg.agentType) {
              const agent = getAgentConfig(msg.agentType);
              return (
                <div key={msg.id} className={styles.msgAgent}>
                  <span
                    className={styles.agentLabel}
                    style={{ color: agent.accent, borderColor: agent.accent + '40' }}
                  >
                    {agent.label}
                  </span>
                  <div className={styles.agentBubble}>
                    {renderMarkdown(msg.content)}
                    {msg.sceneMedia && (
                      <div className={styles.sceneIndicator}>
                        <ImageIcon size={10} />
                        Scene updated
                      </div>
                    )}
                    {msg.flaggedNpcs
                      ?.filter((npc) => npcActionState[npc.name] !== 'resolved')
                      .map((npc) => (
                        <div key={npc.name} className={styles.npcFlagCard}>
                          <div className={styles.npcFlagHeader}>
                            <span className={styles.npcFlagName}>{npc.name}</span>
                            {(npc.race || npc.occupation) && (
                              <span className={styles.npcFlagMeta}>
                                {[npc.race, npc.occupation].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                          {npc.description && (
                            <p className={styles.npcFlagDescription}>{npc.description}</p>
                          )}
                          <div className={styles.npcFlagActions}>
                            <button
                              type="button"
                              className={styles.npcFlagAdd}
                              disabled={npcActionState[npc.name] === 'adding'}
                              onClick={() => void handleNpcAction(npc, 'add')}
                            >
                              {npcActionState[npc.name] === 'adding' ? 'Adding…' : 'Add to Roster'}
                            </button>
                            <button
                              type="button"
                              className={styles.npcFlagDismiss}
                              disabled={npcActionState[npc.name] === 'adding'}
                              onClick={() => void handleNpcAction(npc, 'dismiss')}
                            >
                              Dismiss
                            </button>
                          </div>
                          {npcActionState[npc.name] === 'error' && (
                            <p className={styles.npcFlagError}>Couldn&apos;t add — try again.</p>
                          )}
                        </div>
                      ))}
                  </div>
                  <span className={styles.msgTimestamp}>{relativeTime(msg.timestamp)}</span>
                </div>
              );
            }

            // Player message
            return (
              <div key={msg.id} className={styles.msgPlayer}>
                <span className={styles.playerName}>{msg.playerName}</span>
                <div className={styles.playerBubble}>{renderMarkdown(msg.content)}</div>
                <div className={styles.playerMeta}>
                  {msg.source === 'discord_voice' ? (
                    <Mic size={10} color="var(--ivory-dim)" />
                  ) : (
                    <Keyboard size={10} color="var(--ivory-dim)" />
                  )}
                  <span className={styles.msgTimestamp}>{relativeTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          })}

          {/* Streaming message — builds up token by token */}
          {streamingMessage && (
            <div className={styles.msgAgent}>
              <span
                className={styles.agentLabel}
                style={{
                  color: getAgentConfig(streamingMessage.agentType).accent,
                  borderColor: getAgentConfig(streamingMessage.agentType).accent + '40',
                }}
              >
                {getAgentConfig(streamingMessage.agentType).label}
              </span>
              <div
                className={`${styles.agentBubble}${!streamingMessage.content ? ` ${styles.loading}` : ''}`}
              >
                {streamingMessage.content ? renderMarkdown(streamingMessage.content) : '▍'}
              </div>
            </div>
          )}

          {/* Loading indicator — shown only before agent_type event arrives */}
          {isLoading && !streamingMessage && (
            <div className={styles.msgAgent}>
              <span
                className={styles.agentLabel}
                style={{ color: DEFAULT_AGENT.accent, borderColor: DEFAULT_AGENT.accent + '40' }}
              >
                {DEFAULT_AGENT.label}
              </span>
              <div className={`${styles.agentBubble} ${styles.loading}`}>▍</div>
            </div>
          )}
        </div>

        {showScrollButton && (
          <button
            className={styles.scrollToBottomBtn}
            onClick={scrollToBottom}
            aria-label="Scroll to latest message"
            type="button"
          >
            <ChevronDown size={18} />
          </button>
        )}
      </div>

      {/* Input bar */}
      <div className={styles.inputBar}>
        <textarea
          className={styles.inputTextarea}
          value={input}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you do..."
          rows={1}
          disabled={isLoading}
        />
        <button
          className={styles.sendBtn}
          onClick={() => void handleSend()}
          type="button"
          aria-label="Send"
          disabled={isLoading}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
