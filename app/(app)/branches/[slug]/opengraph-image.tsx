import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const alt = "Azenion branch";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function BranchOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let name = "Azenion Branch";
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("branches").select("name").eq("slug", slug).maybeSingle();
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
            "radial-gradient(1200px 800px at 15% -10%, rgba(40,40,255,0.28), transparent 60%), radial-gradient(1000px 700px at 95% 110%, rgba(109,109,255,0.22), transparent 55%), linear-gradient(160deg, #050507 0%, #0a0b10 55%, #0e1016 100%)",
          color: "#F4F5F8",
        }}
      >
        <div style={{ display: "flex", fontSize: "88px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "28px" }}>
          {name}
        </div>
        <div style={{ display: "flex", fontSize: "38px", fontWeight: 500, color: "#DEE0E9", lineHeight: 1.25 }}>
          A branch hub on Azenion
        </div>
        <div style={{ display: "flex", marginTop: "44px", fontSize: "24px", fontWeight: 400, color: "#a9acba" }}>
          Infinite minds. Limitless impact.
        </div>
      </div>
    ),
    size,
  );
}
