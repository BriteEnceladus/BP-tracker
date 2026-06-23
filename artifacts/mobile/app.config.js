import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      appName: process.env.EXPO_PUBLIC_APP_NAME || 'BP Tracker',
      version: process.env.EXPO_PUBLIC_VERSION || '1.0.0',
      grokApiBase: process.env.EXPO_PUBLIC_GROK_API_BASE || 'https://api.x.ai/v1',
    },
  };
};
