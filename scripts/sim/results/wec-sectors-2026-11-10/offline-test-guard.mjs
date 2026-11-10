// Test process only. Block all external requests, including unmocked collector.test fixtures.
import net from 'node:net';
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
 const first = args[0];
 const options = Array.isArray(first) ? first[0] : first;
 const host = typeof options === 'object' ? options.host : typeof args[1] === 'string' ? args[1] : 'localhost';
 if (!['localhost', '127.0.0.1', '::1'].includes(host || 'localhost')) throw new Error('Offline test guard: external socket blocked');
 return connect.apply(this, args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
 const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
 if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return Promise.reject(new Error('Offline test guard: external fetch blocked'));
 return originalFetch(input, init);
};
