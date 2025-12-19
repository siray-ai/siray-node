import fetch, { RequestInit } from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { SirayOptions, SirayError } from './types';
import { Image } from './image';
import { Video } from './video';

const MIME_TYPE_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  heic: 'image/heic',
};

export class Siray {
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  public readonly image: Image;
  public readonly video: Video;

  constructor(options: SirayOptions = {}) {
    this.apiKey = options.apiKey || process.env.SIRAY_API_KEY || '';
    if (!this.apiKey) {
      throw new SirayError('API key is required. Provide it via options.apiKey or set SIRAY_API_KEY environment variable.');
    }
    this.baseURL =
      options.baseURL ||
      'https://api.siray.ai';
    this.timeout = options.timeout || 30000;

    this.image = new Image(this);
    this.video = new Video(this);
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | {
              error?: {
                message?: string;
                code?: string;
              };
              [key: string]: any;
            }
          | null;
        throw new SirayError(
          errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData?.error?.code,
          errorData
        );
      }

      return await response.json();
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof SirayError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new SirayError('Request timeout');
      }

      if (error instanceof Error) {
        throw new SirayError(`Network error: ${error.message}`);
      }

      throw new SirayError('Network error: Unknown error object received');
    }
  }

  public async post(endpoint: string, data: any): Promise<any> {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async get(endpoint: string): Promise<any> {
    return this.makeRequest(endpoint, {
      method: 'GET',
    });
  }

  public async loadFromLocal(filePath: string): Promise<string> {
    if (!filePath) {
      throw new SirayError('File path must be a non-empty string');
    }

    const resolvedPath = path.resolve(filePath);
    const extension = path.extname(resolvedPath).replace('.', '').toLowerCase();
    const mimeType = MIME_TYPE_MAP[extension];

    if (!mimeType) {
      throw new SirayError(`Unsupported or unknown file type: ${extension || 'unknown'}`);
    }

    try {
      const fileBuffer = await fs.readFile(resolvedPath);
      const base64Content = fileBuffer.toString('base64');
      return `data:${mimeType};base64,${base64Content}`;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new SirayError(`Failed to load local file: ${error.message}`);
      }

      throw new SirayError('Failed to load local file: Unknown error object received');
    }
  }
}
