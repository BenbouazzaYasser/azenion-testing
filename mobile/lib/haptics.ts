import * as Haptics from "expo-haptics";

/** Best-effort haptics; never throws, never blocks UI. */
export async function tap(style: "light" | "medium" | "success" = "light"): Promise<void> {
  try {
    if (style === "success") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(
        style === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      );
    }
  } catch {
    // Haptics unavailable (e.g. simulator) — ignore.
  }
}
