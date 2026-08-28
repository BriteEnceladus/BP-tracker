'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const LOG_URI = 'bptracker://log';

/** Small launcher tile. No readings on the home screen — tap opens the in-app Log form. */
export function QuickLogWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: LOG_URI }}
      accessibilityLabel="Log new reading"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0A1628',
        borderRadius: 20,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget text="+" style={{ color: '#14B8A6', fontSize: 28, fontWeight: '700' }} />
      <TextWidget
        text="Log now"
        style={{ color: '#E2EAF0', fontSize: 14, fontWeight: '600', marginTop: 4 }}
      />
    </FlexWidget>
  );
}
