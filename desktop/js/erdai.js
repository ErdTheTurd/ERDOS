/* ERDAI — real AI via Puter.js (user-pays, no API keys in the app) */
const ErdAI = (() => {
  const SYSTEM = `You are ERDAI, the ErdOS Resident Desktop AI.
You live inside ErdOS, a Phosphor Glass windowed desktop for Windows, macOS, and Linux.
Be helpful, clear, and modern. Keep answers concise unless the user asks for depth.
You can talk about anything — not only ErdOS.
If asked who you are: you are ERDAI, powered by Puter AI (cloud models), running in the ErdOS desktop.
Do not invent XP, streaks, quests, fortunes, or gamification systems.`;

  function available() {
    return typeof window.puter?.ai?.chat === 'function';
  }

  function extractText(result) {
    if (result == null) return '';
    if (typeof result === 'string') return result;
    if (typeof result?.toString === 'function' && result.toString !== Object.prototype.toString) {
      const s = result.toString();
      if (s && s !== '[object Object]') return s;
    }
    const content = result.message?.content ?? result.content ?? result.text;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === 'string') return part;
        return part?.text || part?.content || '';
      }).join('');
    }
    try {
      return JSON.stringify(result);
    } catch {
      return String(result);
    }
  }

  async function chat(userText, history = []) {
    if (!available()) {
      throw new Error('Puter AI is not loaded. Check your network connection.');
    }

    const facts = ErdOSProgress.get()?.erdaiMemory?.facts || [];
    const name = ErdOSProgress.get()?.displayName || '';
    const memoryBlock = facts.length
      ? `\nThings to remember about this user:\n- ${facts.join('\n- ')}`
      : '';
    const nameBlock = name ? `\nThe user's name is ${name}.` : '';

    const messages = [
      { role: 'system', content: SYSTEM + nameBlock + memoryBlock },
      ...history.slice(-16),
      { role: 'user', content: userText },
    ];

    const result = await window.puter.ai.chat(messages, {
      model: 'gpt-4o-mini',
    });
    return extractText(result).trim() || '…';
  }

  return { available, chat };
})();

window.ErdAI = ErdAI;
