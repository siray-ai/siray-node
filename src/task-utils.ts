import {
  BlockingRunOptions,
  GenerationResponse,
  SirayError,
  TaskStatus,
} from './types';

export class GenerationResponseImpl implements GenerationResponse {
  task_id: string;
  raw_response?: any;

  constructor(data: any) {
    this.task_id = data.task_id || data.id || '';
    this.raw_response = data;
  }
}

export class TaskStatusImpl implements TaskStatus {
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

  constructor(data: any) {
    this.raw_response = data;

    // Extract top-level fields
    this.code = data.code || 'unknown';
    this.message = data.message || '';

    // Extract task data from nested 'data' field
    const taskData = data.data || {};
    this.task_id = taskData.task_id || '';
    this.action = taskData.action || '';
    this.status = taskData.status || 'UNKNOWN';
    this.outputs = taskData.outputs || [];
    this.fail_reason = taskData.fail_reason;
    this.progress = taskData.progress;
    this.submit_time = taskData.submit_time;
    this.start_time = taskData.start_time;
    this.finish_time = taskData.finish_time;
  }

  get result(): string | undefined {
    return this.outputs[0];
  }

  get progressPercent(): number | undefined {
    if (this.progress) {
      try {
        return parseInt(this.progress.replace('%', ''));
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }

  isCompleted(): boolean {
    return ['SUCCESS'].includes(this.status.toUpperCase());
  }

  isFailed(): boolean {
    return ['FAILURE'].includes(this.status.toUpperCase());
  }

  isProcessing(): boolean {
    return ['NOT_START', 'SUBMITTED', 'QUEUED', 'IN_PROGRESS'].includes(this.status.toUpperCase());
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function waitForTaskCompletion(
  fetchStatus: (taskId: string) => Promise<TaskStatus>,
  taskId: string,
  options: BlockingRunOptions = {}
): Promise<TaskStatus> {
  const { pollIntervalMs = 2000, timeoutMs = 5 * 60 * 1000 } = options;
  const start = Date.now();
  let lastStatus: TaskStatus | undefined;

  while (true) {
    const status = await fetchStatus(taskId);
    lastStatus = status;

    if (status.isCompleted() || status.isFailed()) {
      return status;
    }

    if (Date.now() - start > timeoutMs) {
      throw new SirayError(
        'Task run timed out while waiting for completion',
        408,
        'TASK_TIMEOUT',
        lastStatus?.raw_response
      );
    }

    await delay(pollIntervalMs);
  }
}
