import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { LatestReadingWidget } from './LatestReadingWidget';
import { readWidgetSnapshot } from './bridge';

async function draw(props: WidgetTaskHandlerProps) {
  const snapshot = await readWidgetSnapshot();
  props.renderWidget(<LatestReadingWidget snapshot={snapshot} />);
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      await draw(props);
      break;
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      break;
  }
}
