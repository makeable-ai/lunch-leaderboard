/* Lunch Roll: page behaviour. All sheet data is rendered with textContent only. */
(function () {
  'use strict';

  // Public read-only feed (Apps Script web app). Contains no secrets.
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycby7R_FqI6MpaFTQcPWK1BucNMfNW50X5P_fIMmVvxC9Ui8a6t7YF_5zY6VB-2XNs0gT/exec';
  var TIMEOUT_MS = 12000;
  var STALE_MS = 60000;

  var L = window.LL;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---- storage (every access wrapped: private windows can throw) ----
  function store(kind) {
    try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch (e) { return null; }
  }
  function getItem(key, kind) {
    try { var s = store(kind); return s ? s.getItem(key) : null; } catch (e) { return null; }
  }
  function setItem(key, value, kind) {
    try { var s = store(kind); if (s) s.setItem(key, value); } catch (e) { /* ignore */ }
  }
  function getJSON(key) {
    try { var raw = getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  // ---- elements ----
  function $(id) { return document.getElementById(id); }
  var els = {
    board: $('board'), empty: $('empty'), stamp: $('stamp'), banner: $('banner'),
    confetti: $('confetti'), splash: $('splash'), refresh: $('refresh'), sound: $('sound'),
    tabAll: $('tab-all'), tabMonth: $('tab-month'),
    card: $('card'), cardClose: $('card-close'), cardAvatar: $('card-avatar'), cardName: $('card-name'),
    cardRank: $('card-rank'), cardTrials: $('card-trials'), cardTrialsPts: $('card-trials-pts'),
    cardSignups: $('card-signups'), cardSignupsPts: $('card-signups-pts'), cardPoints: $('card-points')
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  // ---- state ----
  var state = {
    view: getItem('ll:view') === 'month' ? 'month' : 'all',
    token: 0,
    lastLoad: 0,
    sound: getItem('ll:sound') === '1',
    audio: null
  };

  function timeText(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // ---- sound (off by default, only starts after a tap) ----
  function blip(freqs) {
    if (!state.sound) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!state.audio) state.audio = new AC();
      var ctx = state.audio;
      var t = ctx.currentTime;
      freqs.forEach(function (f, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.05, t + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 0.1);
      });
    } catch (e) { /* sound is optional */ }
  }

  function paintSound() {
    els.sound.setAttribute('aria-pressed', state.sound ? 'true' : 'false');
    els.sound.textContent = state.sound ? 'Sound on' : 'Sound off';
    els.sound.setAttribute('aria-label', state.sound ? 'Sound on' : 'Sound off');
  }

  // ---- banner ----
  function hideBanner() { els.banner.hidden = true; clear(els.banner); els.banner.className = 'banner'; }

  function showError(hasSaved) {
    clear(els.banner);
    els.banner.className = 'banner is-error';
    els.banner.appendChild(document.createTextNode('The dojo is closed. Try again.'));
    els.banner.appendChild(el('span', 'banner-sub',
      hasSaved ? 'Could not reach the leaderboard. Showing the last results saved on this phone.'
               : 'Could not reach the leaderboard and there are no saved results yet.'));
    var retry = el('button', 'btn', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', function () { load(true); });
    els.banner.appendChild(retry);
    els.banner.hidden = false;
  }

  function celebrate(ups) {
    if (!ups.length) return;
    var top = ups[0];
    clear(els.banner);
    els.banner.className = 'banner is-rankup';
    els.banner.appendChild(document.createTextNode('Rank up!'));
    var more = ups.length > 1 ? ' and ' + (ups.length - 1) + ' more' : '';
    els.banner.appendChild(el('span', 'banner-sub',
      top.nickname + ' climbed ' + top.places + (top.places === 1 ? ' place' : ' places') + more + '.'));
    els.banner.hidden = false;
    blip([440, 660, 880]);
    if (reduceMotion) return;
    var colors = ['#ffd84a', '#ff3d8b', '#2fe6f2', '#f2eeff'];
    for (var i = 0; i < 28; i++) {
      var bit = el('span', 'bit');
      var angle = (Math.PI * 2 * i) / 28;
      var dist = 90 + Math.random() * 140;
      bit.style.setProperty('--dx', Math.round(Math.cos(angle) * dist) + 'px');
      bit.style.setProperty('--dy', Math.round(Math.sin(angle) * dist + 120) + 'px');
      bit.style.setProperty('--rot', Math.round(Math.random() * 360) + 'deg');
      bit.style.setProperty('--c', colors[i % colors.length]);
      els.confetti.appendChild(bit);
    }
    window.setTimeout(function () { clear(els.confetti); }, 1500);
  }

  // ---- rendering ----
  function render(payload, upMap) {
    var members = payload.members;
    clear(els.board);

    var top = 0;
    var perRank = {};
    members.forEach(function (m) {
      if (m.points > top) top = m.points;
      perRank[m.rank] = (perRank[m.rank] || 0) + 1;
    });

    if (!members.length) {
      els.empty.textContent = 'Nobody is on the board yet. Ask your coach to add the class members.';
      els.empty.hidden = false;
    } else if (top === 0) {
      els.empty.textContent = 'Nobody has scored yet. The first friend to try a class puts someone on the board.';
      els.empty.hidden = false;
    } else {
      els.empty.hidden = true;
    }

    var fills = [];
    members.forEach(function (m) {
      var li = el('li');
      var btn = el('button', 'fighter' + (m.rank === 1 && top > 0 ? ' is-first' : ''));
      btn.type = 'button';
      btn.setAttribute('aria-label',
        m.nickname + ', rank ' + m.rank + (perRank[m.rank] > 1 ? ' (tied)' : '') + ', ' + m.points +
        (m.points === 1 ? ' point' : ' points') + '. Open stat card.');

      var rank = el('span', 'rank');
      rank.appendChild(el('span', 'rank-num', String(m.rank)));
      if (perRank[m.rank] > 1) rank.appendChild(el('span', 'rank-tag', 'Tie'));
      btn.appendChild(rank);

      btn.appendChild(el('span', 'avatar', m.avatar));

      var who = el('span', 'who');
      who.appendChild(el('span', 'name', m.nickname));
      var climbed = upMap && upMap[m.nickname];
      if (climbed) who.appendChild(el('span', 'up', 'Up ' + climbed));
      var bar = el('span', 'bar');
      var fill = el('span', 'bar-fill');
      bar.appendChild(fill);
      who.appendChild(bar);
      fills.push({ node: fill, pct: L.fillPercent(m.points, top) });
      btn.appendChild(who);

      var pts = el('span', 'pts');
      pts.appendChild(el('span', 'pts-num', String(m.points)));
      pts.appendChild(el('span', 'pts-label', 'pts'));
      btn.appendChild(pts);

      btn.addEventListener('click', function () { openCard(m, perRank[m.rank] > 1, btn); });
      li.appendChild(btn);
      els.board.appendChild(li);
    });

    // Fill after first paint so the bars animate in (CSS skips the animation for reduced motion).
    window.setTimeout(function () {
      fills.forEach(function (f) {
        f.node.style.setProperty('--fill', f.pct + '%');
        f.node.classList.add('is-set');
      });
    }, 30);
  }

  function paintStamp(iso, saved) {
    var label = state.view === 'month'
      ? 'This month (' + new Date().toLocaleString([], { month: 'long' }) + ')'
      : 'All time';
    var t = iso ? timeText(iso) : '';
    var tail = saved ? ' · Saved results' + (t ? ' from ' + t : '') : (t ? ' · Updated ' + t : '');
    els.stamp.textContent = label + tail;
  }

  // ---- stat card ----
  var cardOpener = null;
  function openCard(m, tied, opener) {
    cardOpener = opener;
    els.cardAvatar.textContent = m.avatar;
    els.cardName.textContent = m.nickname;
    els.cardRank.textContent = 'Rank ' + m.rank + (tied ? ' (tied)' : '');
    els.cardTrials.textContent = String(m.trials);
    els.cardTrialsPts.textContent = m.trials + ' x 1 pt = ' + m.trials;
    els.cardSignups.textContent = String(m.signups);
    els.cardSignupsPts.textContent = m.signups + ' x 2 pts = ' + (m.signups * 2);
    els.cardPoints.textContent = String(m.points);
    blip([520]);
    if (typeof els.card.showModal === 'function') els.card.showModal();
    else els.card.setAttribute('open', '');
  }
  function closeCard() {
    if (typeof els.card.close === 'function') els.card.close();
    else els.card.removeAttribute('open');
    if (cardOpener && cardOpener.focus) cardOpener.focus();
  }

  // ---- loading ----
  function setBusy(busy) {
    els.refresh.disabled = busy;
    els.refresh.textContent = busy ? 'Loading' : 'Refresh';
  }

  function showCached(view) {
    var cached = getJSON('ll:data:' + view);
    if (!cached || !cached.payload) return false;
    try {
      var payload = L.parsePayload(cached.payload);
      render(payload, null);
      paintStamp(cached.savedAt, true);
      return true;
    } catch (e) { return false; }
  }

  function load(manual) {
    var token = ++state.token;
    var view = state.view;
    setBusy(true);
    if (manual) els.stamp.textContent = 'Loading the board…';

    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;

    fetch(ENDPOINT + '?view=' + encodeURIComponent(view), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var payload = L.parsePayload(data);
        if (token !== state.token) return;
        var previous = getJSON('ll:ranks:' + view);
        var ups = L.rankUps(previous, payload.members);
        var upMap = {};
        ups.forEach(function (u) { upMap[u.nickname] = u.places; });

        hideBanner();
        render(payload, upMap);
        paintStamp(payload.lastUpdated || new Date().toISOString(), false);
        setItem('ll:data:' + view, JSON.stringify({ savedAt: payload.lastUpdated || new Date().toISOString(), payload: data }));
        setItem('ll:ranks:' + view, JSON.stringify(L.rankSnapshot(payload.members)));
        state.lastLoad = Date.now();
        celebrate(ups);
      })
      .catch(function () {
        if (token !== state.token) return;
        var hadSaved = showCached(view);
        if (!hadSaved) {
          clear(els.board);
          els.empty.textContent = 'No results to show yet.';
          els.empty.hidden = false;
          els.stamp.textContent = 'Not connected';
        }
        showError(hadSaved);
      })
      .then(function () {
        if (timer) window.clearTimeout(timer);
        if (token === state.token) setBusy(false);
      });
  }

  function setView(view) {
    if (view === state.view) return;
    state.view = view;
    setItem('ll:view', view);
    paintTabs();
    hideBanner();
    if (!showCached(view)) { clear(els.board); els.empty.hidden = true; els.stamp.textContent = 'Loading the board…'; }
    load(false);
  }

  function paintTabs() {
    els.tabAll.setAttribute('aria-pressed', state.view === 'all' ? 'true' : 'false');
    els.tabMonth.setAttribute('aria-pressed', state.view === 'month' ? 'true' : 'false');
  }

  // ---- splash (once per browser session, skipped for reduced motion) ----
  function runSplash() {
    if (reduceMotion || getItem('ll:splash', 'session')) return;
    setItem('ll:splash', '1', 'session');
    els.splash.hidden = false;
    var done = function () { els.splash.hidden = true; };
    els.splash.addEventListener('click', done);
    window.setTimeout(done, 2000);
  }

  // ---- wire up ----
  if (!L) {
    els.stamp.textContent = 'The dojo is closed. Reload the page to try again.';
    return;
  }

  els.tabAll.addEventListener('click', function () { setView('all'); });
  els.tabMonth.addEventListener('click', function () { setView('month'); });
  els.refresh.addEventListener('click', function () { load(true); });
  els.sound.addEventListener('click', function () {
    state.sound = !state.sound;
    setItem('ll:sound', state.sound ? '1' : '0');
    paintSound();
    blip([660]);
  });
  els.cardClose.addEventListener('click', closeCard);
  els.card.addEventListener('click', function (e) { if (e.target === els.card) closeCard(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && Date.now() - state.lastLoad > STALE_MS) load(false);
  });

  paintTabs();
  paintSound();
  runSplash();
  showCached(state.view);
  load(false);
})();
