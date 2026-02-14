'use client';

import { getAllGameSystems } from '@/lib/game-systems/registry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GameSystemSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function GameSystemSelector({ value, onValueChange }: GameSystemSelectorProps) {
  const systems = getAllGameSystems();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a game system" />
      </SelectTrigger>
      <SelectContent>
        {systems.map((system) => (
          <SelectItem key={system.id} value={system.id}>
            <div className="flex flex-col">
              <span>{system.name}</span>
              <span className="text-xs text-brown/50">{system.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
