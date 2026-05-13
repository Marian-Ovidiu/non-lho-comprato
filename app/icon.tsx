import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
            inset: 34,
            borderRadius: 112,
            border: "1px solid rgba(244,241,234,0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 54,
            borderRadius: 96,
            border: "1px solid rgba(244,241,234,0.1)",
          }}
        />
        <div
          style={{
            width: 292,
            height: 292,
            borderRadius: 84,
            background: "#f4f1ea",
            boxShadow: "0 28px 70px rgba(0,0,0,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 60,
              left: 74,
              width: 128,
              height: 26,
              borderRadius: 999,
              background: "rgba(27,58,47,0.16)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 104,
              left: 74,
              width: 168,
              height: 26,
              borderRadius: 999,
              background: "rgba(27,58,47,0.16)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 148,
              left: 74,
              width: 112,
              height: 26,
              borderRadius: 999,
              background: "rgba(27,58,47,0.16)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 66,
              top: 70,
              width: 92,
              height: 92,
              borderRadius: 999,
              background: "#1b3a2f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 28px rgba(27,58,47,0.24)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: "#f4f1ea",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              right: 76,
              bottom: 70,
              width: 104,
              height: 20,
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
