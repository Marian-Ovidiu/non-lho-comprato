type CelebrateOptions = {
  x?: number;
  y?: number;
  count?: number;
  spread?: number;
};

const DEFAULT_SPARK_COUNT = 16;
const DEFAULT_SPREAD = 96;
const MAX_SPARK_COUNT = 40;

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getOrigin({ x, y }: CelebrateOptions) {
  return {
    x: x ?? window.innerWidth / 2,
    y: y ?? window.innerHeight * 0.42,
  };
}

function removeNode(node: HTMLElement) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

export function celebrate(options: CelebrateOptions = {}) {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    prefersReducedMotion()
  ) {
    return;
  }

  const count = Math.min(
    MAX_SPARK_COUNT,
    Math.max(0, options.count ?? DEFAULT_SPARK_COUNT),
  );

  if (count === 0) {
    return;
  }

  const origin = getOrigin(options);
  const spread = options.spread ?? DEFAULT_SPREAD;
  const fragment = document.createDocumentFragment();
  const sparks: HTMLElement[] = [];

  for (let index = 0; index < count; index += 1) {
    const spark = document.createElement("span");
    const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.7;
    const distance = spread * (0.55 + Math.random() * 0.65);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - spread * 0.2;
    const duration = 560 + Math.random() * 420;
    const size = 5 + Math.random() * 4;

    spark.className = "nlc-spark";
    spark.style.position = "fixed";
    spark.style.left = `${origin.x}px`;
    spark.style.top = `${origin.y}px`;
    spark.style.zIndex = "120";
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.opacity = "0";
    spark.style.transform = "translate(-50%, -50%) scale(0.6) rotate(0deg)";

    fragment.appendChild(spark);
    sparks.push(spark);

    const animation = spark.animate(
      [
        {
          opacity: 0,
          transform: "translate(-50%, -50%) scale(0.45) rotate(0deg)",
        },
        {
          opacity: 1,
          offset: 0.16,
          transform: "translate(-50%, -50%) scale(1) rotate(45deg)",
        },
        {
          opacity: 0,
          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.15) rotate(${160 + Math.random() * 220}deg)`,
        },
      ],
      {
        duration,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      },
    );

    void animation.finished
      .catch(() => undefined)
      .finally(() => removeNode(spark));
  }

  document.body.appendChild(fragment);

  window.setTimeout(() => {
    sparks.forEach(removeNode);
  }, 1400);
}
