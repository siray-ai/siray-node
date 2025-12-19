export interface SirayOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
}

export interface SirayError extends Error {
  status?: number;
  code?: string;
  response?: any;
}

export class SirayError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public response?: any
  ) {
    super(message);
    this.name = 'SirayError';
    Object.setPrototypeOf(this, SirayError.prototype);
  }
}

export interface ImageGenerationOptions {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  response_format?: 'url' | 'b64_json';
  [key: string]: any; // Allow additional model-specific parameters
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export interface TaskGenerationOptions {
  model: string;
  prompt: string;
  [key: string]: any; // Allow additional model-specific parameters
}

export interface GenerationResponse {
  task_id: string;
  raw_response?: any;
}

export interface BlockingRunOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface TaskStatus {
  code: string;
  message: string;
  task_id: string;
  action: string;
  status: string;
  outputs: string[];
  fail_reason?: string;
  progress?: string;
  submit_time?: number;
  start_time?: number;
  finish_time?: number;
  raw_response?: any;
  result?: string;
  progressPercent?: number;
  isCompleted(): boolean;
  isFailed(): boolean;
  isProcessing(): boolean;
}
