const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logic.js');

const good = {
  ok: true, view: 'all', lastUpdated: '2026-10-16T03:39:11.684Z',
  members: [
    { nickname: 'Iron Panda', avatar: '🐼', points: 3, trials: 1, signups: 1, rank: 1 },
    { nickname: 'Bulb Sore', avatar: '', points: 3, trials: 1, signups: 1, rank: 1 },
    { nickname: 'Yellow Wizard', avatar: '🧙', points: 1, trials: 1, signups: 0, rank: 3 },
  ],
};

test('parsePayload accepts the real shape', () => {
  const p = L.parsePayload(good);
  assert.strictEqual(p.members.length, 3);
  assert.strictEqual(p.members[0].avatar, '🐼');
  assert.ok(p.members[1].avatar.length > 0, 'blank avatar gets an automatic one');
  assert.strictEqual(p.lastUpdated, '2026-10-16T03:39:11.684Z');
});

test('parsePayload rejects bad shapes', () => {
  for (const bad of [null, undefined, 'x', 5, {}, { ok: false }, { ok: true }, { ok: true, members: 'no' }]) {
    assert.throws(() => L.parsePayload(bad));
  }
});

test('empty member list is valid, not an error', () => {
  assert.deepStrictEqual(L.parsePayload({ ok: true, members: [] }).members, []);
});

test('parsePayload coerces junk fields safely', () => {
  const p = L.parsePayload({ ok: true, members: [
    { nickname: 42, points: 1 },
    { nickname: 'A', points: '7', trials: -3, signups: 'x', rank: 0 },
    null,
    { nickname: 'B'.repeat(200), points: 1e12 },
  ] });
  assert.strictEqual(p.members.length, 2);
  assert.strictEqual(p.members[0].points, 7);
  assert.strictEqual(p.members[0].trials, 0);
  assert.strictEqual(p.members[0].rank, 1);
  assert.strictEqual(p.members[1].nickname.length, 40);
  assert.strictEqual(p.members[1].points, 9999);
});

test('avatarFor is stable for the same name', () => {
  assert.strictEqual(L.avatarFor('Bulb Sore', ''), L.avatarFor('Bulb Sore', ''));
  assert.strictEqual(L.avatarFor('X', '🐼'), '🐼');
});

test('fillPercent handles nobody-scored and normal cases', () => {
  assert.strictEqual(L.fillPercent(0, 0), 0);
  assert.strictEqual(L.fillPercent(3, 3), 100);
  assert.strictEqual(L.fillPercent(1, 3), 33);
  assert.strictEqual(L.fillPercent(5, 3), 100);
});

test('rankUps reports only improvements', () => {
  const prev = { A: 3, B: 1, C: 2, D: 4 };
  const now = [
    { nickname: 'A', rank: 1 }, { nickname: 'B', rank: 2 },
    { nickname: 'C', rank: 2 }, { nickname: 'E', rank: 5 },
  ];
  assert.deepStrictEqual(L.rankUps(prev, now), [{ nickname: 'A', places: 2 }]);
  assert.deepStrictEqual(L.rankUps(null, now), []);
  assert.deepStrictEqual(L.rankUps({}, now), []);
});

test('rankSnapshot maps nickname to rank', () => {
  assert.deepStrictEqual(L.rankSnapshot([{ nickname: 'A', rank: 2 }]), { A: 2 });
});
