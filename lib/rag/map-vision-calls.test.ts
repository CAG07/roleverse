// lib/rag/map-vision-calls.test.ts
// Failure handling around the Claude calls: a failed classification batch is
// retried once and then fails the scan, and a reading cut off at the output
// limit still reports truncated even though its JSON can't be parsed.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create };
  },
}));

import { classifyMapPages, transcribeMapPage } from './map-vision';

const reply = (text: string, stop_reason = 'end_turn') => ({
  content: [{ type: 'text', text }],
  stop_reason,
});

const thumbnails = [1, 2, 3].map((pageNumber) => ({ pageNumber, pngBase64: 'x' }));
const pageImages = { pageNumber: 7, fullPagePngBase64: 'x', tiles: [] };

beforeEach(() => {
  create.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test';
  process.env.ANTHROPIC_HAIKU_MODEL = 'haiku';
  process.env.ANTHROPIC_VISION_MODEL = 'vision';
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('classifyMapPages', () => {
  it('retries a failed batch once', async () => {
    create
      .mockRejectedValueOnce(new Error('overloaded'))
      .mockResolvedValueOnce(reply('[{"page": 2, "is_map": true}]'));
    await expect(classifyMapPages(thumbnails)).resolves.toEqual([2]);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('fails the scan when a batch fails twice', async () => {
    create.mockRejectedValue(new Error('overloaded'));
    await expect(classifyMapPages(thumbnails)).rejects.toThrow('Could not check pages 1 to 3 for maps');
  });
});

describe('transcribeMapPage', () => {
  it('keeps the truncated flag when the cut-off reply is not valid JSON', async () => {
    create.mockResolvedValueOnce(reply('{"maps": [{"map_label": "Level 1", "rooms": [', 'max_tokens'));
    await expect(transcribeMapPage(pageImages)).resolves.toEqual({ maps: null, truncated: true });
  });

  it('reports an unreadable page on an API error', async () => {
    create.mockRejectedValueOnce(new Error('network'));
    await expect(transcribeMapPage(pageImages)).resolves.toEqual({ maps: null, truncated: false });
  });
});
