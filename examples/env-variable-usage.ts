import { Siray } from '../src/index';

async function example() {
  // Example 1: Using environment variable SIRAY_API_KEY
  // Make sure to set SIRAY_API_KEY in your environment before running this
  const client = new Siray();

  try {
    console.log('Testing image generation with API key from environment variable...');
    const imageResponse = await client.image.generateAsync({
      model: 'black-forest-labs/flux-1.1-pro-ultra-i2i',
      prompt: 'A beautiful sunset over mountains',
    });

    console.log('Image Task ID:', imageResponse.task_id);

    // Query image generation status
    const imageStatus = await client.image.queryTask(imageResponse.task_id);
    console.log('Image Status:', imageStatus.status);

    if (imageStatus.isCompleted()) {
      console.log('Generated Image URL:', imageStatus.result);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
  }
}

example();
