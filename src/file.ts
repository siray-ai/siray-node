import { promises as fs } from 'fs';
import path from 'path';
import { STSTokenResponse, SirayError } from './types';
import { S3Uploader } from './upload/s3-uploader';

export class File {
  constructor(private makeRequest: (endpoint: string, options?: any) => Promise<any>) {}

  private async getSTSToken(): Promise<STSTokenResponse['data']> {
    const response = await this.makeRequest('/api/model-verse/sts-token', {
      method: 'POST',
    });

    const data = response.data;
    if (!data) {
      throw new SirayError('Invalid STS token response: missing data field');
    }

    return data;
  }

  async upload(filePath: string): Promise<string> {
    // Validate file exists
    const resolvedPath = path.resolve(filePath);
    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isFile()) {
        throw new SirayError(`Path is not a file: ${filePath}`);
      }
    } catch (error: unknown) {
      if (error instanceof SirayError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new SirayError(`Failed to access file ${filePath}: ${message}`);
    }

    // Get STS token
    const stsData = await this.getSTSToken();

    const { credentials, bucket_name, upload_path, upload_endpoint, access_endpoint } = stsData;

    if (!credentials || !bucket_name) {
      throw new SirayError('Invalid STS token response: missing credentials or bucket_name');
    }

    if (!upload_endpoint) {
      throw new SirayError('Invalid STS token response: missing upload_endpoint');
    }

    // Determine object key
    const filename = path.basename(resolvedPath);
    const cleanUploadPath = upload_path.replace(/^\//, '');
    const objectKey = path.join(cleanUploadPath, filename).replace(/\\/g, '/');

    // Infer content type
    const extension = path.extname(resolvedPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.avif': 'image/avif',
      '.heic': 'image/heic',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
    };
    const contentType = mimeTypes[extension] || 'application/octet-stream';

    // Create uploader and upload
    const uploader = new S3Uploader({
      accessKeyId: credentials.access_key_id,
      secretAccessKey: credentials.access_key_secret,
      sessionToken: credentials.security_token,
      region: credentials.region || 'cn-bj',
      bucketName: bucket_name,
      endpointUrl: upload_endpoint,
      accessEndpoint: access_endpoint,
    });

    return uploader.uploadFile(resolvedPath, objectKey, contentType);
  }
}
