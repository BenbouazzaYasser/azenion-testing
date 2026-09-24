import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const alt = "Azenion team";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TeamOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let name = "Azenion Team";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("teams")
      .select("name")
      .eq("slug", slug)
      .eq("visibility", "public")
      .maybeSingle();
    if (data?.name) name = data.name;
  } catch {
    // Fall back to the generic card; OG generation must never throw.
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "96px",
          background:
            "radial-gradient(1200px 800px at 15% -10%, rgba(79,70,229,0.18), transparent 60%), radial-gradient(1000px 700px at 95% 110%, rgba(201,111,74,0.1), transparent 55%), linear-gradient(160deg, #211F1C 0%, #2B2824 55%, #37332E 100%)",
          color: "#F7F5F2",
        }}
      >
        <div style={{ display: "flex", fontSize: "88px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "28px" }}>
          {name}
        </div>
        <div style={{ display: "flex", fontSize: "38px", fontWeight: 500, color: "#EEE9E3", lineHeight: 1.25 }}>
          A team on Azenion
        </div>
        <div style={{ display: "flex", marginTop: "44px", fontSize: "24px", fontWeight: 400, color: "#B8AEA4" }}>
          Infinite minds. Limitless impact.
        </div>
      </div>
    ),
    size,
  );
}
