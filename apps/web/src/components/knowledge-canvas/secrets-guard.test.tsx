import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// SECURITY GUARD — KNOWLEDGE CANVAS SOURCES
// ============================================================
// The redesign contract is strict: provider keys must NEVER land in the
// browser bundle. This test scans every knowledge-canvas source file for
// the insecure patterns the reference app shipped (hardcoded Gemini /
// OpenAI style keys, api_key assignments, BYOK passphrases, Firebase
// config objects) and fails the suite if any appear.
// ============================================================

const REGIONS = [
  'src/components/knowledge-canvas',
  'src/app/(dashboard)/knowledge-canvas',
];

const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'gemini-style api key', re: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: 'openai-style api key', re: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: 'api key variable assignment', re: /(api[_-]?key|apiKey)\s*[:=]\s*["'][^"']{8,}["']/i },
  { name: 'openrouter / provider key literal', re: /openrouter[^"'\n]*["'][^"']{10,}["']/i },
  { name: 'firebase config object', re: /firebaseConfig|firebase\.initializeApp|apiKey:\s*["'][^"']{8,}["']/i },
];

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.tsx')) {
      out.push(full);
    }
  }
  return out;
}

describe('knowledge-canvas security guard', () => {
  const files = REGIONS.flatMap((region) => {
    const dir = path.join(process.cwd(), region);
    return fs.existsSync(dir) ? collectFiles(dir).map((f) => ({ f, rel: path.relative(process.cwd(), f) })) : [];
  });

  it('scans a non-empty set of sources', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { name, re } of SECRET_PATTERNS) {
    it(`contains no ${name}`, () => {
      const offenders = files.filter(({ f }) => re.test(fs.readFileSync(f, 'utf8')));
      expect(offenders.map((o) => o.rel)).toEqual([]);
    });
  }
});
