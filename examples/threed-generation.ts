import { Siray } from '../src/index';

async function textTo3DExample() {
  const client = new Siray({
    apiKey: 'your-api-key-here',
  });

  try {
    // Text-to-3D generation
    console.log('Starting text-to-3D generation...');
    const response = await client.threed.generateAsync({
      model: 'tencent/hunyuan3d-v2.5-rapid-text-to-3d',
      prompt: 'A detailed medieval castle with towers and a drawbridge',
    });

    console.log('Task ID:', response.task_id);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      const status = await client.threed.queryTask(response.task_id);

      console.log(`Attempt ${attempts + 1}: Status = ${status.status}, Progress = ${status.progress || 'N/A'}`);

      if (status.isCompleted()) {
        console.log('3D model generation completed!');
        console.log('Generated model:', status.result);
        console.log('All outputs:', status.outputs);
        break;
      } else if (status.isFailed()) {
        console.error('3D model generation failed:', status.fail_reason);
        break;
      }

      // Wait 5 seconds before polling again (3D generation takes longer)
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
  }
}

async function imageTo3DExample() {
  const client = new Siray({
    apiKey: 'your-api-key-here',
  });

  try {
    // Image-to-3D generation
    console.log('Starting image-to-3D generation...');
    const response = await client.threed.generateAsync({
      model: 'tencent/hunyuan3d-v2.5-rapid-image-to-3d',
      prompt: 'Convert this image to a 3D model',
      image: 'https://example.com/your-image.jpg',
    });

    console.log('Task ID:', response.task_id);

    // Use the blocking run helper instead of manual polling
    console.log('Waiting for completion...');
    const status = await client.threed.run(
      {
        model: 'tencent/hunyuan3d-v2.5-rapid-image-to-3d',
        prompt: 'Convert this image to a 3D model',
        image: 'https://example.com/your-image.jpg',
      },
      {
        pollIntervalMs: 5000,
        timeoutMs: 10 * 60 * 1000, // 10 minutes
      }
    );

    if (status.isCompleted()) {
      console.log('3D model generation completed!');
      console.log('Generated model:', status.result);
    } else if (status.isFailed()) {
      console.error('3D model generation failed:', status.fail_reason);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
  }
}

async function main() {
  console.log('=== Text-to-3D Generation Example ===');
  await textTo3DExample();

  console.log('\n=== Image-to-3D Generation Example ===');
  await imageTo3DExample();
}

// Run examples
main().catch(console.error);
