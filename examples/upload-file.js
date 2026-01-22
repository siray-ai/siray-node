const { Siray } = require('../dist/index');

async function main() {
  const client = new Siray({
    apiKey: process.env.SIRAY_API_KEY,
  });

  console.log('Uploading file...');

  try {
    // Upload a local file
    const fileUrl = await client.file.upload('./examples/test-image.jpg');
    console.log('File uploaded successfully!');
    console.log('URL:', fileUrl);

    // Use uploaded file in image generation
    console.log('\nGenerating image with uploaded file...');
    const result = await client.image.generateAsync({
      model: 'black-forest-labs/flux-1.1-pro-ultra-i2i',
      prompt: 'enhance this image, make it more vibrant',
      image: fileUrl,
    });
    console.log('Generation task ID:', result.task_id);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
