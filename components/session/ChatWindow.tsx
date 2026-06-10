'use client';

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { Send, Mic, Keyboard, Image as ImageIcon } from 'lucide-react';
import styles from './ChatWindow.module.css';
import type { ChatMessage, SceneMedia, AgentType } from '@/lib/types/session';
import type { AgentMessage } from '@/lib/mcp/types';
import type { NpcProposal } from '@/lib/types/npc';
import { NpcProposalCard } from '@/components/npc/NpcProposalCard';

// Agent color/label mapping — matches design spec
const agentConfig: Record<AgentType, { accent: string; label: string }> = {
  narrator: { accent: '#b8882a', label: 'Narrator' },
  rules_arbiter: { accent: '#7a8a9a', label: 'Rules Arbiter' },
  npc_dialogue: { accent: '#2a7a4a', label: 'NPC Dialogue' },
  lore_keeper: { accent: '#6a3a8a', label: 'Lore Keeper' },
  encounter_builder: { accent: '#8a6a3a', label: 'Encounter Builder' },
};

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
  proposal?: NpcProposal;
}

interface ChatWindowProps {
  onSceneMediaUpdate?: (media: SceneMedia) => void;
  sessionId: string;
  campaignId: string;
}

export default function ChatWindow({ onSceneMediaUpdate: _onSceneMediaUpdate, sessionId, campaignId }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'system',
      content: 'Session started.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMsg | null>(null);
  const [handledProposals, setHandledProposals] = useState<Set<string>>(new Set());
  const [processingProposal, setProcessingProposal] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const streamingMsgRef = useRef<StreamingMsg | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll: always on new finalized messages; near-bottom check during streaming
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const streamingContent = streamingMessage?.content;

  useEffect(() => {
    const el = feedRef.current;
    if (!el || streamingContent === undefined) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [streamingContent]);

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
        proposal: sm.proposal,
        timestamp: new Date(),
      },
    ]);
    streamingMsgRef.current = null;
    setStreamingMessage(null);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
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
        const label = m.agentType ? (agentConfig[m.agentType]?.label ?? 'Agent') : 'Agent';
        return { role: 'assistant' as const, content: `[${label}] ${m.content}` };
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
                const updated = { ...streamingMsgRef.current, content: streamingMsgRef.current.content + chunk };
                streamingMsgRef.current = updated;
                setStreamingMessage(updated);
              }
              break;
            }
            case 'proposal': {
              if (streamingMsgRef.current) {
                const updated = { ...streamingMsgRef.current, proposal: parsed.data as NpcProposal };
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
          content: 'Error: Could not reach the narrator. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      // Safety: finalize if stream closed without a done event
      if (streamingMsgRef.current) {
        finalizeStream();
      }
    }
  }, [input, isLoading, sessionId, finalizeStream]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleProposalApprove = useCallback(async (msgId: string, proposal: NpcProposal) => {
    setProcessingProposal(msgId);
    try {
      let res: Response;
      if (proposal.kind === 'new_npc') {
        res = await fetch(`/api/campaigns/${campaignId}/npcs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposal.npc_data ?? { name: proposal.npc_name }),
        });
      } else if (proposal.kind === 'append_facts' && proposal.npc_id) {
        res = await fetch(`/api/campaigns/${campaignId}/npcs/${proposal.npc_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ known_facts: proposal.facts_to_add ?? [] }),
        });
      } else if (proposal.kind === 'disposition_shift' && proposal.npc_id && proposal.disposition_change) {
        res = await fetch(`/api/campaigns/${campaignId}/npcs/${proposal.npc_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disposition: proposal.disposition_change.to }),
        });
      } else {
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((data as { error?: string }).error ?? 'Request failed');
      }
      setHandledProposals((prev) => new Set([...prev, msgId]));
    } finally {
      setProcessingProposal(null);
    }
  }, [campaignId]);

  const handleProposalReject = useCallback((msgId: string) => {
    setHandledProposals((prev) => new Set([...prev, msgId]));
  }, []);

  return (
    <div className={styles.chatWindow}>
      {/* Message feed */}
      <div ref={feedRef} className={styles.feed}>
        {messages.map((msg: ChatMessage) => {
          if (msg.role === 'system') {
            const isError = msg.content.startsWith('Error:');
            return (
              <div key={msg.id} className={styles.msgSystem}>
                <span className={`${styles.msgSystemInner}${isError ? ` ${styles.error}` : ''}`}>{msg.content}</span>
              </div>
            );
          }

          if (msg.role === 'agent' && msg.agentType) {
            const agent = agentConfig[msg.agentType];
            const showProposal = msg.proposal && !handledProposals.has(msg.id);
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
                </div>
                <span className={styles.msgTimestamp}>{relativeTime(msg.timestamp)}</span>
                {showProposal && msg.proposal && (
                  <NpcProposalCard
                    proposal={msg.proposal}
                    onApprove={(approved) => handleProposalApprove(msg.id, approved)}
                    onReject={() => handleProposalReject(msg.id)}
                    isProcessing={processingProposal === msg.id}
                  />
                )}
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
                color: agentConfig[streamingMessage.agentType].accent,
                borderColor: agentConfig[streamingMessage.agentType].accent + '40',
              }}
            >
              {agentConfig[streamingMessage.agentType].label}
            </span>
            <div className={`${styles.agentBubble}${!streamingMessage.content ? ` ${styles.loading}` : ''}`}>
              {streamingMessage.content ? renderMarkdown(streamingMessage.content) : '▍'}
            </div>
          </div>
        )}

        {/* Loading indicator — shown only before agent_type event arrives */}
        {isLoading && !streamingMessage && (
          <div className={styles.msgAgent}>
            <span
              className={styles.agentLabel}
              style={{ color: agentConfig.narrator.accent, borderColor: agentConfig.narrator.accent + '40' }}
            >
              Narrator
            </span>
            <div className={`${styles.agentBubble} ${styles.loading}`}>▍</div>
          </div>
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
        <button className={styles.sendBtn} onClick={() => void handleSend()} type="button" aria-label="Send" disabled={isLoading}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
