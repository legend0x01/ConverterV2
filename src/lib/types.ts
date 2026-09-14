export interface OutputFile {
  name: string;
  blob: Blob;
  note?: string;
}

export interface JobResult {
  outputs: OutputFile[];
  ms: number;
  bytesIn: number;
  bytesOut: number;
}

export type Emit = (pct: number, label: string) => void;
