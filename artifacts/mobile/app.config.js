export default ({ config }) => {
  return {
    ...config,
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      ...config.updates,
      enabled: true,
      url: 'https://u.expo.dev/01be2be0-2ae4-4bee-9974-3620e64ef682',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    extra: {
      ...config.extra,
      appName: process.env.EXPO_PUBLIC_APP_NAME || 'BP Tracker',
      version: process.env.EXPO_PUBLIC_VERSION || '1.1.3',
    },
  };
};
