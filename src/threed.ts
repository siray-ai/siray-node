import type { Siray } from './client';
import {
  BlockingRunOptions,
  TaskGenerationOptions,
  GenerationResponse,
  TaskStatus,
  SirayError,
} from './types';
import {
  GenerationResponseImpl,
  TaskStatusImpl,
  waitForTaskCompletion,
} from './task-utils';

export class ThreeD {
  constructor(private client: Siray) {}

  async generateAsync(options: TaskGenerationOptions): Promise<GenerationResponse> {
    const data = await this.client.post('/v1/3d/generations', options);
    return new GenerationResponseImpl(data);
  }

  async queryTask(taskId: string): Promise<TaskStatus> {
    const data = await this.client.get(`/v1/3d/generations/${taskId}`);
    return new TaskStatusImpl(data);
  }

  async run(
    options: TaskGenerationOptions,
    config: BlockingRunOptions = {}
  ): Promise<TaskStatus> {
    const response = await this.generateAsync(options);

    if (!response.task_id) {
      throw new SirayError('Task ID is missing from generation response');
    }

    return waitForTaskCompletion(this.queryTask.bind(this), response.task_id, config);
  }
}
