'use client';

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { Send, Mic, Keyboard, Image as ImageIcon } from 'lucide-react';
import styles from './ChatWindow.module.css';
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
  // Keep a ref to messages so handleSend can read the latest without being in deps
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

    // Build conversation history for Claude context from current messages + new player message
    const currentMessages = [...messagesRef.current, playerMsg];
    const history: AgentMessage[] = currentMessages
      .filter((m) => m.role === 'player' || m.role === 'agent')
      .map((m) => ({
        role: m.role === 'player' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

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

        {/* Loading indicator */}
        {isLoading && (
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

