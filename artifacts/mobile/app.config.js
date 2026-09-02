export default ({ config }) => {
  return {
    ...config,
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      ...config.updates,
      // Launch binary must not pull OTA. Flip enabled to true + NEVER→ON_LOAD when ready.
      enabled: false,
      url: 'https://u.expo.dev/01be2be0-2ae4-4bee-9974-3620e64ef682',
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
    },
    extra: {
      ...config.extra,
      appName: process.env.EXPO_PUBLIC_APP_NAME || 'BP Tracker',
      version: process.env.EXPO_PUBLIC_VERSION || '1.1.1',
    },
  };
};
