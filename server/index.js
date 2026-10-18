import { config, authEnabled } from './config.js';
import { openStore } from './store.js';
import { createApp } from './app.js';

const store = openStore(config.dbPath);
const app = createApp({ store });

app.listen(config.port, () => {
  console.log(`Health AI running at http://localhost:${config.port}`);
  if (config.mockAi) console.log('⚠  Demo mode: no OPENAI_API_KEY set (or MOCK_AI=1). AI answers are simulated; safety rules are fully active.');
  else console.log(`AI models: triage=${config.models.triage} vision=${config.models.vision} stt=${config.models.transcribe} tts=${config.models.tts}`);
  if (!authEnabled()) console.log('⚠  ACCESS_TOKENS not set: open development mode, every visitor has full access. Set tokens before deploying.');
});
