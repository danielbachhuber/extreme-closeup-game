// Extreme Close-Up: live guess collection. No database; state lives in memory.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const PORT = process.env.PORT || 8787;
const HOST_KEY = process.env.HOST_KEY || randomUUID().slice(0, 8);

let round = { id: randomUUID(), number: 1, revealed: false, answers: {} }; // answers: playerId -> { name, text, isOwner }
const history = []; // finished rounds, newest first

function revealedList(r) {
  return Object.values(r.answers).sort((a, b) => b.isOwner - a.isOwner);
}

function publicState(playerId) {
  return {
    round: round.number,
    roundId: round.id,
    revealed: round.revealed,
    submitted: Object.values(round.answers).map(a => a.name),
    answers: round.revealed ? revealedList(round) : null,
    mine: round.answers[playerId] || null,
    history,
  };
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
    });
  });
}

const json = (res, data) =>
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(data));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/state') {
    json(res, publicState(url.searchParams.get('id')));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/submit') {
    const { id, name, text, isOwner, round: n } = await readBody(req);
    if (!id || !name?.trim() || !text?.trim() || round.revealed || n !== round.number) {
      res.writeHead(400).end('rejected');
      return;
    }
    round.answers[id] = { name: name.trim().slice(0, 40), text: text.trim().slice(0, 200), isOwner: !!isOwner };
    json(res, publicState(id));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/host') {
    const { key, action } = await readBody(req);
    if (key !== HOST_KEY) { res.writeHead(403).end('nope'); return; }
    if (action === 'reveal') round.revealed = true;
    if (action === 'next') {
      if (Object.keys(round.answers).length) {
        const owner = Object.values(round.answers).find(a => a.isOwner);
        history.unshift({ number: round.number, owner: owner?.name || null, answers: revealedList(round) });
      }
      round = { id: randomUUID(), number: round.number + 1, revealed: false, answers: {} };
    }
    if (action === 'reset') {
      round = { id: randomUUID(), number: 1, revealed: false, answers: {} };
      history.length = 0;
    }
    res.writeHead(204).end();
    return;
  }

  if (url.pathname === '/themes.css') {
    res.writeHead(200, { 'Content-Type': 'text/css', 'Cache-Control': 'no-store' }).end(readFileSync(new URL('./themes.css', import.meta.url)));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(PAGE);
});

server.listen(PORT, () => {
  console.log(`Players: http://localhost:${PORT}/`);
  console.log(`Host:    http://localhost:${PORT}/?host=${HOST_KEY}`);
});

const PAGE = /* html */ `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Extreme Close-Up</title>
<style>
  * { box-sizing: border-box; }
  body { font: 18px/1.45 system-ui, sans-serif; margin: 0; background: #faf7f2; color: #1d1b18; }
  main { max-width: 560px; margin: 0 auto; padding: 32px 20px 60px; }
  header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 24px; }
  h1 { font-size: 28px; margin: 0; }
  h2 { font-size: 22px; margin: 0 0 4px; }
  .round { color: #8a5a00; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
  .me { font-size: 15px; color: #6b645a; }
  .link { background: none; border: 0; padding: 0; margin: 0; color: #8a5a00; text-decoration: underline; cursor: pointer; font: inherit; font-weight: 400; }
  label { display: block; font-weight: 600; margin: 16px 0 6px; }
  input[type=text] { width: 100%; font: inherit; padding: 10px 12px; border: 1px solid #cfc7bb; border-radius: 8px; background: #fff; }
  .check { display: flex; gap: 8px; align-items: center; font-weight: 400; }
  button { font: inherit; font-weight: 600; padding: 10px 18px; border: 0; border-radius: 8px; background: #d9480f; color: #fff; cursor: pointer; margin-top: 16px; }
  button.secondary { background: #3b3833; }
  button:disabled { opacity: .5; cursor: default; }
  .note { color: #6b645a; font-size: 15px; margin-top: 8px; }
  .card { background: #fff; border: 1px solid #e3dccf; border-radius: 12px; padding: 20px; }
  .big { font-size: 24px; font-weight: 600; margin: 4px 0 0; word-break: break-word; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { background: #e9e2d6; border-radius: 999px; padding: 2px 10px; font-size: 15px; }
  ul.answers { list-style: none; padding: 0; margin: 12px 0 0; }
  ul.answers li { background: #fff; border: 1px solid #e3dccf; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
  ul.answers li.owner { border: 2px solid #2b8a3e; background: #ebfbee; }
  .who { font-size: 14px; color: #6b645a; }
  .tag { font-size: 13px; color: #2b8a3e; font-weight: 700; margin-left: 6px; }
  section { margin-top: 28px; }
  .host { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #cfc7bb; }
  details { margin-top: 10px; }
  summary { cursor: pointer; font-weight: 600; }
  details ul.answers { margin-left: 0; }
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Raleway:wght@500;700;800&family=Space+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="/themes.css"></head>
<body><main>
  <header>
    <h1>Extreme Close-Up</h1>
    <div class="me" id="me" hidden>Playing as <strong id="meName"></strong> · <button class="link" id="switchBtn">switch</button></div>
  </header>

  <!-- Screen: sign in -->
  <form id="signin" hidden>
    <h2>Who's playing?</h2>
    <label for="name">Your name</label>
    <input type="text" id="name" required maxlength="40" autocomplete="off">
    <button type="submit">Join the game</button>
  </form>

  <!-- Screen: guess -->
  <form id="guess" hidden>
    <div class="round" id="guessRound"></div>
    <h2>What is it?</h2>
    <label for="text" id="textLabel">Your guess</label>
    <input type="text" id="text" required maxlength="200" autocomplete="off">
    <label class="check"><input type="checkbox" id="owner"> This is my photo (I'm entering the real answer)</label>
    <button type="submit">Submit</button>
    <div class="note" id="guessStatus"></div>
  </form>

  <!-- Screen: submitted, waiting for reveal -->
  <div id="waiting" hidden>
    <div class="round" id="waitRound"></div>
    <div class="card">
      <div class="who" id="waitLabel"></div>
      <p class="big" id="waitText"></p>
    </div>
    <p class="note">Waiting for the host to reveal everyone's answers. <button class="link" id="changeBtn">Change my answer</button></p>
  </div>

  <!-- Screen: revealed -->
  <div id="revealed" hidden>
    <div class="round" id="revealRound"></div>
    <h2>The answers</h2>
    <ul class="answers" id="answers"></ul>
    <p class="note">Waiting for the next round.</p>
  </div>

  <section id="submittedSection" hidden>
    <strong>Submitted this round:</strong>
    <div class="chips" id="submitted"></div>
  </section>

  <div class="host" id="hostPanel" hidden>
    <strong>Host controls</strong><br>
    <button id="revealBtn">Reveal answers</button>
    <button class="secondary" id="nextBtn">Start next round</button>
    <button class="secondary" id="resetBtn">Reset rounds</button>
  </div>

  <section id="historySection" hidden>
    <strong>Past rounds</strong>
    <div id="history"></div>
  </section>
</main>
<script>
  const $ = id => document.getElementById(id);
  const theme = new URLSearchParams(location.search).get('theme') || 'pin';
  if (theme) document.body.classList.add('t-' + theme);
  const hostKey = new URLSearchParams(location.search).get('host');
  const myId = localStorage.ecuId || (localStorage.ecuId = crypto.randomUUID());
  let myName = localStorage.ecuName || '';
  let current = null;
  let editing = false; // true when the player chose "Change my answer"

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function answerList(answers) {
    return answers.map(a =>
      '<li class="' + (a.isOwner ? 'owner' : '') + '">' + esc(a.text) +
      '<div class="who">' + esc(a.name) + (a.isOwner ? '<span class="tag">REAL ANSWER</span>' : '') + '</div></li>'
    ).join('');
  }

  function show(screen) {
    for (const id of ['signin', 'guess', 'waiting', 'revealed']) $(id).hidden = id !== screen;
  }

  function render(s) {
    if (s) {
      if (current && s.roundId !== current.roundId) {
        editing = false;
        $('text').value = '';
        $('owner').checked = false;
        $('guessStatus').textContent = '';
        updateOwnerLabel();
      }
      current = s;
    }
    s = current;
    if (!s) return;

    const label = 'Round ' + s.round;
    $('guessRound').textContent = $('waitRound').textContent = $('revealRound').textContent = label;
    $('me').hidden = !myName;
    $('meName').textContent = myName;
    $('hostPanel').hidden = !hostKey || !myName;
    $('revealBtn').disabled = s.revealed;

    $('submittedSection').hidden = !myName || s.revealed;
    $('submitted').innerHTML = s.submitted.length
      ? s.submitted.map(n => '<span class="chip">' + esc(n) + '</span>').join('')
      : '<span class="note">Nobody yet</span>';

    $('historySection').hidden = !myName || !s.history.length;
    $('history').innerHTML = s.history.map(h =>
      '<details><summary>Round ' + h.number + (h.owner ? ': ' + esc(h.owner) + "'s photo" : '') + '</summary>' +
      '<ul class="answers">' + answerList(h.answers) + '</ul></details>'
    ).join('');

    if (!myName) return show('signin');
    if (s.revealed) {
      $('answers').innerHTML = s.answers.length ? answerList(s.answers) : '<li>No answers this round.</li>';
      return show('revealed');
    }
    if (s.mine && !editing) {
      $('waitLabel').textContent = s.mine.isOwner ? 'You entered the real answer' : 'Your guess';
      $('waitText').textContent = s.mine.text;
      return show('waiting');
    }
    show('guess');
  }

  async function poll() {
    try { render(await (await fetch('/state?id=' + myId, { cache: 'no-store' })).json()); } catch {}
  }
  poll();
  setInterval(poll, 1500);

  function updateOwnerLabel() {
    $('textLabel').textContent = $('owner').checked ? 'What it really is' : 'Your guess';
  }
  $('owner').onchange = updateOwnerLabel;

  $('signin').onsubmit = e => {
    e.preventDefault();
    myName = localStorage.ecuName = $('name').value.trim();
    if (myName) render();
  };

  $('switchBtn').onclick = () => {
    $('name').value = myName;
    myName = '';
    render();
    $('name').focus();
  };

  $('changeBtn').onclick = () => {
    editing = true;
    $('text').value = current.mine.text;
    $('owner').checked = current.mine.isOwner;
    updateOwnerLabel();
    render();
    $('text').focus();
  };

  $('guess').onsubmit = async e => {
    e.preventDefault();
    const r = await fetch('/submit', { method: 'POST', body: JSON.stringify({
      id: myId, name: myName, text: $('text').value, isOwner: $('owner').checked, round: current.round,
    })});
    if (!r.ok) { $('guessStatus').textContent = "That didn't go through. Try again."; return; }
    editing = false;
    render(await r.json());
  };

  const host = action => fetch('/host', { method: 'POST', body: JSON.stringify({ key: hostKey, action }) }).then(poll);
  $('revealBtn').onclick = () => host('reveal');
  $('nextBtn').onclick = () => host('next');
  $('resetBtn').onclick = () => {
    if (confirm('Clear every round and start over at Round 1?')) host('reset');
  };
</script>
</body></html>`;
