'use client';

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { Send, Mic, Keyboard, Image as ImageIcon } from 'lucide-react';
import type { ChatMessage, SceneMedia, AgentType } from '@/lib/types/session';

// Agent color mapping
const agentColors: Record<AgentType, { bg: string; text: string; label: string }> = {
  narrator: { bg: 'bg-yellow-600/20', text: 'text-yellow-500', label: 'Narrator' },
  rules_arbiter: { bg: 'bg-gray-400/20', text: 'text-gray-400', label: 'Rules Arbiter' },
  npc_dialogue: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', label: 'NPC Dialogue' },
  lore_keeper: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Lore Keeper' },
  encounter_builder: { bg: 'bg-orange-600/20', text: 'text-orange-400', label: 'Encounter Builder' },
};

// Simple markdown: **bold** and *italic*
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    // Handle line breaks
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
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

// Mock data
const mockSceneMedia: SceneMedia = {
  id: 'scene-1',
  type: 'image',
  url: '/images/placeholder-scene.jpg',
  caption:
    'The cavern opens before you, stalactites dripping with phosphorescent moss',
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify parent of scene media on mount for the mock data
  useEffect(() => {
    if (onSceneMediaUpdate) {
      onSceneMediaUpdate(mockSceneMedia);
    }
    // Only fire once on mount
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
    <div className="flex flex-1 flex-col overflow-hidden rounded border border-gold/40 bg-brown-dark/60">
      {/* Message feed */}
      <div ref={feedRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((msg: ChatMessage) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="text-center">
                <span className="rounded bg-brown/30 px-3 py-1 text-[11px] text-cream/40">
                  {msg.content}
                </span>
              </div>
            );
          }

          if (msg.role === 'agent' && msg.agentType) {
            const agent = agentColors[msg.agentType];
            return (
              <div key={msg.id} className="flex flex-col items-start gap-1">
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-medium ${agent.bg} ${agent.text}`}
                >
                  {agent.label}
                </span>
                <div className="max-w-[85%] rounded-lg rounded-tl-none bg-brown/40 px-3 py-2 text-sm text-cream/90">
                  {renderMarkdown(msg.content)}
                  {msg.sceneMedia && (
                    <div className="mt-2 flex items-center gap-1.5 rounded bg-gold/10 px-2 py-1 text-[10px] text-gold">
                      <ImageIcon className="h-3 w-3" />
                      Scene updated
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-cream/30">{relativeTime(msg.timestamp)}</span>
              </div>
            );
          }

          // Player message
          return (
            <div key={msg.id} className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium text-cream/60">{msg.playerName}</span>
              <div className="max-w-[85%] rounded-lg rounded-tr-none bg-teal/30 px-3 py-2 text-sm text-cream/90">
                {renderMarkdown(msg.content)}
              </div>
              <div className="flex items-center gap-1.5">
                {msg.source === 'discord_voice' ? (
                  <span title="Discord voice-to-text"><Mic className="h-3 w-3 text-cream/30" /></span>
                ) : (
                  <span title="Typed message"><Keyboard className="h-3 w-3 text-cream/30" /></span>
                )}
                <span className="text-[10px] text-cream/30">{relativeTime(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div className="flex items-end gap-2 border-t border-gold/20 bg-brown-dark/80 p-2">
        <div className="relative flex-1">
          <textarea
            value={input}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you do..."
            rows={1}
            className="w-full resize-none rounded border border-gold/30 bg-brown/60 px-3 py-2 pr-8 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:ring-1 focus:ring-teal"
          />
          <span title="Voice input (coming soon)">
            <Mic
              className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/20"
            />
          </span>
        </div>
        <button
          onClick={handleSend}
          className="flex h-9 items-center gap-1.5 rounded border border-gold/40 bg-brown px-3 text-sm text-gold transition-colors hover:bg-brown-dark"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
