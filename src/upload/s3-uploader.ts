import { S3Client, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import type { FileHandle } from 'fs/promises';
import { FileUploadConfig, SirayError } from '../types';

export class S3Uploader {
  private static readonly MULTIPART_THRESHOLD = 8 * 1024 * 1024; // 8MB
  private static readonly CHUNK_SIZE = 8 * 1024 * 1024; // 8MB

  private s3Client: S3Client;
  private bucketName: string;
  private accessEndpoint?: string;

  constructor(config: FileUploadConfig) {
    this.bucketName = config.bucketName;
    this.accessEndpoint = config.accessEndpoint;

    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      },
      region: config.region,
      endpoint: config.endpointUrl,
      forcePathStyle: true,
    });
  }

  async uploadFile(filePath: string, objectKey: string, contentType?: string): Promise<string> {
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;

    if (fileSize > S3Uploader.MULTIPART_THRESHOLD) {
      return this.multipartUpload(filePath, objectKey, contentType);
    } else {
      return this.simpleUpload(filePath, objectKey, contentType);
    }
  }

  private async simpleUpload(filePath: string, objectKey: string, contentType?: string): Promise<string> {
    const fileContent = await fs.readFile(filePath);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      Body: fileContent,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    return this.getObjectUrl(objectKey);
  }

  private async multipartUpload(filePath: string, objectKey: string, contentType?: string): Promise<string> {
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    const createResponse = await this.s3Client.send(createCommand);
    const uploadId = createResponse.UploadId;

    if (!uploadId) {
      throw new SirayError('Failed to create multipart upload: missing upload ID');
    }

    const parts: Array<{ PartNumber: number; ETag: string }> = [];
    let partNumber = 1;
    let fileHandle: FileHandle | null = null;

    try {
      fileHandle = await fs.open(filePath, 'r');
      const buffer = Buffer.allocUnsafe(S3Uploader.CHUNK_SIZE);

      while (true) {
        const { bytesRead } = await fileHandle.read(buffer, 0, S3Uploader.CHUNK_SIZE);
        if (bytesRead === 0) break;

        const chunk = buffer.slice(0, bytesRead);

        const uploadCommand = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          PartNumber: partNumber,
          UploadId: uploadId,
          Body: chunk,
        });

        const uploadResponse = await this.s3Client.send(uploadCommand);

        if (!uploadResponse.ETag) {
          throw new SirayError(`Failed to upload part ${partNumber}: missing ETag`);
        }

        parts.push({
          PartNumber: partNumber,
          ETag: uploadResponse.ETag,
        });

        partNumber++;
      }

      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      });

      await this.s3Client.send(completeCommand);
      return this.getObjectUrl(objectKey);

    } catch (error) {
      // Abort multipart upload, but preserve original error
      try {
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          UploadId: uploadId,
        });
        await this.s3Client.send(abortCommand);
      } catch (abortError) {
        // Log abort error but don't throw it
        console.error('Failed to abort multipart upload:', abortError);
      }
      throw error;
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }
    }
  }

  private getObjectUrl(objectKey: string): string {
    if (this.accessEndpoint) {
      const endpoint = this.accessEndpoint.startsWith('http')
        ? this.accessEndpoint
        : `https://${this.accessEndpoint}`;
      return `${endpoint.replace(/\/$/, '')}/${objectKey}`;
    }

    return `https://${this.bucketName}.s3.amazonaws.com/${objectKey}`;
  }
}
