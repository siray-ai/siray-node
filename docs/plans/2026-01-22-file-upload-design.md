# File Upload Feature Design

**Date:** 2026-01-22  
**Status:** Approved  
**Reference:** siray-python SDK implementation

## Overview

Implement S3-based file upload functionality for the Siray Node.js SDK, matching the architecture and capabilities of the Python SDK. This enables users to upload local files to Siray storage and use them in image/video generation workflows.

## Architecture

### Core Components

1. **File Resource** (`src/file.ts`)
   - Main public API for file uploads
   - Handles STS token fetching from gateway
   - Orchestrates upload process
   - Returns accessible URL for uploaded files

2. **S3 Uploader** (`src/upload/s3-uploader.ts`)
   - Handles S3 upload operations
   - Automatic multipart upload for large files (>8MB)
   - Simple PUT upload for smaller files (≤8MB)
   - Multipart chunk size: 8MB

3. **Gateway Client**
   - Separate HTTP client for STS token endpoint
   - Uses API-KEY authentication (vs Bearer for main API)
   - Endpoint: `https://api-gateway.siray.ai` (configurable)

4. **Dependencies**
   - `@aws-sdk/client-s3`: AWS SDK v3 for S3 operations
   - Required dependency (not optional)

### Authentication Flow

1. User calls `client.file.upload(filePath)`
2. File resource requests STS token from gateway endpoint (`/api/model-verse/sts-token`)
3. Gateway returns temporary credentials, bucket info, upload path, and endpoints
4. S3 Uploader uses credentials to upload file
5. Returns accessible URL for the uploaded file

### Upload Strategy

- **Small files (≤8MB)**: Simple PUT upload
- **Large files (>8MB)**: Multipart upload with 8MB chunks
- **MIME type**: Auto-detected from file extension
- **S3 Compatibility**: Supports custom endpoints (e.g., UCloud US3)
- **Security**: SSL verification enabled by default

## API Interface

### Client Configuration

```typescript
export interface SirayOptions {
  apiKey?: string;
  baseURL?: string;        // For image/video API (default: https://api.siray.ai)
  gatewayURL?: string;     // For STS token endpoint (default: https://api-gateway.siray.ai)
  timeout?: number;
}
```

### Public API

```typescript
const client = new Siray({
  apiKey: 'your-api-key',
  gatewayURL: 'https://api-gateway.siray.ai' // optional
});

// Upload a file
const url = await client.file.upload('path/to/image.jpg');
// Returns: https://cdn.siray.ai/uploads/abc123/image.jpg

// Use uploaded file in generation
const result = await client.image.generateAsync({
  model: 'flux-1.1-pro',
  prompt: 'enhance this image',
  image: url
});
```

## Implementation Details

### File Resource Class

```typescript
class File {
  constructor(private gatewayClient: BaseClient) {}
  
  private async getSTSToken(): Promise<STSTokenData>
  
  async upload(filePath: string): Promise<string> {
    // 1. Validate file exists
    // 2. Get STS token from gateway
    // 3. Extract credentials and bucket info
    // 4. Determine object key: {upload_path}/{filename}
    // 5. Detect MIME type
    // 6. Create S3Uploader with credentials
    // 7. Upload file and return URL
  }
}
```

### S3Uploader Class

```typescript
class S3Uploader {
  private static MULTIPART_THRESHOLD = 8 * 1024 * 1024; // 8MB
  private static CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
  
  constructor(config: FileUploadConfig) {
    // Create S3Client with:
    // - Temporary credentials (accessKeyId, secretAccessKey, sessionToken)
    // - Custom endpoint support
    // - Path-style addressing (forcePathStyle: true)
    // - SSL verification enabled
  }
  
  async uploadFile(filePath: string, objectKey: string, contentType?: string): Promise<string> {
    // Check file size
    // If > MULTIPART_THRESHOLD: multipart upload
    // Else: simple upload
  }
  
  private async simpleUpload(...): Promise<string> {
    // Use PutObjectCommand
    // Return URL
  }
  
  private async multipartUpload(...): Promise<string> {
    // 1. Create multipart upload
    // 2. Upload parts in 8MB chunks
    // 3. Complete multipart upload
    // 4. On error: abort multipart upload (cleanup)
    // 5. Return URL
  }
  
  private getObjectUrl(objectKey: string): string {
    // Priority:
    // 1. Use access_endpoint if provided
    // 2. Construct from endpoint
    // 3. Fallback to default pattern
  }
}
```

### Type Definitions

```typescript
export interface FileUploadConfig {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  region: string;
  bucketName: string;
  endpointUrl?: string;
  accessEndpoint?: string;
}

export interface STSTokenData {
  credentials: {
    access_key_id: string;
    access_key_secret: string;
    security_token: string;
    region?: string;
  };
  bucket_name: string;
  upload_path: string;
  upload_endpoint: string;
  access_endpoint?: string;
}
```

## File Structure

```
src/
├── file.ts                    # File resource class (NEW)
├── upload/
│   └── s3-uploader.ts        # S3 upload implementation (NEW)
├── client.ts                  # Updated: add file resource & gateway client
├── types.ts                   # Updated: add file upload types
└── index.ts                   # Updated: export File class
```

## Error Handling

1. **File Not Found**: Throw `SirayError` with clear message
2. **AWS SDK Missing**: Throw `SirayError`: "File upload requires @aws-sdk/client-s3. Install with: npm install @aws-sdk/client-s3"
3. **STS Token Error**: Propagate gateway authentication/API errors
4. **Upload Error**: Abort multipart upload if applicable, throw `SirayError`
5. **Invalid Response**: Throw `SirayError` for missing required fields in STS response

## Security Considerations

- SSL verification enabled by default (secure)
- Temporary STS credentials (short-lived, scoped access)
- No credentials stored in client after upload completes
- Object keys use server-provided upload_path prefix

## Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0"
  }
}
```

## Testing Strategy

1. **Unit Tests**:
   - File validation
   - STS token parsing
   - Object key generation
   - URL construction

2. **Integration Tests**:
   - Small file upload (simple PUT)
   - Large file upload (multipart)
   - Error scenarios (file not found, invalid credentials)
   - Custom endpoint support

3. **Example Usage**:
   - Add example to `examples/` directory
   - Document in README.md

## Success Criteria

- [ ] Files ≤8MB upload successfully using simple PUT
- [ ] Files >8MB upload successfully using multipart
- [ ] Uploaded files accessible via returned URL
- [ ] Error messages are clear and actionable
- [ ] API matches Python SDK interface
- [ ] SSL verification enabled
- [ ] Gateway client uses API-KEY authentication
- [ ] Main client uses Bearer authentication
