import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b3a2f",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 11,
            borderRadius: 48,
            border: "1px solid rgba(244,241,234,0.16)",
          }}
        />
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: 30,
            background: "#f4f1ea",
            boxShadow: "0 14px 30px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 22,
              left: 26,
              width: 46,
              height: 8,
              borderRadius: 999,
              background: "rgba(27,58,47,0.16)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 38,
              left: 26,
              width: 60,
              height: 8,
              borderRadius: 999,
              background: "rgba(27,58,47,0.16)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 54,
              left: 26,
              width: 40,
              height: 8,
              borderRadius: 999,
              background: "rgba(27,58,47,0.16)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 24,
              width: 32,
              height: 32,
              borderRadius: 999,
              background: "#1b3a2f",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 26,
              bottom: 22,
              width: 38,
              height: 8,
              borderRadius: 999,
              background: "#d4b483",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
