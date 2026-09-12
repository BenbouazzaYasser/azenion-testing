import { ActivityIndicator, Image, Pressable, StyleSheet, Text as RNText, TextInput as RNTextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, radius, spacing, type } from "../lib/theme";

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
  return <RNText numberOfLines={numberOfLines} onPress={onPress} style={{ fontSize: type[variant], color, fontWeight: weight ?? "400" }}>{children}</RNText>;
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
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        (disabled || pressed) && styles.buttonDim,
      ]}
    >
      <RNText style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary]}>
        {title}
      </RNText>
    </Pressable>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  keyboardType?: "default" | "email-address";
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
      style={styles.input}
    />
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name?: string | null; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.surfaceHover }} />;
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
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  buttonSecondary: { backgroundColor: palette.surfaceHover, borderWidth: 1, borderColor: palette.borderStrong },
  buttonDim: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: type.body },
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
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatarFallback: { backgroundColor: palette.accent500, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.xs },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
});
