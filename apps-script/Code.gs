/**
 * Lunch Leaderboard: public, read-only JSON feed.
 *
 * Reads ONLY the "Board" (all time) and "BoardMonth" (this month) tabs.
 * Never reads Members or Log, so codes, notes and dates cannot leak.
 *
 * @OnlyCurrentDoc
 */

var CACHE_SECONDS = 60;
var MAX_ROWS = 100;
var MAX_NICKNAME_LENGTH = 16;
var MAX_COUNT = 9999;
var TABS = { all: 'Board', month: 'BoardMonth' };

function doGet(e) {
  var view = e && e.parameter && e.parameter.view === 'month' ? 'month' : 'all';
  try {
    var cache = CacheService.getScriptCache();
    var key = 'board:' + view;
    var body = cache.get(key);
    if (!body) {
      body = JSON.stringify(buildPayload_(view));
      cache.put(key, body, CACHE_SECONDS);
    }
    return jsonOutput_(body);
  } catch (err) {
    // Never echo error details to the public.
    return jsonOutput_(JSON.stringify({ ok: false, error: 'unavailable' }));
  }
}

function jsonOutput_(body) {
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function buildPayload_(view) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS[view]);
  var rows = sheet.getRange(2, 1, MAX_ROWS, 5).getValues(); // Nickname, Avatar, Trials, Signups, Points
  return {
    ok: true,
    view: view,
    lastUpdated: new Date().toISOString(),
    members: rankMembers_(rows)
  };
}

// ---- pure helpers (unit tested in Node, see tests/code.test.js) ----

function sanitizeNickname_(value) {
  if (typeof value !== 'string') return '';
  var s = value
    .replace(/[\u0000-\u001F\u007F-\u009F​‎‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  s = Array.from(s).slice(0, MAX_NICKNAME_LENGTH).join('').trim();
  if (!s) return '';
  if (/^[=+\-@]/.test(s)) return '';
  if (/[<>]/.test(s)) return '';
  // letters, numbers, spaces, emoji, and . _ '
  if (!/^[\p{L}\p{N}\p{Extended_Pictographic}\p{Emoji_Modifier}️‍ ._']+$/u.test(s)) return '';
  return s;
}

function sanitizeAvatar_(value) {
  if (typeof value !== 'string') return '';
  var s = value.trim();
  if (Array.from(s).length > 8) return '';
  if (!/^\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*$/u.test(s)) return '';
  return s;
}

function cleanCount_(value) {
  var n = Number(value);
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), MAX_COUNT);
}

// Points sort high to low; ties share a rank (1,1,3) and keep sheet order.
function rankMembers_(rows) {
  var members = [];
  for (var i = 0; i < rows.length; i++) {
    var nickname = sanitizeNickname_(rows[i][0]);
    if (!nickname) continue;
    var trials = cleanCount_(rows[i][2]);
    var signups = cleanCount_(rows[i][3]);
    members.push({
      nickname: nickname,
      avatar: sanitizeAvatar_(rows[i][1]),
      trials: trials,
      signups: signups,
      points: trials + signups * 2,
      _order: i
    });
  }
  members.sort(function (a, b) {
    return b.points - a.points || a._order - b._order;
  });
  var rank = 0;
  return members.map(function (m, idx) {
    if (idx === 0 || m.points !== members[idx - 1].points) rank = idx + 1;
    return {
      nickname: m.nickname,
      avatar: m.avatar,
      points: m.points,
      trials: m.trials,
      signups: m.signups,
      rank: rank
    };
  });
}

if (typeof module !== 'undefined') {
  module.exports = { sanitizeNickname_: sanitizeNickname_, sanitizeAvatar_: sanitizeAvatar_, cleanCount_: cleanCount_, rankMembers_: rankMembers_ };
}
