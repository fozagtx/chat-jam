export function encodeWav(buffer, info = {}) {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const dataSize = length * channels * 2;
  const infoChunks = Object.entries(info).map(([id, text]) => {
    if (id.length !== 4) throw new Error('WAV INFO chunk IDs must be four characters');
    const textBytes = new TextEncoder().encode(text);
    const data = new Uint8Array(textBytes.length + 1);
    data.set(textBytes);
    return { id, data };
  });
  const listPayloadSize = infoChunks.length
    ? 4 +
      infoChunks.reduce(
        (size, chunk) => size + 8 + chunk.data.length + (chunk.data.length % 2),
        0,
      )
    : 0;
  const listChunkSize = listPayloadSize ? 8 + listPayloadSize : 0;
  const output = new ArrayBuffer(44 + listChunkSize + dataSize);
  const view = new DataView(output);
  const writeId = (offset, value) => {
    [...value].forEach((character, index) => {
      view.setUint8(offset + index, character.charCodeAt(0));
    });
  };

  writeId(0, 'RIFF');
  view.setUint32(4, output.byteLength - 8, true);
  writeId(8, 'WAVE');
  writeId(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);

  let offset = 36;
  if (listPayloadSize) {
    writeId(offset, 'LIST');
    view.setUint32(offset + 4, listPayloadSize, true);
    writeId(offset + 8, 'INFO');
    offset += 12;
    for (const chunk of infoChunks) {
      writeId(offset, chunk.id);
      view.setUint32(offset + 4, chunk.data.length, true);
      new Uint8Array(output, offset + 8, chunk.data.length).set(chunk.data);
      offset += 8 + chunk.data.length;
      if (chunk.data.length % 2) {
        view.setUint8(offset, 0);
        offset += 1;
      }
    }
  }

  writeId(offset, 'data');
  view.setUint32(offset + 4, dataSize, true);
  offset += 8;
  const channelData = Array.from({ length: channels }, (_, index) =>
    buffer.getChannelData(index),
  );
  for (let frame = 0; frame < length; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 32_768 : sample * 32_767, true);
      offset += 2;
    }
  }
  return output;
}
