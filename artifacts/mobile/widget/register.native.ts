import { Platform } from 'react-native';

export function registerHomeWidget(): void {
  if (Platform.OS !== 'android') return;
  try {
    const {
      registerWidgetTaskHandler,
    } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { widgetTaskHandler } = require('./widgetTaskHandler') as typeof import('./widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Expo Go / iOS: native widget module is absent. Needs a dev client or EAS build.
  }
}
