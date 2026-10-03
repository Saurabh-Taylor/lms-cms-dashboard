import { ImageResponse } from "next/og";
import { fetchVerification } from "./cert-data";

// OG card for the share unfurl — cert-style card: name + course + issuer mark.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const cert = await fetchVerification(serial);

  const gold = "#FD9E0F";
  const ink = "#2B2B2E";
  const cream = "#FBF7F1";

  if (!cert) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: cream, color: ink, fontSize: 48 }}>
        Certificate not found
      </div>,
      size,
    );
  }

  const revoked = cert.status === "revoked";
  return new ImageResponse(
    <div
      style={{
        display: "flex", flexDirection: "column", width: "100%", height: "100%",
        background: cream, padding: 48, fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex", flexDirection: "column", flex: 1, alignItems: "center",
          justifyContent: "center", border: `6px solid ${gold}`, borderRadius: 8,
          padding: 48, textAlign: "center", gap: 24,
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 8, color: "#8a8378", textTransform: "uppercase" }}>
          Microshala · Certificate of Completion
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: ink }}>{cert.learnerName}</div>
        <div style={{ fontSize: 26, color: "#8a8378" }}>has successfully completed</div>
        <div style={{ fontSize: 40, fontWeight: 600, color: ink }}>{cert.courseTitle}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 20, color: "#8a8378", fontFamily: "monospace" }}>
          {cert.serial}
        </div>
        {revoked && (
          <div
            style={{
              fontSize: 28, fontWeight: 800, color: "#b91c1c",
              letterSpacing: 8, textTransform: "uppercase",
            }}
          >
            Revoked
          </div>
        )}
      </div>
    </div>,
    size,
  );
}
