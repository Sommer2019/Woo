// Host-side transport for the TV page.
// Phones connect over WebRTC via the free PeerJS cloud broker.
// A BroadcastChannel transport is also opened so a remote in another tab of
// the same browser works without any network (handy for testing).

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PEER_PREFIX = 'woo-tv-';

function randomCode(n = 4) {
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export class Host {
  constructor({ onMessage, onClose, onStatus }) {
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.onStatus = onStatus || (() => {});
    this.links = new Map(); // linkId -> { send(obj), kind }
    this.code = null;
  }

  start() {
    let code = null;
    try { code = sessionStorage.getItem('woo-code'); } catch (e) {}
    this.code = code || randomCode();
    try { sessionStorage.setItem('woo-code', this.code); } catch (e) {}
    this.openBroadcast();
    this.openRelay();
    this.openPeer(0);
  }

  // Relay over public MQTT brokers: works when WebRTC can't get through (mobile data etc.)
  openRelay() {
    if (typeof WooMQTT === 'undefined') return;
    if (this.mq) this.mq.close();
    const base = WooMQTT.topic(this.code);
    const mq = new WooMQTT.Client({
      subscribe: [base + '/up'],
      onMessage: (topic, text) => {
        let m; try { m = JSON.parse(text); } catch (e) { return; }
        const { from, d } = m || {};
        if (!from) return;
        const id = 'mq:' + from;
        if (!this.links.has(id)) this.links.set(id, { kind: 'relay', send: (obj) => mq.publish(base + '/down/' + from, JSON.stringify(obj)) });
        if (d && d.t === 'bye') { this.links.delete(id); this.onClose(id); return; }
        this.onMessage(id, d);
      },
    });
    this.mq = mq;
  }

  openBroadcast() {
    if (!('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel('woo-' + this.code);
    bc.onmessage = (ev) => {
      const { from, d } = ev.data || {};
      if (!from) return;
      const id = 'bc:' + from;
      if (!this.links.has(id)) {
        this.links.set(id, { kind: 'local', send: (obj) => bc.postMessage({ to: from, d: obj }) });
      }
      if (d && d.t === 'bye') { this.links.delete(id); this.onClose(id); return; }
      this.onMessage(id, d);
    };
    this.bc = bc;
  }

  openPeer(attempt) {
    if (typeof Peer === 'undefined') { this.onStatus('error', 'PeerJS failed to load — only same-browser remotes will work.'); return; }
    const peer = new Peer(PEER_PREFIX + this.code, { debug: 0 });
    this.peer = peer;
    peer.on('open', () => this.onStatus('ready', 'Ready! Remotes can connect now.'));
    peer.on('disconnected', () => {
      this.onStatus('warn', 'Lost the matchmaking cloud, reconnecting…');
      setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500);
    });
    peer.on('error', (err) => {
      if (err && err.type === 'unavailable-id' && attempt < 5) {
        // Somebody else owns this code; take a new one.
        peer.destroy();
        this.code = randomCode();
        try { sessionStorage.setItem('woo-code', this.code); } catch (e) {}
        if (this.bc) this.bc.close();
        this.openBroadcast();
        this.openRelay();
        this.onStatus('code', this.code);
        this.openPeer(attempt + 1);
        return;
      }
      if (err && (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error')) {
        this.onStatus('warn', 'Network trouble (' + err.type + '), retrying…');
        setTimeout(() => { if (peer.destroyed) return; try { peer.reconnect(); } catch (e) {} }, 3000);
        return;
      }
      console.warn('peer error', err);
    });
    peer.on('connection', (conn) => {
      const id = 'p2p:' + conn.peer;
      conn.on('open', () => {
        this.links.set(id, { kind: 'p2p', send: (obj) => { try { conn.send(obj); } catch (e) {} } });
      });
      conn.on('data', (d) => {
        if (!this.links.has(id)) this.links.set(id, { kind: 'p2p', send: (obj) => { try { conn.send(obj); } catch (e) {} } });
        this.onMessage(id, d);
      });
      const closed = () => { if (this.links.delete(id)) this.onClose(id); };
      conn.on('close', closed);
      conn.on('error', closed);
    });
  }

  send(linkId, obj) {
    const l = this.links.get(linkId);
    if (l) l.send(obj);
  }

  remoteUrl() {
    const base = location.href.replace(/[#?].*$/, '').replace(/index\.html$/, '');
    return base + 'remote/?c=' + this.code;
  }
}
