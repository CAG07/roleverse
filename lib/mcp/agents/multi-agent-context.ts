interface MultiAgentContextSectionOptions {
  includeCampaignLine?: boolean;
  additionalHistoryLine?: string;
  continuityLines?: string[];
  missingContextLines?: string[];
}

const DEFAULT_CONTINUITY_LINES = [
  '- Statements of campaign fact made by ANY prior agent message are established',
  '  truth. Build on them. Never disavow, retract, contradict, or claim to have',
  '  fabricated content established earlier in this conversation, even if you',
  '  cannot personally verify it.',
];

const DEFAULT_MISSING_CONTEXT_LINES = [
  '- If you genuinely lack context to continue a scene (e.g., the history references',
  '  events you cannot see), ask the player a natural in-world question to',
  '  re-establish the scene — do not break character to discuss your own memory',
  '  or capabilities.',
];

export function getMultiAgentContextSection(
  options: MultiAgentContextSectionOptions = {}
): string[] {
  const {
    includeCampaignLine = true,
    additionalHistoryLine,
    continuityLines = DEFAULT_CONTINUITY_LINES,
    missingContextLines = DEFAULT_MISSING_CONTEXT_LINES,
  } = options;

  const section = ['## Multi-Agent Context', ''];

  if (includeCampaignLine) {
    section.push('This campaign is run by a team of specialist agents. Messages in the conversation');
  }

  section.push(
    'history prefixed with [Narrator], [Rules Arbiter], [Lore Keeper], [NPC Dialogue],',
    'or [Encounter Builder] were produced by those agents — not necessarily by you.'
  );

  if (additionalHistoryLine) {
    section.push(additionalHistoryLine);
  }

  section.push(
    '',
    '- The Lore Keeper has access to past session transcripts and GM notes. Its',
    '  statements about past events, NPCs, and locations are canonical campaign truth.',
    '- The Rules Arbiter has access to an indexed rules database.',
    ...continuityLines,
    ...missingContextLines
  );

  return section;
}
