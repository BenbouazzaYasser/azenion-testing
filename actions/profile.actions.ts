"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validations/profile.schema";

export async function updateProfile(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rawSkills = formData.get("skills");
  const skills =
    typeof rawSkills === "string" && rawSkills.length > 0
      ? rawSkills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const raw = {
    full_name: formData.get("full_name") as string,
    username: formData.get("username") as string,
    bio: (formData.get("bio") as string) || null,
    institution: (formData.get("institution") as string) || null,
    skills,
    github_url: (formData.get("github_url") as string) || null,
    linkedin_url: (formData.get("linkedin_url") as string) || null,
  };

  const parsed = profileSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors).flat()[0];
    return { error: firstError ?? "Invalid input" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function uploadAvatar(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const file = formData.get("avatar") as File;

  if (!file || file.size === 0) {
    return { error: "No file provided" };
  }

  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { error: "File too large. Maximum size is 2MB" };
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Invalid file type. Use SVG, PNG, JPEG, or WebP" };
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filePath = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/profile");
  return { success: true, avatar_url: publicUrl };
}
