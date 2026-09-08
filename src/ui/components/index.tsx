import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { useTheme } from '../../app/providers/AppProvider';
import { difficultyColor, masteryColor, type FontSizeToken, type Theme } from '../theme';
import { formatNumber } from '../../core/utils/format';
import { formatClock } from '../../core/utils/date';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* ── motion ──────────────────────────────────────────────────────────────── */

/**
 * A gentle press-in/press-out scale used by every tappable surface. Skips the
 * animation entirely when the user has asked for reduced motion (spec §46).
 */
function usePressScale(theme: Theme, pressedScale = 0.97): {
  value: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const value = useRef(new Animated.Value(1)).current;
  const onPressIn = (): void => {
    if (theme.reduceAnimations) return;
    Animated.timing(value, { toValue: pressedScale, duration: 90, useNativeDriver: true }).start();
  };
  const onPressOut = (): void => {
    if (theme.reduceAnimations) return;
    Animated.timing(value, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  return { value, onPressIn, onPressOut };
}

/** Soft elevation shared by every card, so the UI reads as layered rather than flat. */
function cardShadow(theme: Theme): ViewStyle {
  return {
    borderRadius: theme.radius.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.06,
    shadowRadius: 8,
    elevation: 3,
  };
}

/**
 * Fades and slides content in on mount. Used for stagger-reveal lists so a
 * screen feels alive without any layout cost (spec §46 respects reduced motion).
 */
export function FadeInView({
  children,
  delay = 0,
  distance = 14,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(theme.reduceAnimations ? 1 : 0)).current;

  useEffect(() => {
    if (theme.reduceAnimations) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 360,
      delay,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A slow, looping scale pulse — used sparingly (streaks, live indicators). */
export function Pulse({
  children,
  scale = 1.08,
  duration = 900,
}: {
  children: React.ReactNode;
  scale?: number;
  duration?: number;
}): React.JSX.Element {
  const theme = useTheme();
  const value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (theme.reduceAnimations) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: scale, duration, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.reduceAnimations]);

  return <Animated.View style={{ transform: [{ scale: value }] }}>{children}</Animated.View>;
}

/**
 * A small confetti-style burst, fired once on mount — the reward moment at
 * the end of a session or when an achievement unlocks.
 */
export function Celebration({ colors, count = 16 }: { colors?: string[]; count?: number }): React.JSX.Element | null {
  const theme = useTheme();
  const palette = useMemo(
    () =>
      colors ?? [
        theme.colors.primary,
        theme.colors.success,
        theme.colors.accent,
        theme.colors.topic.rose,
        theme.colors.topic.teal,
      ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.4;
        const distance = 60 + Math.random() * 70;
        return {
          key: 'p' + index,
          color: palette[index % palette.length],
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - 30,
          size: 5 + Math.round(Math.random() * 5),
          progress: new Animated.Value(0),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, palette],
  );

  useEffect(() => {
    if (theme.reduceAnimations) return;
    const animations = particles.map((particle) =>
      Animated.timing(particle.progress, { toValue: 1, duration: 700 + Math.random() * 300, useNativeDriver: true }),
    );
    const handle = Animated.stagger(12, animations);
    handle.start();
    return () => handle.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particles, theme.reduceAnimations]);

  if (theme.reduceAnimations) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}
    >
      {particles.map((particle) => (
        <Animated.View
          key={particle.key}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            borderRadius: particle.size / 2,
            backgroundColor: particle.color,
            opacity: particle.progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateX: particle.progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dx] }) },
              { translateY: particle.progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dy] }) },
              {
                scale: particle.progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 0.6] }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

/* ── layout ──────────────────────────────────────────────────────────────── */

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <View
      style={[
        padded ? { paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(3) } : null,
        { paddingBottom: theme.spacing(6) + insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}
    </SafeAreaView>
  );
}

export function Row({
  children,
  gap = 2,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          gap: theme.spacing(gap),
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Column({
  children,
  gap = 2,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  return <View style={[{ gap: theme.spacing(gap) }, style]}>{children}</View>;
}

export function Spacer({ size = 3 }: { size?: number }): React.JSX.Element {
  const theme = useTheme();
  return <View style={{ height: theme.spacing(size) }} />;
}

export function Divider(): React.JSX.Element {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />;
}

/* ── typography ──────────────────────────────────────────────────────────── */

export function Txt({
  children,
  size = 'body',
  weight = 'regular',
  color,
  align,
  mono = false,
  numberOfLines,
  style,
}: {
  children: React.ReactNode;
  size?: FontSizeToken;
  weight?: keyof Theme['font']['weight'];
  color?: string;
  align?: TextStyle['textAlign'];
  mono?: boolean;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: theme.font.size(size),
          fontWeight: theme.font.weight[weight],
          color: color ?? theme.colors.text,
          textAlign: align,
          fontFamily: mono ? theme.font.mono : undefined,
          lineHeight: Math.round(theme.font.size(size) * 1.45),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Mathematical expressions: monospace, selectable, never wrapped mid-symbol. */
export function MathText({
  children,
  size = 'math',
  color,
  align,
}: {
  children: string;
  size?: FontSizeToken;
  color?: string;
  align?: TextStyle['textAlign'];
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Text
      selectable
      style={{
        fontFamily: theme.font.mono,
        fontSize: theme.font.size(size),
        color: color ?? theme.colors.text,
        textAlign: align,
        lineHeight: Math.round(theme.font.size(size) * 1.5),
      }}
    >
      {children}
    </Text>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  emoji,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  emoji?: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Row justify="space-between" style={{ marginBottom: theme.spacing(2) }}>
      <Row gap={1}>
        {emoji ? <Txt size="bodyLarge">{emoji}</Txt> : null}
        <Txt size="bodyLarge" weight="semibold">
          {title}
        </Txt>
      </Row>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Txt size="small" weight="semibold" color={theme.colors.primary}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

/* ── surfaces ────────────────────────────────────────────────────────────── */

export function Card({
  children,
  onPress,
  accent,
  disabled = false,
  padded = true,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accent?: string;
  disabled?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}): React.JSX.Element {
  const theme = useTheme();
  const scale = usePressScale(theme);
  const inner = (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing(4) : 0,
          overflow: 'hidden',
        },
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
  const shadow = cardShadow(theme);

  if (!onPress || disabled) {
    return <View style={[shadow, disabled ? { opacity: 0.55 } : null]}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={scale.onPressIn}
      onPressOut={scale.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[shadow, { transform: [{ scale: scale.value }] }]}>{inner}</Animated.View>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  full = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.colors.primary, fg: theme.colors.primaryText, border: theme.colors.primary },
    secondary: { bg: theme.colors.surfaceAlt, fg: theme.colors.text, border: theme.colors.border },
    ghost: { bg: 'transparent', fg: theme.colors.primary, border: 'transparent' },
    danger: { bg: theme.colors.danger, fg: '#ffffff', border: theme.colors.danger },
    success: { bg: theme.colors.success, fg: '#ffffff', border: theme.colors.success },
  }[variant];

  const paddingVertical = size === 'lg' ? theme.spacing(4) : size === 'sm' ? theme.spacing(2) : theme.spacing(3);
  const fontSize: FontSizeToken = size === 'lg' ? 'bodyLarge' : size === 'sm' ? 'small' : 'body';
  const scale = usePressScale(theme, 0.95);
  const elevated = (variant === 'primary' || variant === 'danger' || variant === 'success') && !disabled;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={scale.onPressIn}
      onPressOut={scale.onPressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      style={{ alignSelf: full ? 'stretch' : 'flex-start' }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            paddingVertical,
            paddingHorizontal: theme.spacing(5),
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: theme.spacing(2),
            opacity: disabled ? 0.5 : 1,
            minHeight: 44,
            transform: [{ scale: scale.value }],
          },
          elevated
            ? {
                shadowColor: palette.bg,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: theme.mode === 'dark' ? 0.45 : 0.25,
                shadowRadius: 6,
                elevation: 3,
              }
            : null,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : (
          <>
            {icon ? <Txt size={fontSize}>{icon}</Txt> : null}
            <Txt size={fontSize} weight="semibold" color={palette.fg}>
              {label}
            </Txt>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  color,
  emoji,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  emoji?: string;
}): React.JSX.Element {
  const theme = useTheme();
  const tint = color ?? theme.colors.primary;
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing(1),
        backgroundColor: selected ? tint : theme.colors.surfaceAlt,
        borderColor: selected ? tint : theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radius.pill,
        paddingVertical: theme.spacing(2),
        paddingHorizontal: theme.spacing(3),
        minHeight: 36,
      }}
    >
      {emoji ? <Txt size="small">{emoji}</Txt> : null}
      <Txt size="small" weight="medium" color={selected ? theme.colors.primaryText : theme.colors.text}>
        {label}
      </Txt>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      {body}
    </Pressable>
  );
}

export function Badge({
  label,
  color,
  soft = true,
}: {
  label: string;
  color?: string;
  soft?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const tint = color ?? theme.colors.primary;
  const pop = useRef(new Animated.Value(theme.reduceAnimations ? 1 : 0.5)).current;

  useEffect(() => {
    if (theme.reduceAnimations) return;
    Animated.timing(pop, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        backgroundColor: soft ? theme.colors.surfaceAlt : tint,
        borderRadius: theme.radius.sm,
        paddingVertical: theme.spacing(1),
        paddingHorizontal: theme.spacing(2),
        transform: [{ scale: pop }],
      }}
    >
      <Txt size="caption" weight="semibold" color={soft ? tint : theme.colors.primaryText}>
        {label}
      </Txt>
    </Animated.View>
  );
}

/* ── data display ────────────────────────────────────────────────────────── */

export function ProgressBar({
  ratio,
  color,
  height = 8,
  label,
}: {
  ratio: number;
  color?: string;
  height?: number;
  label?: string;
}): React.JSX.Element {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  const progress = useRef(new Animated.Value(theme.reduceAnimations ? clamped : 0)).current;

  useEffect(() => {
    if (theme.reduceAnimations) {
      progress.setValue(clamped);
      return;
    }
    Animated.timing(progress, { toValue: clamped, duration: 420, useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, theme.reduceAnimations]);

  return (
    <View style={{ gap: theme.spacing(1) }}>
      {label ? (
        <Txt size="caption" color={theme.colors.textMuted}>
          {label}
        </Txt>
      ) : null}
      <View
        // `accessible` is what makes this an accessibility element, so screen
        // readers (and role queries) actually see the progress value.
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
        style={{
          height,
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.pill,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            height: '100%',
            backgroundColor: color ?? theme.colors.primary,
            borderRadius: theme.radius.pill,
          }}
        />
      </View>
    </View>
  );
}

export function StatTile({
  label,
  value,
  emoji,
  color,
  onPress,
}: {
  label: string;
  value: string;
  emoji?: string;
  color?: string;
  onPress?: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={{ flex: 1, minWidth: 140 }}>
      <Column gap={1}>
        <Row gap={1}>
          {emoji ? <Txt size="small">{emoji}</Txt> : null}
          <Txt size="caption" color={theme.colors.textMuted}>
            {label}
          </Txt>
        </Row>
        <Txt size="title" weight="bold" color={color}>
          {value}
        </Txt>
      </Column>
    </Card>
  );
}

/** Mastery ring drawn with SVG so it stays crisp at any size. */
export function MasteryRing({
  ratio,
  size = 64,
  thickness = 7,
  label,
}: {
  ratio: number;
  size?: number;
  thickness?: number;
  label?: string;
}): React.JSX.Element {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = masteryColor(theme, clamped);
  const progress = useRef(new Animated.Value(theme.reduceAnimations ? clamped : 0)).current;

  useEffect(() => {
    if (theme.reduceAnimations) {
      progress.setValue(clamped);
      return;
    }
    Animated.timing(progress, { toValue: clamped, duration: 700, useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, theme.reduceAnimations]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surfaceSunken}
          strokeWidth={thickness}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference + ' ' + circumference}
          strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
          transform={'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Txt size="small" weight="bold" color={color}>
          {label ?? Math.round(clamped * 100) + '%'}
        </Txt>
      </View>
    </View>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/** Simple, cheap bar chart — no animation, no layout thrash (spec §43). */
export function BarChart({
  data,
  height = 120,
  showValues = true,
}: {
  data: readonly BarDatum[];
  height?: number;
  showValues?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={{ gap: theme.spacing(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: theme.spacing(2) }}>
        {data.map((datum, index) => (
          <View key={datum.label + index} style={{ flex: 1, alignItems: 'center', gap: theme.spacing(1) }}>
            {showValues ? (
              <Txt size="caption" color={theme.colors.textMuted}>
                {datum.value > 0 ? formatNumber(datum.value) : ''}
              </Txt>
            ) : null}
            <View
              style={{
                width: '100%',
                height: Math.max(2, (datum.value / max) * (height - 28)),
                backgroundColor: datum.color ?? theme.colors.primary,
                borderRadius: theme.radius.sm,
              }}
            />
          </View>
        ))}
      </View>
      <Row gap={2}>
        {data.map((datum, index) => (
          <View key={'label-' + datum.label + index} style={{ flex: 1, alignItems: 'center' }}>
            <Txt size="caption" color={theme.colors.textMuted} numberOfLines={1}>
              {datum.label}
            </Txt>
          </View>
        ))}
      </Row>
    </View>
  );
}

/** Line plot for the function lab; nulls break the line at discontinuities. */
export function LinePlot({
  points,
  width = 300,
  height = 200,
  xRange,
  yRange,
}: {
  points: readonly { x: number; y: number | null }[];
  width?: number;
  height?: number;
  xRange?: [number, number];
  yRange?: [number, number];
}): React.JSX.Element {
  const theme = useTheme();
  const finite = points.filter((p): p is { x: number; y: number } => p.y !== null);
  const [xMin, xMax] = xRange ?? [
    Math.min(...points.map((p) => p.x)),
    Math.max(...points.map((p) => p.x)),
  ];
  const [yMin, yMax] = yRange ?? [
    finite.length ? Math.min(...finite.map((p) => p.y)) : -1,
    finite.length ? Math.max(...finite.map((p) => p.y)) : 1,
  ];
  const spanX = xMax - xMin || 1;
  const spanY = yMax - yMin || 1;
  const toX = (x: number): number => ((x - xMin) / spanX) * width;
  const toY = (y: number): number => height - ((y - yMin) / spanY) * height;

  // Split into runs of consecutive finite points.
  const runs: string[] = [];
  let current: string[] = [];
  for (const point of points) {
    if (point.y === null) {
      if (current.length > 1) runs.push(current.join(' '));
      current = [];
      continue;
    }
    current.push(toX(point.x).toFixed(2) + ',' + toY(point.y).toFixed(2));
  }
  if (current.length > 1) runs.push(current.join(' '));

  const zeroY = yMin <= 0 && yMax >= 0 ? toY(0) : null;
  const zeroX = xMin <= 0 && xMax >= 0 ? toX(0) : null;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.md,
        padding: theme.spacing(1),
      }}
    >
      <Svg width={width} height={height}>
        {zeroY !== null ? (
          <Line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke={theme.colors.borderStrong} strokeWidth={1} />
        ) : null}
        {zeroX !== null ? (
          <Line x1={zeroX} y1={0} x2={zeroX} y2={height} stroke={theme.colors.borderStrong} strokeWidth={1} />
        ) : null}
        {runs.map((run, index) => (
          <Polyline
            key={'run-' + index}
            points={run}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
}

/** Small diagram renderer for lesson visuals. */
export function LessonVisualView({
  kind,
  values,
  labels,
}: {
  kind: 'bars' | 'fraction' | 'numberline' | 'shape';
  values: readonly number[];
  labels?: readonly string[];
}): React.JSX.Element {
  const theme = useTheme();

  if (kind === 'bars') {
    return (
      <BarChart
        data={values.map((value, index) => ({ label: labels?.[index] ?? String(index + 1), value }))}
        height={110}
      />
    );
  }

  if (kind === 'fraction') {
    // values are [numerator, denominator, numerator, denominator, …]
    const pairs: { n: number; d: number }[] = [];
    for (let i = 0; i + 1 < values.length; i += 2) pairs.push({ n: values[i], d: values[i + 1] });
    return (
      <Column gap={2}>
        {pairs.map((pair, index) => (
          <View key={'frac-' + index} style={{ gap: theme.spacing(1) }}>
            <Txt size="caption" color={theme.colors.textMuted}>
              {labels?.[index] ?? pair.n + '/' + pair.d}
            </Txt>
            <Row gap={1}>
              {Array.from({ length: pair.d }).map((_, cell) => (
                <View
                  key={'cell-' + cell}
                  style={{
                    flex: 1,
                    height: 22,
                    borderRadius: theme.radius.sm,
                    backgroundColor: cell < pair.n ? theme.colors.primary : theme.colors.surfaceSunken,
                  }}
                />
              ))}
            </Row>
          </View>
        ))}
      </Column>
    );
  }

  if (kind === 'numberline') {
    const max = Math.max(1, ...values);
    return (
      <View style={{ paddingVertical: theme.spacing(3) }}>
        <Svg width="100%" height={54}>
          <Line x1="2%" y1={26} x2="98%" y2={26} stroke={theme.colors.borderStrong} strokeWidth={2} />
          {values.map((value, index) => {
            const x = 2 + (value / max) * 94;
            return (
              <Circle
                key={'tick-' + index}
                cx={x + '%'}
                cy={26}
                r={6}
                fill={theme.colors.primary}
              />
            );
          })}
        </Svg>
        <Row justify="space-between">
          {(labels ?? values.map(String)).map((label, index) => (
            <Txt key={'nl-' + index} size="caption" color={theme.colors.textMuted}>
              {label}
            </Txt>
          ))}
        </Row>
      </View>
    );
  }

  // shape: draw a right triangle scaled to the first two values.
  const [a = 3, b = 4] = values;
  const scale = 90 / Math.max(a, b);
  return (
    <View style={{ alignItems: 'center', paddingVertical: theme.spacing(2) }}>
      <Svg width={140} height={120}>
        <Path
          d={'M 20 100 L ' + (20 + a * scale) + ' 100 L 20 ' + (100 - b * scale) + ' Z'}
          fill={theme.colors.primarySoft}
          stroke={theme.colors.primary}
          strokeWidth={2}
        />
        <Rect x={20} y={94} width={6} height={6} fill={theme.colors.primary} />
      </Svg>
      <Row gap={2} wrap>
        {(labels ?? []).map((label, index) => (
          <Txt key={'shape-' + index} size="caption" color={theme.colors.textMuted}>
            {label}
          </Txt>
        ))}
      </Row>
    </View>
  );
}

/* ── input ───────────────────────────────────────────────────────────────── */

export function Field({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoFocus = false,
  onSubmitEditing,
  mono = false,
  multiline = false,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'number-pad';
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  mono?: boolean;
  multiline?: boolean;
  accessibilityLabel?: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      keyboardType={keyboardType}
      autoFocus={autoFocus}
      onSubmitEditing={onSubmitEditing}
      multiline={multiline}
      accessibilityLabel={accessibilityLabel ?? placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing(3),
        paddingVertical: theme.spacing(3),
        color: theme.colors.text,
        fontSize: theme.font.size(mono ? 'math' : 'bodyLarge'),
        fontFamily: mono ? theme.font.mono : undefined,
        minHeight: multiline ? 96 : 48,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  );
}

export function Toggle({
  label,
  value,
  onChange,
  detail,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  detail?: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing(3),
        gap: theme.spacing(3),
        minHeight: 48,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt size="body">{label}</Txt>
        {detail ? (
          <Txt size="caption" color={theme.colors.textMuted}>
            {detail}
          </Txt>
        ) : null}
      </View>
      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: theme.radius.pill,
          backgroundColor: value ? theme.colors.primary : theme.colors.surfaceSunken,
          padding: 3,
          justifyContent: 'center',
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surface,
          }}
        />
      </View>
    </Pressable>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 200,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Row justify="space-between" style={{ paddingVertical: theme.spacing(2) }}>
      <Txt size="body">{label}</Txt>
      <Row gap={2}>
        <Button
          label="−"
          size="sm"
          variant="secondary"
          onPress={() => onChange(Math.max(min, value - step))}
        />
        <Txt size="bodyLarge" weight="semibold">
          {value}
          {suffix ? ' ' + suffix : ''}
        </Txt>
        <Button
          label="+"
          size="sm"
          variant="secondary"
          onPress={() => onChange(Math.min(max, value + step))}
        />
      </Row>
    </Row>
  );
}

/* ── states ──────────────────────────────────────────────────────────────── */

export function Loading({ label }: { label?: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing(8), alignItems: 'center', gap: theme.spacing(3) }}>
      <ActivityIndicator color={theme.colors.primary} />
      {label ? (
        <Txt size="small" color={theme.colors.textMuted}>
          {label}
        </Txt>
      ) : null}
    </View>
  );
}

export function EmptyState({
  emoji = '🌱',
  title,
  detail,
  actionLabel,
  onAction,
}: {
  emoji?: string;
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={{ padding: theme.spacing(6), alignItems: 'center', gap: theme.spacing(2) }}>
      <Txt size="display">{emoji}</Txt>
      <Txt size="bodyLarge" weight="semibold" align="center">
        {title}
      </Txt>
      {detail ? (
        <Txt size="small" color={theme.colors.textMuted} align="center">
          {detail}
        </Txt>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

export function ErrorState({
  title,
  detail,
  onRetry,
  retryLabel = 'Retry',
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Card style={{ borderColor: theme.colors.danger }}>
      <Column gap={2}>
        <Txt size="bodyLarge" weight="semibold" color={theme.colors.danger}>
          {title}
        </Txt>
        {detail ? (
          <Txt size="small" color={theme.colors.textMuted}>
            {detail}
          </Txt>
        ) : null}
        {onRetry ? <Button label={retryLabel} variant="secondary" onPress={onRetry} /> : null}
      </Column>
    </Card>
  );
}

/* ── question presentation ───────────────────────────────────────────────── */

export function DifficultyPill({ difficulty }: { difficulty: number }): React.JSX.Element {
  const theme = useTheme();
  const color = difficultyColor(theme, difficulty);
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 3,
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing(2),
        paddingVertical: theme.spacing(1),
      }}
      accessibilityLabel={'Difficulty ' + difficulty + ' of 9'}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <View
          key={'dot-' + index}
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: index < difficulty ? color : theme.colors.borderStrong,
          }}
        />
      ))}
    </View>
  );
}

export function OptionButton({
  label,
  text,
  onPress,
  state = 'idle',
  disabled = false,
}: {
  label: string;
  text: string;
  onPress: () => void;
  state?: 'idle' | 'selected' | 'correct' | 'wrong';
  disabled?: boolean;
}): React.JSX.Element {
  const theme = useTheme();
  const palette = {
    idle: { bg: theme.colors.surface, border: theme.colors.border, fg: theme.colors.text },
    selected: { bg: theme.colors.primarySoft, border: theme.colors.primary, fg: theme.colors.text },
    correct: { bg: theme.colors.successSoft, border: theme.colors.success, fg: theme.colors.text },
    wrong: { bg: theme.colors.dangerSoft, border: theme.colors.danger, fg: theme.colors.text },
  }[state];

  const scale = usePressScale(theme, 0.97);
  // A little pop when this option resolves to correct/wrong, so the outcome
  // registers before the reader even parses the checkmark.
  const pop = useRef(new Animated.Value(1)).current;
  const previousState = useRef(state);
  useEffect(() => {
    if (previousState.current === state) return;
    previousState.current = state;
    if (theme.reduceAnimations || state === 'idle' || state === 'selected') return;
    pop.setValue(1);
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.05, duration: 110, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [state, pop, theme.reduceAnimations]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={scale.onPressIn}
      onPressOut={scale.onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label + '. ' + text}
      accessibilityState={{ selected: state !== 'idle', disabled }}
    >
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing(3),
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: state === 'idle' ? 1 : 2,
          borderRadius: theme.radius.md,
          padding: theme.spacing(3),
          minHeight: 52,
          transform: [{ scale: Animated.multiply(scale.value, pop) }],
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size="small" weight="bold">
            {label}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <MathText size="body">{text}</MathText>
        </View>
        {state === 'correct' ? <Txt size="bodyLarge">✓</Txt> : null}
        {state === 'wrong' ? <Txt size="bodyLarge">✕</Txt> : null}
      </Animated.View>
    </Pressable>
  );
}

export function SolutionSteps({
  steps,
  explanation,
  answerLabel,
  answer,
}: {
  steps: readonly { order: number; title?: string; detail: string; expression?: string }[];
  explanation?: string;
  answerLabel: string;
  answer: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <Column gap={3}>
      {steps.map((step) => (
        <Row key={'step-' + step.order} align="flex-start" gap={3}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            <Txt size="caption" weight="bold" color={theme.colors.primary}>
              {step.order}
            </Txt>
          </View>
          <View style={{ flex: 1, gap: theme.spacing(1) }}>
            {step.title ? (
              <Txt size="small" weight="semibold">
                {step.title}
              </Txt>
            ) : null}
            <Txt size="body">{step.detail}</Txt>
            {step.expression ? <MathText size="body">{step.expression}</MathText> : null}
          </View>
        </Row>
      ))}
      <View
        style={{
          backgroundColor: theme.colors.successSoft,
          borderRadius: theme.radius.md,
          padding: theme.spacing(3),
        }}
      >
        <Txt size="caption" color={theme.colors.textMuted}>
          {answerLabel}
        </Txt>
        <MathText size="bodyLarge">{answer}</MathText>
      </View>
      {explanation ? (
        <View
          style={{
            backgroundColor: theme.colors.infoSoft,
            borderRadius: theme.radius.md,
            padding: theme.spacing(3),
          }}
        >
          <Txt size="small">{explanation}</Txt>
        </View>
      ) : null}
    </Column>
  );
}

/** Countdown used by exams and games. Pure JS timer, no animation cost. */
export function Countdown({
  seconds,
  onExpire,
  running = true,
  label,
}: {
  seconds: number;
  onExpire?: () => void;
  running?: boolean;
  label?: string;
}): React.JSX.Element {
  const theme = useTheme();
  const [remaining, setRemaining] = useState(seconds);
  const expired = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    expired.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          if (!expired.current) {
            expired.current = true;
            onExpire?.();
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onExpire]);

  const urgent = remaining <= 30;
  return (
    <View style={{ alignItems: 'flex-end' }}>
      {label ? (
        <Txt size="caption" color={theme.colors.textMuted}>
          {label}
        </Txt>
      ) : null}
      <Txt size="title" weight="bold" mono color={urgent ? theme.colors.danger : theme.colors.text}>
        {formatClock(remaining)}
      </Txt>
    </View>
  );
}

/** Elapsed-time counter for practice. */
export function useElapsed(runningKey: unknown): number {
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => clearInterval(id);
  }, [runningKey]);

  return elapsed;
}

/** Toast host; fades in unless animations are reduced (spec §46). */
export function Toast({
  kind,
  title,
  detail,
  onDismiss,
}: {
  kind: 'success' | 'info' | 'warning' | 'error' | 'achievement';
  title: string;
  detail?: string;
  onDismiss: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(theme.reduceAnimations ? 1 : 0)).current;

  useEffect(() => {
    if (!theme.reduceAnimations) {
      Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
    }
    const id = setTimeout(onDismiss, 3200);
    return () => clearTimeout(id);
  }, [progress, onDismiss, theme.reduceAnimations]);

  const tint = {
    success: theme.colors.success,
    info: theme.colors.info,
    warning: theme.colors.warning,
    error: theme.colors.danger,
    achievement: theme.colors.accent,
  }[kind];

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        backgroundColor: theme.colors.surface,
        borderColor: tint,
        borderWidth: 1,
        borderLeftWidth: 4,
        borderRadius: theme.radius.md,
        padding: theme.spacing(3),
        marginTop: theme.spacing(2),
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.1,
        shadowRadius: 10,
        elevation: 4,
      }}
    >
      <Txt size="body" weight="semibold" color={tint}>
        {title}
      </Txt>
      {detail ? (
        <Txt size="caption" color={theme.colors.textMuted}>
          {detail}
        </Txt>
      ) : null}
    </Animated.View>
  );
}

/** Horizontal chip strip used for filters. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  labelFor,
  colorFor,
}: {
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labelFor: (option: T) => string;
  colorFor?: (option: T) => string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing(2), paddingVertical: theme.spacing(1) }}
    >
      {options.map((option) => (
        <Chip
          key={option}
          label={labelFor(option)}
          selected={option === value}
          color={colorFor?.(option)}
          onPress={() => onChange(option)}
        />
      ))}
    </ScrollView>
  );
}

export function useStableCallbackKey(...values: unknown[]): string {
  return useMemo(() => values.map((v) => String(v)).join('|'), values);
}
