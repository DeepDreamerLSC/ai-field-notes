/* 渲染前断言：所有句子字幕 ≤2 行、无估算溢出、无行首标点、无 <4 字孤行 */
import { readFileSync } from 'node:fs';
import { subtitleMeta } from './wrap.js';

const timing = JSON.parse(readFileSync(new URL('./timing.json', import.meta.url), 'utf8'));
const NO_LEAD = '。，？！；：、）】》”—';
let bad = 0;
for (const [i, s] of timing.sentences.entries()) {
  const m = subtitleMeta(s);
  const issues = [];
  if (m.lines.length > 2) issues.push(`${m.lines.length} 行`);
  if (m.overflow) issues.push('行宽溢出');
  if (m.lines.slice(1).some((l) => NO_LEAD.includes(l[0]))) issues.push('行首标点');
  if (m.lines.length === 2 && m.lines[1].length < 4) issues.push('孤行');
  if (issues.length) { bad++; console.log(`s${String(i + 1).padStart(2, '0')} ✗ ${issues.join(',')} | ${JSON.stringify(m.lines)}`); }
  else console.log(`s${String(i + 1).padStart(2, '0')} ✓ ${m.lines.length} 行 宽${Math.round(Math.max(...m.widths))}`);
}
process.exit(bad ? 1 : 0);
