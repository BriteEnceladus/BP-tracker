'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { BPCategory } from '../utils/bpUtils';
import type { GlucoseBand } from '../utils/glucoseUtils';
import type { WidgetSnapshot } from '../utils/widgetSnapshot';

const LOG_URI = 'bptracker://log';

const CATEGORY_COLOR: Record<BPCategory, `#${string}`> = {
  normal: '#22C55E',
  elevated: '#FBBF24',
  stage1: '#F59E0B',
  stage2: '#EF4444',
  crisis: '#EF4444',
};

const GLUCOSE_COLOR: Record<GlucoseBand, `#${string}`> = {
  low: '#60A5FA',
  inRange: '#22C55E',
  elevated: '#FBBF24',
  high: '#EF4444',
};

function statusCopy(snapshot: WidgetSnapshot): string {
  if (snapshot.reason === 'locked') return 'Unlock to show latest';
  if (snapshot.reason === 'off') return 'Numbers hidden';
  return 'Log a reading';
}

export function LatestReadingWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const showBp = snapshot.showNumbers && snapshot.systolic != null && snapshot.diastolic != null;
  const showGlu = snapshot.showNumbers && snapshot.glucoseMgdl != null;
  const show = showBp || showGlu;
  const color = snapshot.category ? CATEGORY_COLOR[snapshot.category] : '#14B8A6';
  const gluColor = snapshot.glucoseBand ? GLUCOSE_COLOR[snapshot.glucoseBand] : '#14B8A6';
  const uri = showGlu && !showBp ? 'bptracker://log?metric=glucose' : LOG_URI;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={
        show
          ? `Latest ${showBp ? `blood pressure ${snapshot.systolic} over ${snapshot.diastolic}` : ''} ${showGlu ? `glucose ${snapshot.glucoseMgdl}` : ''}`.trim()
          : 'Quenly. Open to log a reading.'
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
        text="Quenly"
        style={{ color: '#14B8A6', fontSize: 12, fontWeight: '600' }}
      />
      {show ? (
        <>
          {showBp ? (
            <>
              <TextWidget
                text={`${snapshot.systolic}/${snapshot.diastolic}`}
                style={{ color: '#E2EAF0', fontSize: 28, fontWeight: '700', marginTop: 4 }}
              />
              <TextWidget
                text={snapshot.categoryLabel ?? ''}
                style={{ color, fontSize: 12, fontWeight: '600', marginTop: 2 }}
              />
            </>
          ) : null}
          {showGlu ? (
            <TextWidget
              text={`GLU ${snapshot.glucoseMgdl} · ${snapshot.glucoseLabel ?? ''}`}
              style={{ color: gluColor, fontSize: 14, fontWeight: '600', marginTop: 6 }}
            />
          ) : null}
          <TextWidget
            text="Tap to log now"
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
            text="Tap to log now"
            style={{ color: '#8BA8C4', fontSize: 13, marginTop: 6 }}
          />
        </>
      )}
    </FlexWidget>
  );
}
