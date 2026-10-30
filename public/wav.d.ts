export function encodeWav(buffer: { numberOfChannels:number; length:number; sampleRate:number; getChannelData(channel:number):Float32Array }): ArrayBuffer;
