'use client';

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { Send, Mic, Keyboard, Image as ImageIcon } from 'lucide-react';
import type { ChatMessage, SceneMedia, AgentType } from '@/lib/types/session';

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

// Mock data
const mockSceneMedia: SceneMedia = {
  id: 'scene-1',
  type: 'image',
  url: '/images/placeholder-scene.jpg',
  caption: 'The cavern opens before you, stalactites dripping with phosphorescent moss',
  source: 'ai_generated',
  generatedBy: 'narrator',
  timestamp: new Date(Date.now() - 300000),
};

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'system',
    content: 'Session started. Welcome, adventurers!',
    timestamp: new Date(Date.now() - 600000),
  },
  {
    id: 'msg-2',
    role: 'agent',
    agentType: 'narrator',
    content:
      '**The evening air is thick with the scent of pine** as your party arrives at the edge of the *Mistwood Forest*. The ancient trees tower above you, their gnarled branches twisting like skeletal fingers against the darkening sky.\n\nA narrow path leads deeper into the woods, barely visible in the fading light.',
    sceneMedia: mockSceneMedia,
    timestamp: new Date(Date.now() - 540000),
  },
  {
    id: 'msg-3',
    role: 'player',
    playerName: 'Thorin',
    content: 'I light a torch and take the lead down the path, keeping my shield ready.',
    source: 'typed',
    timestamp: new Date(Date.now() - 480000),
  },
  {
    id: 'msg-4',
    role: 'agent',
    agentType: 'rules_arbiter',
    content:
      'Thorin lights a torch, providing **bright light in a 20-foot radius** and dim light for an additional 20 feet. His AC remains unchanged with shield equipped.',
    timestamp: new Date(Date.now() - 420000),
  },
  {
    id: 'msg-5',
    role: 'player',
    playerName: 'Elara',
    content: 'I cast Detect Magic as we walk and look for any magical auras in the forest.',
    source: 'discord_voice',
    timestamp: new Date(Date.now() - 360000),
  },
  {
    id: 'msg-6',
    role: 'agent',
    agentType: 'lore_keeper',
    content:
      'The *Mistwood Forest* was once sacred to the elven druids of the **Third Age**. Ancient wards may still linger here — Detect Magic would certainly reveal them.',
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: 'msg-7',
    role: 'agent',
    agentType: 'npc_dialogue',
    content:
      'A raspy voice calls from the shadows: "*Who dares enter the Mistwood at this hour? Turn back, or face what sleeps beneath the roots...*"',
    timestamp: new Date(Date.now() - 240000),
  },
  {
    id: 'msg-8',
    role: 'system',
    content: 'FG Sync: Combat encounter data received.',
    timestamp: new Date(Date.now() - 180000),
  },
  {
    id: 'msg-9',
    role: 'agent',
    agentType: 'encounter_builder',
    content:
      'Two **Shadow Wolves** emerge from the undergrowth, their eyes glowing with an unnatural amber light. Roll for initiative!',
    timestamp: new Date(Date.now() - 120000),
  },
];

interface ChatWindowProps {
  onSceneMediaUpdate?: (media: SceneMedia) => void;
}

export default function ChatWindow({ onSceneMediaUpdate }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [input, setInput] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (onSceneMediaUpdate) {
      onSceneMediaUpdate(mockSceneMedia);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'player',
      playerName: 'You',
      content: text,
      source: 'typed',
      timestamp: new Date(),
    };
    setMessages((prev: ChatMessage[]) => [...prev, newMsg]);
    setInput('');
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
        .send-btn:hover {
          background: var(--crimson-bright);
          box-shadow: 0 0 10px var(--crimson-glow);
        }
      `}</style>

      {/* Message feed */}
      <div ref={feedRef} className="feed">
        {messages.map((msg: ChatMessage) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="msg-system">
                <span className="msg-system-inner">{msg.content}</span>
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
        />
        <button className="send-btn" onClick={handleSend} type="button" aria-label="Send">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
