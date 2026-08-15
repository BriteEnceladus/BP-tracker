export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      appName: process.env.EXPO_PUBLIC_APP_NAME || 'BP Tracker',
      version: process.env.EXPO_PUBLIC_VERSION || '1.1.0',
    },
  };
};
