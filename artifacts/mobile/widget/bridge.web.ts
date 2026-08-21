import type { WidgetSnapshot } from '../utils/widgetSnapshot';
import { LOCKED_WIDGET_SNAPSHOT } from '../utils/widgetSnapshot';

export async function getWidgetEnabled(): Promise<boolean> {
  return false;
}

export async function setWidgetEnabled(_enabled: boolean): Promise<void> {}

export async function readWidgetSnapshot(): Promise<WidgetSnapshot> {
  return LOCKED_WIDGET_SNAPSHOT;
}

export async function publishWidgetSnapshot(_snapshot: WidgetSnapshot): Promise<void> {}

export async function lockHomeWidget(): Promise<void> {}

export async function disableHomeWidget(): Promise<void> {}

export async function pinHomeWidget(): Promise<void> {}
