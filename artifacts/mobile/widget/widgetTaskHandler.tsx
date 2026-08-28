import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { LatestReadingWidget } from './LatestReadingWidget';
import { QuickLogWidget } from './QuickLogWidget';
import { readWidgetSnapshot } from './bridge';

async function draw(props: WidgetTaskHandlerProps) {
  const name = props.widgetInfo.widgetName;
  if (name === 'QuickLog') {
    props.renderWidget(<QuickLogWidget />);
    return;
  }
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
