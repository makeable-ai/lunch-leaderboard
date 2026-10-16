const test = require('node:test');
const assert = require('node:assert');
const { sanitizeNickname_, sanitizeAvatar_, cleanCount_, rankMembers_ } = require('../apps-script/Code.gs');

test('normal and emoji-only nicknames pass', () => {
  assert.strictEqual(sanitizeNickname_('Iron Panda'), 'Iron Panda');
  assert.strictEqual(sanitizeNickname_("Dan's_Guard.2"), "Dan's_Guard.2");
  assert.strictEqual(sanitizeNickname_('🐼🥋'), '🐼🥋');
});

test('hostile nicknames are rejected', () => {
  assert.strictEqual(sanitizeNickname_('<img src=x onerror=alert(1)>'), '');
  assert.strictEqual(sanitizeNickname_('=HYPERLINK("http://example.com")'), '');
  assert.strictEqual(sanitizeNickname_('+cmd'), '');
  assert.strictEqual(sanitizeNickname_('-1+1'), '');
  assert.strictEqual(sanitizeNickname_('@everyone'), '');
  assert.strictEqual(sanitizeNickname_('a<b'), '');
  assert.strictEqual(sanitizeNickname_('Bob;DROP'), '');
  assert.strictEqual(sanitizeNickname_(42), '');
  assert.strictEqual(sanitizeNickname_(''), '');
});

test('control and bidi characters are stripped, length is capped at 16', () => {
  assert.strictEqual(sanitizeNickname_('Ab\u0000c‮d'), 'Abcd');
  const long = sanitizeNickname_('A'.repeat(200));
  assert.strictEqual(long, 'A'.repeat(16));
  assert.strictEqual(Array.from(sanitizeNickname_('🐼'.repeat(50))).length, 16);
});

test('avatars: emoji only', () => {
  assert.strictEqual(sanitizeAvatar_('🐼'), '🐼');
  assert.strictEqual(sanitizeAvatar_('👩‍🎤'), '👩‍🎤');
  assert.strictEqual(sanitizeAvatar_('<b>'), '');
  assert.strictEqual(sanitizeAvatar_('A'), '');
  assert.strictEqual(sanitizeAvatar_(''), '');
  assert.strictEqual(sanitizeAvatar_(undefined), '');
});

test('counts are clamped to safe integers', () => {
  assert.strictEqual(cleanCount_('3'), 3);
  assert.strictEqual(cleanCount_(-4), 0);
  assert.strictEqual(cleanCount_('abc'), 0);
  assert.strictEqual(cleanCount_(1e12), 9999);
});

test('ranking: ties share a rank and keep sheet order', () => {
  const out = rankMembers_([
    ['Iron Panda', '🐼', 1, 1, 3],
    ['Yellow Wizard', '', 1, 0, 1],
    ['Bulb Sore', '', 1, 1, 3],
    ['', '', '', '', ''],
  ]);
  assert.deepStrictEqual(out.map((m) => [m.nickname, m.points, m.rank]),
    [['Iron Panda', 3, 1], ['Bulb Sore', 3, 1], ['Yellow Wizard', 1, 3]]);
});

test('everyone at zero shares rank 1; empty and single member work', () => {
  const zero = rankMembers_([['A', '', 0, 0, 0], ['B', '', 0, 0, 0]]);
  assert.deepStrictEqual(zero.map((m) => m.rank), [1, 1]);
  assert.deepStrictEqual(rankMembers_([]), []);
  assert.strictEqual(rankMembers_([['Solo', '', 2, 1, 4]]).length, 1);
});

test('output has only allowlisted fields', () => {
  const [m] = rankMembers_([['X', '🐼', 1, 1, 3, 'SECRETCODE', 'note']]);
  assert.deepStrictEqual(Object.keys(m).sort(),
    ['avatar', 'nickname', 'points', 'rank', 'signups', 'trials']);
});
