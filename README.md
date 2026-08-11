# Siray Node.js SDK

The official Node.js client library for Siray AI - a platform for AI-powered image, video and 3D model generation.

## Installation

```bash
npm install siray
```

## Configuration

### API Key

You can provide your API key in two ways:

1. **Via constructor options** (recommended for explicit configuration):
```typescript
import { Siray } from 'siray';

const client = new Siray({
  apiKey: 'your-api-key-here',
  baseURL: 'https://api.siray.ai',  // Optional: API base URL
  gatewayURL: 'https://api-gateway.siray.ai', // Optional: Gateway URL for file uploads
  timeout: 30000,                // Optional: Request timeout in milliseconds
});
```

2. **Via environment variable**:
```bash
export SIRAY_API_KEY='your-api-key-here'
```
```typescript
import { Siray } from 'siray';

// API key will be read from SIRAY_API_KEY environment variable
const client = new Siray();
```

If both are provided, the constructor option takes precedence.

## Usage

```typescript
import { Siray } from 'siray';

const client = new Siray({
  apiKey: 'your-api-key-here',
});

// Optional: turn a local file into a base64 data URL you can pass as the `image` field
const initImage = await client.loadFromLocal('path/to/image.jpg');

// Asynchronous image generation (recommended)
const imageResponse = await client.image.generateAsync({
  model: 'black-forest-labs/flux-1.1-pro-ultra-i2i',
  prompt: 'A beautiful sunset over mountains',
  image: initImage, // Optional reference image
});

// Asynchronous video generation
const videoResponse = await client.video.generateAsync({
  model: 'your-video-model',
  prompt: 'A cat playing piano',
});
```

### File Upload

Upload local files to Siray storage for use in generation requests:

```javascript
const { Siray } = require('siray');

const client = new Siray({
  apiKey: 'your-api-key',
  gatewayURL: 'https://api-gateway.siray.ai', // optional, this is the default
});

// Upload a file
const fileUrl = await client.file.upload('./path/to/image.jpg');
console.log('Uploaded:', fileUrl);

// Use in generation
const result = await client.image.generateAsync({
  model: 'flux-1.1-pro',
  prompt: 'enhance this image',
  image: fileUrl,
});
```

**File Upload Features:**
- Automatic multipart upload for files >8MB
- Support for images and videos
- Temporary S3 credentials (secure, scoped access)
- Custom S3-compatible endpoints supported
- SSL verification enabled by default

**Note:** File upload requires the `@aws-sdk/client-s3` package, which is included as a dependency.

## API

### Image Generation

#### Asynchronous Generation (Recommended)

```typescript
// Start async generation
const response = await client.image.generateAsync({
  model: 'black-forest-labs/flux-1.1-pro-ultra-i2i',
  prompt: 'A beautiful sunset over mountains',
  image: 'https://api.siray.ai/redirect/BhSSiToAIXxA-MuSg68UCpJz_4M60hVkHPakChStzJ2PH7Nq-AgSUO0Wps-OlB4MtO2x7wbrwt7rxmd0get0ITR_5WeSCS8GjNoGDmiQOIjBSXc.jpg', // Optional for image-to-image
});

console.log('Task ID:', response.task_id);

// Query task status
const status = await client.image.queryTask(response.task_id);
if (status.isCompleted()) {
  console.log('Generated image:', status.result);
  console.log('All outputs:', status.outputs);
} else if (status.isFailed()) {
  console.log('Error:', status.fail_reason);
} else {
  console.log('Progress:', status.progress);
}
```

#### Synchronous Generation

```typescript
const response = await client.image.generate({
  model: string,
  prompt: string,
  n?: number,
  size?: string,
  response_format?: 'url' | 'b64_json',
});
```

### Video Generation

```typescript
// Start async video generation
const response = await client.video.generateAsync({
  model: 'your-video-model',
  prompt: 'A cat playing piano',
});

console.log('Task ID:', response.task_id);

// Query task status
const status = await client.video.queryTask(response.task_id);
if (status.isCompleted()) {
  console.log('Generated video:', status.result);
  console.log('All outputs:', status.outputs);
} else if (status.isFailed()) {
  console.log('Error:', status.fail_reason);
} else {
  console.log('Progress:', status.progress);
}
```

### 3D Model Generation

```typescript
// Text-to-3D generation
const response = await client.threed.generateAsync({
  model: 'tencent/hunyuan3d-v2.5-rapid-text-to-3d',
  prompt: 'A detailed medieval castle with towers',
});

console.log('Task ID:', response.task_id);

// Query task status
const status = await client.threed.queryTask(response.task_id);
if (status.isCompleted()) {
  console.log('Generated 3D model:', status.result);
  console.log('All outputs:', status.outputs);
} else if (status.isFailed()) {
  console.log('Error:', status.fail_reason);
} else {
  console.log('Progress:', status.progress);
}

// Image-to-3D generation
const imgTo3d = await client.threed.generateAsync({
  model: 'tencent/hunyuan3d-v2.5-rapid-image-to-3d',
  prompt: 'Convert this image to a 3D model',
  image: 'https://example.com/your-image.jpg',
});
```

### Blocking Generation with `run`

If you prefer a blocking flow, use the `run` helper to submit an async task and wait until it finishes (or fails) without writing the polling loop yourself. Pass `BlockingRunOptions` to override the default 2s poll interval and 5‑minute timeout.

```typescript
const status = await client.image.run(
  {
    model: 'black-forest-labs/flux-1.1-pro-ultra-i2i',
    prompt: 'A cinematic portrait photo of a cyberpunk samurai',
  },
  {
    pollIntervalMs: 3000,
    timeoutMs: 3 * 60 * 1000,
  }
);

if (status.isCompleted()) {
  console.log('Generated image:', status.result);
} else if (status.isFailed()) {
  console.log('Error:', status.fail_reason);
} else {
  console.log('Final status:', status.status);
}

// Videos expose the same helper
const videoStatus = await client.video.run({
  model: 'your-video-model',
  prompt: 'A cat playing piano',
});

// 3D models expose the same helper
const threeDStatus = await client.threed.run({
  model: 'tencent/hunyuan3d-v2.5-rapid-text-to-3d',
  prompt: 'A detailed medieval castle',
});
```

See `examples/blocking-run.ts` for a complete script covering image and video blocking runs, and `examples/threed-generation.ts` for 3D model generation examples.

## Error Handling

The SDK throws `SirayError` exceptions for API errors:

```typescript
import { SirayError } from 'siray';

try {
const response = await client.chat.completions.create(options);
} catch (error) {
  if (error instanceof SirayError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
  }
}
```

## License

Licensed under the Apache License, Version 2.0. See the [`LICENSE`](./LICENSE) file for full details.
