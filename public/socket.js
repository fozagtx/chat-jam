export function connectOverlaySocket(onEvent, onConnection) {
  const socket = new WebSocket(`ws://${location.host}/live`);
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
