import { useEffect, useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import { readQR, type Card } from './model';
import { validPlaybackFeedback, type PlaybackFeedback } from './playback';
export type Command = 'pause' | 'resume' | 'stop';
type Packet = {
  v: 1;
  type: 'card' | 'command' | 'ack' | 'ping' | 'pong' | 'playback';
  token: string;
  id: string;
  card?: Card;
  command?: Command;
  playback?: PlaybackFeedback;
};
export function useConnection(
  onCard: (c: Card) => void,
  onCommand: (c: Command) => void,
  onPlayback?: (feedback: PlaybackFeedback) => void,
) {
  const [status, setStatus] = useState('Rozłączono'),
    [connected, setConnected] = useState(false),
    [pairUrl, setPairUrl] = useState(''),
    [ack, setAck] = useState('');
  const peer = useRef<Peer | null>(null),
    connection = useRef<DataConnection | null>(null),
    token = useRef(''),
    seen = useRef(new Set<string>()),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    lastPong = useRef(0);
  const handlers = useRef({ onCard, onCommand, onPlayback });
  handlers.current = { onCard, onCommand, onPlayback };
  function clear() {
    clearTimeout(timer.current);
    connection.current?.close();
    peer.current?.destroy();
    peer.current = null;
    connection.current = null;
    setConnected(false);
    setPairUrl('');
    seen.current.clear();
    setAck('');
  }
  function disconnect() {
    clear();
    token.current = '';
    setStatus('Rozłączono');
  }
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      connection.current?.close();
      peer.current?.destroy();
    },
    [],
  );
  useEffect(() => {
    if (!connected) return;
    lastPong.current = Date.now();
    const t = setInterval(() => {
      if (Date.now() - lastPong.current > 18000) {
        disconnect();
        setStatus('Utracono połączenie. Sparuj urządzenia ponownie.');
        return;
      }
      connection.current?.send({
        v: 1,
        type: 'ping',
        token: token.current,
        id: crypto.randomUUID(),
      });
    }, 5000);
    return () => clearInterval(t);
  }, [connected]);
  function bind(conn: DataConnection) {
    conn.on('open', () => {
      if (connection.current !== conn) return;
      clearTimeout(timer.current);
      setConnected(true);
      setStatus('Połączono');
      lastPong.current = Date.now();
    });
    conn.on('close', () => {
      if (connection.current === conn) {
        setConnected(false);
        connection.current = null;
        setStatus('Urządzenie rozłączone. Sparuj ponownie.');
      }
    });
    conn.on('error', () => {
      setConnected(false);
      setStatus('Błąd połączenia. Spróbuj ponownie.');
    });
    conn.on('data', (raw) => {
      const p = raw as Packet;
      if (
        !p ||
        p.v !== 1 ||
        p.token !== token.current ||
        typeof p.id !== 'string' ||
        p.id.length > 100
      )
        return;
      lastPong.current = Date.now();
      if (p.type === 'ping') {
        conn.send({ ...p, type: 'pong' });
        return;
      }
      if (p.type === 'pong') return;
      if (p.type === 'playback') {
        if (validPlaybackFeedback(p.playback)) handlers.current.onPlayback?.(p.playback);
        return;
      }
      if (p.type === 'ack') {
        setAck('Polecenie dotarło do odtwarzacza');
        return;
      }
      if (seen.current.has(p.id)) return;
      seen.current.add(p.id);
      if (seen.current.size > 500) seen.current.delete(seen.current.values().next().value!);
      try {
        if (p.type === 'card' && p.card) {
          const qr = readQR(
            location.origin + location.pathname + '#card=' + btoa(JSON.stringify(p.card)),
          );
          if (qr.kind === 'card') handlers.current.onCard(qr.card);
        } else if (p.type === 'command' && ['pause', 'resume', 'stop'].includes(p.command || ''))
          handlers.current.onCommand(p.command!);
        else return;
        conn.send({ v: 1, type: 'ack', id: p.id, token: token.current });
      } catch {
        setStatus('Odrzucono nieprawidłową kartę.');
      }
    });
  }
  function createPeer() {
    const env = import.meta.env;
    const p = new Peer(
      env.VITE_PEER_HOST
        ? {
            host: env.VITE_PEER_HOST,
            port: Number(env.VITE_PEER_PORT) || 443,
            path: env.VITE_PEER_PATH || '/',
            secure: true,
            debug: 0,
          }
        : { debug: 0 },
    );
    peer.current = p;
    p.on('error', () => {
      setConnected(false);
      setStatus('Nie udało się połączyć urządzeń. Sprawdź internet i spróbuj ponownie.');
    });
    p.on('disconnected', () => {
      if (!connection.current?.open) setStatus('Brak połączenia z usługą parowania.');
    });
    return p;
  }
  function host() {
    clear();
    token.current = crypto.randomUUID().replace(/-/g, '');
    setStatus('Przygotowuję kod parowania…');
    const p = createPeer();
    p.on('open', (id) => {
      setPairUrl(location.origin + location.pathname + `#pair=${id}&token=${token.current}`);
      setStatus('Czekam na skaner');
    });
    p.on('connection', (conn) => {
      if (conn.metadata?.token !== token.current || connection.current?.open) {
        conn.close();
        return;
      }
      connection.current = conn;
      bind(conn);
    });
  }
  function join(id: string, secret: string) {
    clear();
    token.current = secret;
    setStatus('Łączę z odtwarzaczem…');
    const p = createPeer();
    timer.current = setTimeout(() => {
      clear();
      setStatus('Nie udało się połączyć. Wygeneruj nowy QR w odtwarzaczu.');
    }, 20000);
    p.on('open', () => {
      const conn = p.connect(id, { reliable: true, metadata: { token: secret } });
      connection.current = conn;
      bind(conn);
    });
  }
  function send(card?: Card, command?: Command) {
    if (!connection.current?.open) {
      setStatus('Najpierw zeskanuj QR parowania z odtwarzacza.');
      return false;
    }
    setAck('Wysyłam polecenie…');
    connection.current.send({
      v: 1,
      type: card ? 'card' : 'command',
      token: token.current,
      id: crypto.randomUUID(),
      card,
      command,
    });
    return true;
  }
  function reportPlayback(playback: PlaybackFeedback) {
    if (connection.current?.open && validPlaybackFeedback(playback))
      connection.current.send({
        v: 1,
        type: 'playback',
        token: token.current,
        id: crypto.randomUUID(),
        playback,
      });
  }
  return { status, connected, pairUrl, ack, host, join, disconnect, send, reportPlayback };
}
