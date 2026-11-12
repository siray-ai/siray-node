import { Siray } from '../src';

async function audioExample() {
  const client = new Siray({
    apiKey: 'your-api-key-here',
  });

  try {
    // `run` submits the task and polls it to completion. Use
    // `generateAsync` + `queryTask` if you want to manage polling yourself.
    const status = await client.audio.run(
      {
        model: 'minimax/music-3.0',
        prompt:
          'Cinematic pop song with an emotional female lead vocal, warm piano, atmospheric synth pads and a powerful chorus',
        lyrics:
          '[Verse]\nI left the light on by the door\nLike you might come back once more\n\n[Chorus]\nIf the city falls asleep tonight\nI\'ll keep running toward the light',
        lyrics_optimizer: false,
        is_instrumental: false,
        bitrate: 256000,
        sample_rate: 44100,
      },
      {
        pollIntervalMs: 3000,
        timeoutMs: 10 * 60 * 1000,
      }
    );

    if (status.isCompleted()) {
      console.log('Generated audio:', status.result);
      console.log('All outputs:', status.outputs);
    } else if (status.isFailed()) {
      console.error('Audio generation failed:', status.fail_reason);
    } else {
      console.log('Final status:', status.status);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Audio generation error:', message);
  }
}

audioExample().catch(console.error);
