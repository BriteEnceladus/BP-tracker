'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { BPCategory } from '../utils/bpUtils';
import type { WidgetSnapshot } from '../utils/widgetSnapshot';

const LOG_URI = 'bptracker://log';

const CATEGORY_COLOR: Record<BPCategory, `#${string}`> = {
  normal: '#22C55E',
  elevated: '#FBBF24',
  stage1: '#F59E0B',
  stage2: '#EF4444',
  crisis: '#EF4444',
};

function statusCopy(snapshot: WidgetSnapshot): string {
  if (snapshot.reason === 'locked') return 'Unlock to show latest';
  if (snapshot.reason === 'off') return 'Numbers hidden';
  return 'Log a reading';
}

export function LatestReadingWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const show = snapshot.showNumbers && snapshot.systolic != null && snapshot.diastolic != null;
  const color = snapshot.category ? CATEGORY_COLOR[snapshot.category] : '#14B8A6';

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: LOG_URI }}
      accessibilityLabel={
        show
          ? `Latest blood pressure ${snapshot.systolic} over ${snapshot.diastolic}`
          : 'BP Tracker. Open to log a reading.'
      }
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0A1628',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text="BP Tracker"
        style={{ color: '#14B8A6', fontSize: 12, fontWeight: '600' }}
      />
      {show ? (
        <>
          <TextWidget
            text={`${snapshot.systolic}/${snapshot.diastolic}`}
            style={{ color: '#E2EAF0', fontSize: 32, fontWeight: '700', marginTop: 4 }}
          />
          <TextWidget
            text={snapshot.categoryLabel ?? ''}
            style={{ color, fontSize: 13, fontWeight: '600', marginTop: 2 }}
          />
          <TextWidget
            text="Tap to log →"
            style={{ color: '#8BA8C4', fontSize: 13, marginTop: 8 }}
          />
        </>
      ) : (
        <>
          <TextWidget
            text={statusCopy(snapshot)}
            style={{ color: '#E2EAF0', fontSize: 16, fontWeight: '600', marginTop: 8 }}
          />
          <TextWidget
            text="Tap to log →"
            style={{ color: '#8BA8C4', fontSize: 13, marginTop: 6 }}
          />
        </>
      )}
    </FlexWidget>
  );
}
