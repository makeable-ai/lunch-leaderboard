/* Pure helpers for the leaderboard page. No DOM access, so they can be unit tested in Node. */
(function (root) {
  'use strict';

  var MAX_MEMBERS = 100;
  var AVATARS = ['🦊', '🐯', '🦈', '🐙', '🦅', '🐲', '🐺', '🦁', '🐻', '🐸', '🦉', '🐧', '🦂', '🐢', '🦍', '🐊'];

  function str(v, max) {
    return typeof v === 'string' ? v.slice(0, max) : '';
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 9999) : 0;
  }

  // Deterministic emoji for a nickname when the sheet has no Avatar.
  function avatarFor(nickname, avatar) {
    if (avatar) return avatar;
    var h = 0;
    for (var i = 0; i < nickname.length; i++) h = (h * 31 + nickname.charCodeAt(i)) >>> 0;
    return AVATARS[h % AVATARS.length];
  }

  // Validates the JSON from the script. Throws if it is not the expected shape.
  function parsePayload(data) {
    if (!data || typeof data !== 'object' || data.ok !== true || !Array.isArray(data.members)) {
      throw new Error('bad payload');
    }
    var members = [];
    for (var i = 0; i < data.members.length && members.length < MAX_MEMBERS; i++) {
      var m = data.members[i];
      if (!m || typeof m !== 'object') continue;
      var nickname = str(m.nickname, 40);
      if (!nickname) continue;
      members.push({
        nickname: nickname,
        avatar: avatarFor(nickname, str(m.avatar, 16)),
        points: num(m.points),
        trials: num(m.trials),
        signups: num(m.signups),
        rank: Math.max(1, num(m.rank))
      });
    }
    var t = typeof data.lastUpdated === 'string' ? Date.parse(data.lastUpdated) : NaN;
    return {
      view: data.view === 'month' ? 'month' : 'all',
      lastUpdated: isNaN(t) ? null : new Date(t).toISOString(),
      members: members
    };
  }

  // Bar fill as a whole-number percent of the leader. Nobody scored -> everyone 0.
  function fillPercent(points, topPoints) {
    if (!topPoints || topPoints <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((points / topPoints) * 100)));
  }

  function rankSnapshot(members) {
    var out = {};
    members.forEach(function (m) { out[m.nickname] = m.rank; });
    return out;
  }

  // Only improvements are reported. Nobody sees a "dropped" message.
  // Returns [{nickname, places}] sorted by biggest climb, then by name.
  function rankUps(previous, members) {
    if (!previous || typeof previous !== 'object') return [];
    var ups = [];
    members.forEach(function (m) {
      var before = previous[m.nickname];
      if (typeof before === 'number' && before > m.rank) {
        ups.push({ nickname: m.nickname, places: before - m.rank });
      }
    });
    ups.sort(function (a, b) { return b.places - a.places || (a.nickname < b.nickname ? -1 : 1); });
    return ups;
  }

  var api = {
    parsePayload: parsePayload,
    avatarFor: avatarFor,
    fillPercent: fillPercent,
    rankSnapshot: rankSnapshot,
    rankUps: rankUps
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LL = api;
})(typeof self !== 'undefined' ? self : this);
