import React, { useEffect } from 'react';
import { Platform, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MOTION, PRESS_SCALE, PULSE_SCALE } from '@/utils/motion';

type ChildrenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** One-shot fade/slide used on screen sections — not list rows. */
export function ScreenEnter({ children, style, delay = 0 }: ChildrenProps & { delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced || Platform.OS === 'web') {
    return <View style={style}>{children}</View>;
  }
  return (
    <Animated.View
      entering={FadeInDown.duration(MOTION.enter)
        .delay(delay)
        .easing(Easing.out(Easing.cubic))
        .reduceMotion(ReduceMotion.System)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

type PressScaleProps = ChildrenProps & {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** Native-driver scale on press. Drops to a plain Pressable when motion is reduced. */
export function PressScale({
  children,
  style,
  onPress,
  disabled,
  accessibilityLabel,
}: PressScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (reduced) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [style, pressed ? { opacity: 0.85 } : null]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        scale.value = withTiming(PRESS_SCALE, { duration: MOTION.pressIn });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: MOTION.pressOut });
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Looping pulse on the UI thread. Stops when `active` is false or Reduce Motion is on. */
export function PulseScale({
  children,
  style,
  active = true,
}: ChildrenProps & { active?: boolean }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(scale);
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(PULSE_SCALE, { duration: MOTION.pulse, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: MOTION.pulse, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(scale);
    };
  }, [active, reduced, scale]);

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
