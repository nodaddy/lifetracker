type AppIconMarkupProps = {
  size: number;
  rounded?: boolean;
};

export function AppIconMarkup({ size, rounded = false }: AppIconMarkupProps) {
  const panelSize = Math.round(size * 0.58);
  const panelRadius = Math.round(panelSize * 0.24);
  const outerRadius = rounded ? Math.round(size * 0.22) : 0;
  const markSize = Math.round(panelSize * 0.56);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        borderRadius: outerRadius,
        background: "linear-gradient(145deg, #080513 0%, #0d0820 38%, #130b2f 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-18%",
          left: "-12%",
          width: "58%",
          height: "58%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 62, 165, 0.42) 0%, transparent 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-10%",
          bottom: "-16%",
          width: "54%",
          height: "54%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(46, 242, 255, 0.34) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: `${Math.round(size * 0.08)}px ${Math.round(size * 0.08)}px`,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: panelSize,
          height: panelSize,
          borderRadius: panelRadius,
          background:
            "linear-gradient(160deg, rgba(24, 18, 52, 0.96) 0%, rgba(12, 10, 32, 0.94) 100%)",
          border: "1.5px solid rgba(46, 242, 255, 0.28)",
          boxShadow:
            "0 0 28px rgba(255, 62, 165, 0.22), 0 0 56px rgba(46, 242, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.14), inset 0 -1px 0 rgba(0, 0, 0, 0.35)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: Math.round(panelSize * 0.06),
            borderRadius: Math.round(panelRadius * 0.82),
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 42%)",
          }}
        />

        <svg
          width={markSize}
          height={markSize}
          viewBox="0 0 100 100"
          fill="none"
          style={{ position: "relative" }}
        >
          <defs>
            <linearGradient id="ltrack-stroke" x1="18" y1="82" x2="82" y2="18">
              <stop offset="0%" stopColor="#ff3ea5" />
              <stop offset="52%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#2ef2ff" />
            </linearGradient>
            <linearGradient id="ltrack-orbit" x1="0" y1="50" x2="100" y2="50">
              <stop offset="0%" stopColor="rgba(46, 242, 255, 0)" />
              <stop offset="50%" stopColor="rgba(168, 85, 247, 0.55)" />
              <stop offset="100%" stopColor="rgba(255, 62, 165, 0)" />
            </linearGradient>
            <radialGradient id="ltrack-dot-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2ef2ff" />
              <stop offset="100%" stopColor="#0891b2" />
            </radialGradient>
          </defs>

          <path
            d="M62 24 A 30 30 0 0 1 82 54"
            stroke="url(#ltrack-orbit)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          <path
            d="M30 24 V72 H72"
            stroke="url(#ltrack-stroke)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle cx="72" cy="72" r="7.5" fill="url(#ltrack-dot-glow)" />
          <circle cx="72" cy="72" r="3.2" fill="#ecfeff" />
        </svg>
      </div>
    </div>
  );
}
