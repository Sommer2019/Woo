// Minimal MQTT 3.1.1 client over WebSocket (QoS 0 only) — used as a relay when
// a direct WebRTC connection between phone and TV can't be established
// (e.g. phone on mobile data, TV on Wi-Fi). Classic script: exposes window.WooMQTT.
(function (root) {
  'use strict';
  const BROKERS = root.WOO_MQTT_BROKERS || [
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://broker.emqx.io:8084/mqtt',
    'wss://test.mosquitto.org:8081/mqtt',
  ];
  const enc = new TextEncoder(), dec = new TextDecoder();

  function str(s) { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; }
  function packet(type, body) {
    const len = []; let n = body.length;
    do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
    return new Uint8Array([type, ...len, ...body]);
  }

  class Client {
    // opts: { onMessage(topic, string), onStatus(state), subscribe: [topics] }
    constructor(opts) {
      this.opts = opts;
      this.subs = new Set(opts.subscribe || []);
      this.brokerIndex = 0;
      this.connected = false;
      this.closed = false;
      this.buf = new Uint8Array(0);
      this.pid = 1;
      this.connect();
    }
    connect() {
      if (this.closed) return;
      const url = BROKERS[this.brokerIndex % BROKERS.length];
      let ws;
      try { ws = new WebSocket(url, 'mqtt'); } catch (e) { return this.retry(); }
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      const giveUp = setTimeout(() => { if (!this.connected) { try { ws.close(); } catch (e) {} } }, 6000);
      ws.onopen = () => {
        const id = 'woo' + Math.random().toString(36).slice(2, 12);
        ws.send(packet(0x10, [...str('MQTT'), 4, 0x02, 0, 30, ...str(id)]));
      };
      ws.onmessage = (ev) => this.data(new Uint8Array(ev.data));
      ws.onclose = ws.onerror = () => {
        clearTimeout(giveUp);
        if (this.ws !== ws) return;
        const was = this.connected;
        this.connected = false;
        clearInterval(this.ping);
        if (this.closed) return;
        if (was && this.opts.onStatus) this.opts.onStatus('lost');
        if (!was) this.brokerIndex++;
        this.retry();
      };
    }
    retry() { if (!this.closed) setTimeout(() => this.connect(), 1500); }
    data(chunk) {
      const b = new Uint8Array(this.buf.length + chunk.length);
      b.set(this.buf); b.set(chunk, this.buf.length);
      this.buf = b;
      for (;;) {
        if (this.buf.length < 2) return;
        let mult = 1, len = 0, i = 1, byte;
        do { if (i >= this.buf.length) return; byte = this.buf[i++]; len += (byte & 127) * mult; mult *= 128; } while (byte & 128);
        if (this.buf.length < i + len) return;
        const type = this.buf[0] >> 4, body = this.buf.subarray(i, i + len);
        this.buf = this.buf.slice(i + len);
        this.handle(type, body, this.buf[0]);
      }
    }
    handle(type, body) {
      if (type === 2) { // CONNACK
        if (body[1] !== 0) { this.ws.close(); return; }
        this.connected = true;
        for (const t of this.subs) this.sendSub(t);
        clearInterval(this.ping);
        this.ping = setInterval(() => { try { this.ws.send(new Uint8Array([0xC0, 0])); } catch (e) {} }, 20000);
        if (this.opts.onStatus) this.opts.onStatus('ready');
      } else if (type === 3) { // PUBLISH (qos 0)
        const tl = (body[0] << 8) | body[1];
        const topic = dec.decode(body.subarray(2, 2 + tl));
        const payload = dec.decode(body.subarray(2 + tl));
        if (this.opts.onMessage) this.opts.onMessage(topic, payload);
      }
    }
    sendSub(topic) {
      const id = this.pid = (this.pid % 65000) + 1;
      this.ws.send(packet(0x82, [id >> 8, id & 255, ...str(topic), 0]));
    }
    subscribe(topic) { this.subs.add(topic); if (this.connected) this.sendSub(topic); }
    unsubscribe(topic) {
      this.subs.delete(topic);
      if (!this.connected) return;
      const id = this.pid = (this.pid % 65000) + 1;
      this.ws.send(packet(0xA2, [id >> 8, id & 255, ...str(topic)]));
    }
    publish(topic, text) {
      if (!this.connected) return false;
      try { this.ws.send(packet(0x30, [...str(topic), ...enc.encode(text)])); return true; } catch (e) { return false; }
    }
    close() { this.closed = true; this.connected = false; clearInterval(this.ping); try { this.ws.send(new Uint8Array([0xE0, 0])); this.ws.close(); } catch (e) {} }
  }

  root.WooMQTT = { Client, topic: (code) => 'woo-console/v1/' + code };
})(typeof window !== 'undefined' ? window : globalThis);
