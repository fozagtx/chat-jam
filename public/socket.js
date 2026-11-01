export function connectOverlaySocket(onEvent, onConnection) {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${location.host}/live`);
  socket.addEventListener('open', () => onConnection(true));
  socket.addEventListener('close', () => onConnection(false));
  socket.addEventListener('message', (message) => {
    try {
      onEvent(JSON.parse(message.data));
    } catch {
      // Ignore malformed local messages and keep the overlay connected.
    }
  });
  return socket;
}
