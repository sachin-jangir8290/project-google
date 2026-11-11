// RideLine group-ride relay. Rooms live in memory only; nothing is written to disk.
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = +process.env.PORT || 8787;
const HOST = process.env.HOST || '127.0.0.1';
const MAX_ROOM = 30, MAX_MSGS = 50, MAX_TEXT = 200;
const rooms = new Map(); // code -> { members: Map(id -> {ws, info}), watchers: Set(ws), msgs: [] }
const REPORTS = new Set(['pothole', 'accident', 'checkpost', 'water', 'block', 'animal']);

const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, '').slice(0, n);
const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? v : null);
const color = c => (/^#[0-9a-f]{6}$/i.test(c) ? c : '#d6f53f');

function broadcast(room, msg, except) {
  const data = JSON.stringify(msg);
  for (const [id, m] of room.members) if (id !== except && m.ws.readyState === 1) m.ws.send(data);
  for (const w of room.watchers) if (w.readyState === 1) w.send(data);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`RideLine group server · ${rooms.size} active groups\n`);
});
const wss = new WebSocketServer({ server, maxPayload: 4096 });

wss.on('connection', ws => {
  let room = null, id = null, code = null, tokens = 20, last = Date.now(), watching = false;
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', raw => {
    // simple rate limit: ~5 messages per second with a burst of 20
    const now = Date.now(); tokens = Math.min(20, tokens + (now - last) / 200); last = now;
    if (tokens < 1) return; tokens--;
    let m; try { m = JSON.parse(raw); } catch { return; }

    // family viewer: read-only, not shown as a rider
    if (m.t === 'watch' && !room) {
      code = clean(m.room, 8).toUpperCase();
      if (!/^[A-Z0-9]{4,8}$/.test(code)) return ws.close(1008, 'bad code');
      room = rooms.get(code);
      if (!room) { ws.send(JSON.stringify({ t: 'state', members: [], msgs: [], offline: true })); room = { members: new Map(), watchers: new Set(), msgs: [] }; rooms.set(code, room); }
      if (room.watchers.size >= 50) return ws.close(1008, 'too many viewers');
      watching = true; room.watchers.add(ws);
      ws.send(JSON.stringify({ t: 'state', members: [...room.members.values()].map(x => x.info), msgs: room.msgs.slice(-10) }));
      return;
    }
    if (watching) return;
    if (m.t === 'join' && !room) {
      code = clean(m.room, 8).toUpperCase(); id = clean(m.id, 16);
      if (!/^[A-Z0-9]{4,8}$/.test(code) || !/^[a-z0-9]{4,16}$/i.test(id)) return ws.close(1008, 'bad join');
      room = rooms.get(code) || { members: new Map(), watchers: new Set(), msgs: [] };
      if (!rooms.has(code)) rooms.set(code, room);
      if (room.members.size >= MAX_ROOM && !room.members.has(id)) return ws.close(1008, 'group full');
      const old = room.members.get(id); if (old && old.ws !== ws) try { old.ws.close(); } catch {}
      const info = { id, name: clean(m.name, 30) || 'Rider', color: color(m.color) };
      room.members.set(id, { ws, info });
      ws.send(JSON.stringify({ t: 'state', members: [...room.members.values()].map(x => x.info), msgs: room.msgs }));
      broadcast(room, { t: 'join', ...info }, id);
      return;
    }
    if (!room) return;
    const me = room.members.get(id); if (!me || me.ws !== ws) return;

    if (m.t === 'pos') {
      const lat = num(m.lat, -90, 90), lng = num(m.lng, -180, 180);
      Object.assign(me.info, {
        lat, lng, spd: num(m.spd, 0, 400) || 0, dist: num(m.dist, 0, 1e7) || 0, riding: !!m.riding,
        name: clean(m.name, 30) || me.info.name, color: color(m.color || me.info.color), dest: clean(m.dest, 60), at: Date.now(),
      });
      broadcast(room, { t: 'pos', ...me.info }, id);
    } else if (m.t === 'msg') {
      const text = clean(m.text, MAX_TEXT).trim(); if (!text) return;
      const msg = { t: 'msg', id, name: me.info.name, text, ts: Date.now() };
      const r = m.rep;
      if (r && REPORTS.has(r.k) && Array.isArray(r.ll) && num(r.ll[0], -90, 90) != null && num(r.ll[1], -180, 180) != null)
        msg.rep = { k: r.k, ll: [r.ll[0], r.ll[1]], t: Date.now() };
      const mt = m.meet;
      if (mt && Array.isArray(mt.ll) && num(mt.ll[0], -90, 90) != null && num(mt.ll[1], -180, 180) != null)
        msg.meet = { ll: [mt.ll[0], mt.ll[1]] };
      room.msgs.push(msg); if (room.msgs.length > MAX_MSGS) room.msgs.shift();
      broadcast(room, msg);
    } else if (m.t === 'sos') {
      broadcast(room, { t: 'sos', id, name: me.info.name, lat: num(m.lat, -90, 90), lng: num(m.lng, -180, 180), crash: !!m.crash, ts: Date.now() }, id);
    } else if (m.t === 'leave') {
      ws.close();
    }
  });

  ws.on('close', () => {
    if (!room) return;
    if (watching) { room.watchers.delete(ws); if (!room.members.size && !room.watchers.size) rooms.delete(code); return; }
    const cur = room.members.get(id);
    if (cur && cur.ws === ws) { room.members.delete(id); broadcast(room, { t: 'leave', id }); }
    if (!room.members.size && !room.watchers.size) rooms.delete(code);
  });
});

// drop dead connections every 30 s
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 30000);

server.listen(PORT, HOST, () => console.log(`RideLine group server on ${HOST}:${PORT}`));
