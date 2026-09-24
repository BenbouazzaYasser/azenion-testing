import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text as RNText, TextInput as RNTextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { lineHeight, palette, radius, spacing, type } from "../lib/theme";

export function Screen({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <SafeAreaView style={[styles.screen, padded && styles.padded]}>{children}</SafeAreaView>
  );
}

export function Txt({
  children,
  variant = "body",
  color = palette.ink50,
  weight,
  numberOfLines,
  onPress,
}: {
  children: React.ReactNode;
  variant?: keyof typeof type;
  color?: string;
  weight?: "400" | "600" | "700";
  numberOfLines?: number;
  onPress?: () => void;
}) {
  return (
    <RNText
      numberOfLines={numberOfLines}
      onPress={onPress}
      style={{
        fontSize: type[variant],
        lineHeight: lineHeight[variant],
        color,
        fontWeight: weight ?? "400",
      }}
    >
      {children}
    </RNText>
  );
}

export function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDim,
      ]}
    >
      <RNText style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary]}>
        {title}
      </RNText>
    </Pressable>
  );
}

/**
 * Touchable with visible press feedback, a 44px-minimum touch target for
 * icon-only controls, and first-class accessibility labeling. Prefer this
 * over raw Pressable for every interactive row/icon.
 */
export function Press({
  children,
  onPress,
  label,
  disabled,
  direction = "row",
  gap = spacing.sm,
  align = "center",
}: {
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  direction?: "row" | "column";
  gap?: number;
  align?: "center" | "flex-start" | "flex-end";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        {
          flexDirection: direction,
          gap,
          alignItems: align,
          opacity: disabled ? 0.5 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          minHeight: 44,
          justifyContent: "center",
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

/**
 * Image with a graceful fallback: while loading shows the surface tint;
 * on failure renders nothing (callers decide layout) via onFail.
 */
export function SafeImage({
  uri,
  width,
  height,
  borderRadius = radius.md,
  topMargin = 0,
}: {
  uri?: string | null;
  width: number | "100%";
  height: number;
  borderRadius?: number;
  topMargin?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return null;
  return (
    <Image
      source={{ uri }}
      style={{ width, height, borderRadius, backgroundColor: palette.surfaceHover, marginTop: topMargin }}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  keyboardType?: "default" | "email-address";
  returnKeyType?: "done" | "go" | "next" | "search" | "send";
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <RNTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.ink500}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      autoFocus={autoFocus}
      style={styles.input}
    />
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.surfaceHover }}
        onError={() => setFailed(true)}
      />
    );
  }
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <RNText style={{ color: palette.ink100, fontWeight: "600", fontSize: size * 0.4 }}>{initial}</RNText>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={palette.accent400} />
      {label ? <View style={{ height: spacing.sm }} /> : null}
      {label ? <Txt color={palette.ink400}>{label}</Txt> : null}
    </View>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.center}>
      <Txt variant="subtitle" weight="600">
        {title}
      </Txt>
      {hint ? (
        <Txt color={palette.ink400} variant="caption">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Txt color={palette.danger}>{message}</Txt>
      {onRetry ? (
        <View style={{ height: spacing.sm }}>
          <Button title="Retry" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Txt variant="title" weight="700">
        {title}
      </Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  padded: { padding: spacing.md },
  button: {
    backgroundColor: palette.accent,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonSecondary: {
    backgroundColor: palette.surfaceHover,
    borderColor: palette.borderStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  buttonDim: { opacity: 0.5 },
  buttonText: {
    color: palette.onAccent,
    fontWeight: "600",
    fontSize: type.body,
    lineHeight: lineHeight.body,
  },
  buttonTextSecondary: { color: palette.ink100 },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    color: palette.ink50,
    fontSize: type.body,
    lineHeight: lineHeight.body,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarFallback: {
    backgroundColor: palette.accent500,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.xs },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
});
