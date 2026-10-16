# Test checklist

Tick each box only after seeing it with your own eyes. Items marked (done) were checked on 2026-10-16.

## Sheet
- [ ] Sharing says **Restricted** (Share button, General access).
- [x] Log: a code that is not in Members is rejected (done).
- [x] Log: the nickname column fills in next to each code (done).
- [x] Board and BoardMonth match the Log by hand count (done).
- [x] An inactive member (Active unticked) does not appear on either board (done).
- [x] Members, Board and BoardMonth show a lock icon, and the Log tab does not (done).

## Coach account (needs a second Google account)
- [ ] Share the Sheet as **Editor** with the coach. Untick "Editors can change permissions and share".
- [ ] Signed in as the coach: Log can be edited; Members, Board and BoardMonth cannot.
- [ ] The coach can add a Trial row from the phone app and see it on the page within about a minute.

## Feed
- [x] Opening the feed with no login returns JSON (done).
- [x] The JSON has only nickname, avatar, points, trials, signups, rank, lastUpdated (done).
- [x] No codes, notes, dates, emails or Sheet ID appear anywhere in the JSON (done).
- [x] `?view=month` and `?view=all` both work (done).
- [x] The Sheet's own address returns 401 with no login (done).

## Page (390px wide)
- [x] Loads from the live address with no console errors (done).
- [x] Tap a fighter to open the stat card; Back closes it (done).
- [x] Bars fill; ties share a rank; everyone at zero shows the friendly message (done).
- [x] Failed fetch shows "The dojo is closed. Try again." plus the last saved results (done).
- [x] Hostile names (`<img onerror>`, `=HYPERLINK(...)`, 200 characters, emoji only) do not run, leak or break the layout (done).
- [ ] Reduced motion: turn on Reduce Motion in the phone settings; there is no splash, confetti or bar animation.
- [ ] Rank-up banner appears once on a real phone after a rank changes, then does not repeat.
- [ ] Sound is off by default and only plays after tapping Sound.
- [ ] Looks right on a real phone in a dim room.

## Before real members
- [ ] Delete the sample and test rows from Members and Log.
- [ ] Give each real member a random code (not their nickname).
- [ ] Every nickname is unique.
