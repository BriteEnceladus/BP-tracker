import 'dotenv/config';

const EAS_PROJECT_ID = '0fdb4d17-a957-4a48-8e29-ffed84900f0d';

export default ({ config }) => {
  return {
    ...config,
    owner: config.owner || 'briteenceladus',
    extra: {
      // Keep anything Expo/EAS already put on extra (router, eas.projectId, …)
      ...config.extra,
      appName: process.env.EXPO_PUBLIC_APP_NAME || config.extra?.appName || 'BP Tracker',
      version: process.env.EXPO_PUBLIC_VERSION || config.extra?.version || '1.2.0',
      grokApiBase:
        process.env.EXPO_PUBLIC_GROK_API_BASE ||
        config.extra?.grokApiBase ||
        'https://api.x.ai/v1',
      eas: {
        ...(config.extra?.eas || {}),
        projectId: config.extra?.eas?.projectId || EAS_PROJECT_ID,
      },
    },
  };
};
