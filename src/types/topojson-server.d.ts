declare module 'topojson-server' {
  export function topology(objects: Record<string, unknown>, quantization?: number): any;
}
