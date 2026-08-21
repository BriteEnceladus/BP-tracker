import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  LOCKED_WIDGET_SNAPSHOT,
  OFF_WIDGET_SNAPSHOT,
  type WidgetSnapshot,
} from '../utils/widgetSnapshot';

const SNAPSHOT_KEY = 'bp_widget_snapshot_v1';
const ENABLED_KEY = 'bp_widget_enabled_v1';
const WIDGET_NAME = 'LatestReading';

function parseSnapshot(raw: string | null): WidgetSnapshot {
  if (!raw) return LOCKED_WIDGET_SNAPSHOT;
  try {
    const parsed = JSON.parse(raw) as WidgetSnapshot;
    if (typeof parsed?.showNumbers !== 'boolean') return LOCKED_WIDGET_SNAPSHOT;
    return parsed;
  } catch {
    return LOCKED_WIDGET_SNAPSHOT;
  }
}

export async function getWidgetEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setWidgetEnabled(enabled: boolean): Promise<void> {
  if (enabled) await AsyncStorage.setItem(ENABLED_KEY, '1');
  else await AsyncStorage.removeItem(ENABLED_KEY);
}

export async function readWidgetSnapshot(): Promise<WidgetSnapshot> {
  try {
    return parseSnapshot(await AsyncStorage.getItem(SNAPSHOT_KEY));
  } catch {
    return LOCKED_WIDGET_SNAPSHOT;
  }
}

async function persistSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function requestAndroidRedraw(snapshot: WidgetSnapshot): void {
  if (Platform.OS !== 'android') return;
  try {
    const {
      requestWidgetUpdate,
    } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { LatestReadingWidget } = require('./LatestReadingWidget') as typeof import('./LatestReadingWidget');
    requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => React.createElement(LatestReadingWidget, { snapshot }),
      widgetNotFound: () => {},
    });
  } catch {
    // Native module missing (Expo Go). Snapshot is still persisted.
  }
}

export async function publishWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await persistSnapshot(snapshot);
    requestAndroidRedraw(snapshot);
  } catch {
    // Never throw into lock/unlock paths.
  }
}

export async function lockHomeWidget(): Promise<void> {
  await publishWidgetSnapshot(LOCKED_WIDGET_SNAPSHOT);
}

export async function disableHomeWidget(): Promise<void> {
  await setWidgetEnabled(false);
  await publishWidgetSnapshot(OFF_WIDGET_SNAPSHOT);
}

export async function pinHomeWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const mod = require('react-native-android-widget') as {
      requestPinWidget?: (opts: { widgetName: string }) => Promise<boolean>;
    };
    if (typeof mod.requestPinWidget === 'function') {
      await mod.requestPinWidget({ widgetName: WIDGET_NAME });
    }
  } catch {
    // Launcher may not support pinning; user can add the widget manually.
  }
}
