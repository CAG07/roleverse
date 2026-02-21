'use client';

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { Send, Mic, Keyboard, Image as ImageIcon } from 'lucide-react';
import type { ChatMessage, SceneMedia, AgentType } from '@/lib/types/session';
import type { AgentMessage } from '@/lib/mcp/types';

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

interface ChatWindowProps {
  onSceneMediaUpdate?: (media: SceneMedia) => void;
  campaignId: string;
  gameSystem: string;
}

export default function ChatWindow({ onSceneMediaUpdate, campaignId, gameSystem }: ChatWindowProps) {
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
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

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

    // Build conversation history for Claude context (user/assistant pairs only)
    const history: AgentMessage[] = [];
    setMessages((prev) => {
      for (const m of prev) {
        if (m.role === 'player') {
          history.push({ role: 'user', content: m.content });
        } else if (m.role === 'agent') {
          history.push({ role: 'assistant', content: m.content });
        }
      }
      return prev;
    });

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRole: 'narrator',
          message: text,
          context: { campaignId, gameSystem },
          conversationHistory: history,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-err-${Date.now()}`,
            role: 'system',
            content: `Error: ${err.error ?? 'Request failed'}`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const data = await res.json();
      const narratorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'agent',
        agentType: 'narrator',
        content: data.content,
        timestamp: new Date(),
      };

      if (data.sceneMedia && onSceneMediaUpdate) {
        const media: SceneMedia = {
          id: `scene-${Date.now()}`,
          type: data.sceneMedia.type,
          url: data.sceneMedia.url,
          caption: data.sceneMedia.caption,
          source: data.sceneMedia.source,
          timestamp: new Date(),
        };
        narratorMsg.sceneMedia = media;
        onSceneMediaUpdate(media);
      }

      setMessages((prev) => [...prev, narratorMsg]);
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
    }
  }, [input, isLoading, campaignId, gameSystem, onSceneMediaUpdate]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="chat-window">
      <style jsx>{`
        .chat-window {
          display: flex;
          flex: 1;
          flex-direction: column;
          overflow: hidden;
          background: var(--void-surface);
          border: var(--rule-thin);
          min-height: 0;
          height: 100%;
        }

        /* Message feed */
        .feed {
          flex: 1;
          overflow-y: auto;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 0;
        }

        /* System message */
        .msg-system {
          text-align: center;
        }
        .msg-system-inner {
          display: inline-block;
          background: var(--void-raised);
          padding: 0.2rem 0.75rem;
          font-family: var(--font-body);
          font-size: 0.725rem;
          font-style: italic;
          color: var(--ivory-dim);
        }
        .msg-system-inner.error {
          color: var(--crimson-bright);
        }

        /* Agent message */
        .msg-agent {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }
        .agent-label {
          display: inline-block;
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.15rem 0.5rem;
          background: rgba(0,0,0,0.3);
          border: 1px solid;
        }
        .agent-bubble {
          max-width: 85%;
          background: var(--surface-card);
          border-left: 2px solid var(--crimson-dim);
          padding: 0.625rem 0.75rem;
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ivory);
          line-height: 1.5;
        }
        .agent-bubble.loading {
          font-family: var(--font-body);
          font-size: 1rem;
          color: var(--ivory-dim);
        }
        .scene-indicator {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-top: 0.375rem;
          padding: 0.25rem 0.5rem;
          background: rgba(184, 136, 42, 0.08);
          border: 1px solid var(--gold-dim);
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .msg-timestamp {
          font-family: var(--font-body);
          font-size: 0.65rem;
          color: var(--ivory-dim);
        }

        /* Player message */
        .msg-player {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }
        .player-name {
          font-family: var(--font-heading);
          font-size: 0.575rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ivory-muted);
        }
        .player-bubble {
          max-width: 85%;
          background: var(--void-raised);
          padding: 0.625rem 0.75rem;
          font-family: var(--font-body);
          font-size: 0.875rem;
          color: var(--ivory);
          line-height: 1.5;
        }
        .player-meta {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        /* Input bar */
        .input-bar {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          padding: 0.5rem;
          border-top: var(--rule-thin);
          background: var(--void-mid);
        }
        .input-textarea {
          flex: 1;
          resize: none;
          background: var(--void-surface);
          border: var(--rule-thin);
          color: var(--ivory);
          font-family: var(--font-body);
          font-size: 0.9rem;
          padding: 0.5rem 0.75rem;
          outline: none;
          transition: border-color 0.2s;
          line-height: 1.4;
        }
        .input-textarea::placeholder {
          color: var(--ivory-dim);
          font-style: italic;
        }
        .input-textarea:focus {
          border-color: var(--crimson-dim);
        }
        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--crimson);
          border: 1px solid var(--crimson-bright);
          color: var(--ivory);
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .send-btn:hover:not(:disabled) {
          background: var(--crimson-bright);
          box-shadow: 0 0 10px var(--crimson-glow);
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      {/* Message feed */}
      <div ref={feedRef} className="feed">
        {messages.map((msg: ChatMessage) => {
          if (msg.role === 'system') {
            const isError = msg.content.startsWith('Error:');
            return (
              <div key={msg.id} className="msg-system">
                <span className={`msg-system-inner${isError ? ' error' : ''}`}>{msg.content}</span>
              </div>
            );
          }

          if (msg.role === 'agent' && msg.agentType) {
            const agent = agentConfig[msg.agentType];
            return (
              <div key={msg.id} className="msg-agent">
                <span
                  className="agent-label"
                  style={{ color: agent.accent, borderColor: agent.accent + '40' }}
                >
                  {agent.label}
                </span>
                <div className="agent-bubble">
                  {renderMarkdown(msg.content)}
                  {msg.sceneMedia && (
                    <div className="scene-indicator">
                      <ImageIcon size={10} />
                      Scene updated
                    </div>
                  )}
                </div>
                <span className="msg-timestamp">{relativeTime(msg.timestamp)}</span>
              </div>
            );
          }

          // Player message
          return (
            <div key={msg.id} className="msg-player">
              <span className="player-name">{msg.playerName}</span>
              <div className="player-bubble">{renderMarkdown(msg.content)}</div>
              <div className="player-meta">
                {msg.source === 'discord_voice' ? (
                  <Mic size={10} color="var(--ivory-dim)" />
                ) : (
                  <Keyboard size={10} color="var(--ivory-dim)" />
                )}
                <span className="msg-timestamp">{relativeTime(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="msg-agent">
            <span
              className="agent-label"
              style={{ color: agentConfig.narrator.accent, borderColor: agentConfig.narrator.accent + '40' }}
            >
              Narrator
            </span>
            <div className="agent-bubble loading">▍</div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="input-bar">
        <textarea
          className="input-textarea"
          value={input}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you do..."
          rows={1}
          disabled={isLoading}
        />
        <button className="send-btn" onClick={() => void handleSend()} type="button" aria-label="Send" disabled={isLoading}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

