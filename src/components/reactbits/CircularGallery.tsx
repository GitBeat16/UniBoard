"use client";

/**
 * CircularGallery — from React Bits (https://reactbits.dev) by David Haz.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause; the full notice is in
 * ./LICENSE.md. Used here as part of UniBoard — the component itself may not
 * be sold or redistributed on its own.
 *
 * Changes for UniBoard:
 * - Input stays with the gallery. The original listened for wheel, mouse and
 *   touch on the whole window, so scrolling anywhere on the page spun it and
 *   a drag anywhere moved it. Now a drag has to start on the gallery (pointer
 *   events, so mouse, pen and touch are one path), and the wheel only counts
 *   when it is sideways (a trackpad swipe, or shift+wheel) — an ordinary
 *   scroll passes through to the page. `touch-action: pan-y` keeps vertical
 *   swipes scrolling the page on a phone.
 * - No font is fetched: the default (Figtree) came from Google on every
 *   visit. Titles use the font the gallery sits in, once it has loaded.
 * - `autoplay`: a slow drift when nobody is holding it, paused on hover,
 *   drag and focus, off under reduced motion.
 * - Rests off-screen (no frames while scrolled away), sizes from a
 *   ResizeObserver on its own box rather than the window, and hands back its
 *   WebGL context on unmount.
 * - `planeWidth` / `planeHeight` set the card's proportions (they were fixed
 *   at 700 × 900) so phone-shaped screenshots aren't cropped.
 * - `onError`: called if WebGL can't start, so the page can show a plain
 *   fallback instead of an empty box.
 * - No placeholder images: `items` is required.
 */
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef } from "react";

type GL = Renderer["gl"];

export type GalleryItem = { image: string; text: string };

function debounce<A extends unknown[]>(func: (...args: A) => void, wait: number) {
  let timeout: number;
  return (...args: A) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

function getFontSize(font: string): number {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(
  gl: GL,
  text: string,
  font: string = "bold 30px monospace",
  color: string = "black"
): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get 2d context");

  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const fontSize = getFontSize(font);
  const textHeight = Math.ceil(fontSize * 1.2);

  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;

  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

interface TitleProps {
  gl: GL;
  plane: Mesh;
  text: string;
  textColor?: string;
  font?: string;
}

class Title {
  gl: GL;
  plane: Mesh;
  text: string;
  textColor: string;
  font: string;
  mesh!: Mesh;

  constructor({ gl, plane, text, textColor = "#545050", font = "30px sans-serif" }: TitleProps) {
    this.gl = gl;
    this.plane = plane;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }

  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    this.layout(width / height);
    this.mesh.setParent(this.plane);
  }

  /** Scale is inherited from the plane, so this is in the plane's units. */
  layout(aspect: number) {
    let textHeightScaled = 0.1;
    // A long title never runs wider than its card, or it overlaps the next.
    const maxHeight = (0.96 * this.plane.scale.x) / (aspect * this.plane.scale.y);
    textHeightScaled = Math.min(textHeightScaled, maxHeight);
    const textWidthScaled = (textHeightScaled * aspect * this.plane.scale.y) / this.plane.scale.x;
    this.mesh.scale.set(textWidthScaled, textHeightScaled, 1);
    this.mesh.position.y = -0.5 - textHeightScaled * 0.5 - 0.03;
  }
}

interface ScreenSize {
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface MediaProps {
  geometry: Plane;
  gl: GL;
  image: string;
  index: number;
  length: number;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius?: number;
  font?: string;
  planeWidth: number;
  planeHeight: number;
}

class Media {
  extra: number = 0;
  geometry: Plane;
  gl: GL;
  image: string;
  index: number;
  length: number;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius: number;
  font?: string;
  planeWidth: number;
  planeHeight: number;
  program!: Program;
  plane!: Mesh;
  title!: Title;
  titleAspect: number = 1;
  scale!: number;
  padding!: number;
  width!: number;
  widthTotal!: number;
  x!: number;
  speed: number = 0;
  isBefore: boolean = false;
  isAfter: boolean = false;

  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius = 0,
    font,
    planeWidth,
    planeHeight,
  }: MediaProps) {
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.planeWidth = planeWidth;
    this.planeHeight = planeHeight;
    this.createShader();
    this.createMesh();
    this.onResize();
    // The second half starts one loop to the left, so the arc is full on
    // both sides from the first frame (the original began half empty).
    this.extra = index >= length / 2 ? this.widthTotal : 0;
    this.createTitle();
  }

  createShader() {
    const texture = new Texture(this.gl, {
      generateMipmaps: true,
    });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);

          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);

          // Smooth antialiasing for edges
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);

          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program,
    });
    this.plane.setParent(this.scene);
  }

  createTitle() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      text: this.text,
      textColor: this.textColor,
      font: this.font,
    });
  }

  update(scroll: { current: number; last: number }, direction: "right" | "left") {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);

      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen?: ScreenSize; viewport?: Viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    this.scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (this.planeHeight * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (this.planeWidth * this.scale)) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    const previousTotal = this.widthTotal;
    this.widthTotal = this.width * this.length;
    // Keep each card's place in the loop when the size changes.
    if (previousTotal) this.extra = (this.extra / previousTotal) * this.widthTotal;
    this.x = this.width * this.index;
    if (this.title) {
      const t = this.title.mesh.program.uniforms.tMap.value as Texture;
      const img = t.image as HTMLCanvasElement;
      this.title.layout(img.width / img.height);
    }
  }
}

interface AppConfig {
  items: GalleryItem[];
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  scrollSpeed: number;
  scrollEase: number;
  autoplay: number;
  planeWidth: number;
  planeHeight: number;
}

class App {
  container: HTMLElement;
  scrollSpeed: number;
  scroll: {
    ease: number;
    current: number;
    target: number;
    last: number;
    position?: number;
  };
  onCheckDebounce: () => void;
  renderer!: Renderer;
  gl!: GL;
  camera!: Camera;
  scene!: Transform;
  planeGeometry!: Plane;
  medias: Media[] = [];
  screen!: { width: number; height: number };
  viewport!: { width: number; height: number };
  raf: number = 0;

  autoplay: number;
  /** Anything holding the gallery still: hover, focus, a drag. */
  holds = new Set<string>();
  /** Until when the drift waits after a hand let go (ms, performance.now). */
  resumeAt = 0;
  visible = true;
  resizeObserver?: ResizeObserver;
  intersectionObserver?: IntersectionObserver;

  isDown: boolean = false;
  start: number = 0;

  constructor(container: HTMLElement, config: AppConfig) {
    this.container = container;
    this.scrollSpeed = config.scrollSpeed;
    this.autoplay = config.autoplay;
    this.scroll = { ease: config.scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(() => this.onCheck(), 200);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(config);
    this.addEventListeners();
    this.raf = window.requestAnimationFrame(this.update);
  }

  createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.gl = this.renderer.gl;
    if (!this.gl) throw new Error("WebGL is not available");
    this.gl.clearColor(0, 0, 0, 0);
    const canvas = this.gl.canvas as HTMLCanvasElement;
    canvas.style.display = "block";
    this.container.appendChild(canvas);
  }

  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100,
    });
  }

  createMedias({ items, bend, textColor, borderRadius, font, planeWidth, planeHeight }: AppConfig) {
    // Doubled, so the loop always has a card coming in at either edge.
    const all = items.concat(items);
    this.medias = all.map(
      (data, index) =>
        new Media({
          geometry: this.planeGeometry,
          gl: this.gl,
          image: data.image,
          index,
          length: all.length,
          scene: this.scene,
          screen: this.screen,
          text: data.text,
          viewport: this.viewport,
          bend,
          textColor,
          borderRadius,
          font,
          planeWidth,
          planeHeight,
        })
    );
  }

  onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.isDown = true;
    this.holds.add("drag");
    this.scroll.position = this.scroll.current;
    this.start = e.clientX;
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
  };

  onPointerMove = (e: PointerEvent) => {
    if (!this.isDown) return;
    const distance = (this.start - e.clientX) * (this.scrollSpeed * 0.025);
    this.scroll.target = (this.scroll.position ?? 0) + distance;
  };

  onPointerUp = () => {
    this.isDown = false;
    this.holds.delete("drag");
    this.resumeAt = performance.now() + 2500;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    this.onCheck();
  };

  onWheel = (e: WheelEvent) => {
    // Sideways only: a trackpad swipe, or shift + wheel. A plain vertical
    // scroll belongs to the page.
    const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = sideways ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!delta) return;
    e.preventDefault();
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.resumeAt = performance.now() + 2500;
    this.onCheckDebounce();
  };

  onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    this.scroll.target += (e.key === "ArrowRight" ? 1 : -1) * (this.medias[0]?.width ?? this.scrollSpeed * 5);
    this.onCheckDebounce();
  };

  hold = (reason: string) => () => this.holds.add(reason);
  release = (reason: string) => () => {
    this.holds.delete(reason);
    this.resumeAt = performance.now() + 1200;
  };
  onEnter = this.hold("hover");
  onLeave = this.release("hover");
  onFocus = this.hold("focus");
  onBlur = this.release("focus");

  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  onResize = () => {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height,
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    if (this.medias) {
      this.medias.forEach((media) => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  };

  update = (now: number) => {
    if (this.autoplay && this.holds.size === 0 && now > this.resumeAt) {
      this.scroll.target += this.autoplay;
    }
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    if (this.medias) {
      this.medias.forEach((media) => media.update(this.scroll, direction));
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = this.visible ? window.requestAnimationFrame(this.update) : 0;
  };

  addEventListeners() {
    const c = this.container;
    c.addEventListener("pointerdown", this.onPointerDown);
    c.addEventListener("wheel", this.onWheel, { passive: false });
    c.addEventListener("keydown", this.onKeyDown);
    c.addEventListener("pointerenter", this.onEnter);
    c.addEventListener("pointerleave", this.onLeave);
    c.addEventListener("focus", this.onFocus);
    c.addEventListener("blur", this.onBlur);

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(c);

    // No frames while it's scrolled out of view.
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible && !this.raf) this.raf = window.requestAnimationFrame(this.update);
    });
    this.intersectionObserver.observe(c);
  }

  destroy() {
    window.cancelAnimationFrame(this.raf);
    this.raf = 0;
    const c = this.container;
    c.removeEventListener("pointerdown", this.onPointerDown);
    c.removeEventListener("wheel", this.onWheel);
    c.removeEventListener("keydown", this.onKeyDown);
    c.removeEventListener("pointerenter", this.onEnter);
    c.removeEventListener("pointerleave", this.onLeave);
    c.removeEventListener("focus", this.onFocus);
    c.removeEventListener("blur", this.onBlur);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    const canvas = this.gl?.canvas as HTMLCanvasElement | undefined;
    canvas?.parentNode?.removeChild(canvas);
    this.gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

interface CircularGalleryProps {
  items: GalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  /** A canvas font string. Default: bold, in the font the gallery sits in. */
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  /** Drift per frame, in scene units. 0 turns it off. */
  autoplay?: number;
  planeWidth?: number;
  planeHeight?: number;
  className?: string;
  ariaLabel?: string;
  onError?: () => void;
}

export default function CircularGallery({
  items,
  bend = 3,
  textColor = "#ffffff",
  borderRadius = 0.05,
  font,
  scrollSpeed = 2,
  scrollEase = 0.05,
  autoplay = 0,
  planeWidth = 700,
  planeHeight = 900,
  className = "",
  ariaLabel = "Circular image gallery. Use Left and Right Arrow keys to navigate.",
  onError,
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let app: App | undefined;
    let isMounted = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const family = getComputedStyle(container).fontFamily || "sans-serif";
    // Drawn large and scaled down, so the titles stay sharp on a 2× screen.
    const resolved = font ?? `600 64px ${family}`;

    const ready = document.fonts?.load ? document.fonts.load(resolved).then(() => document.fonts.ready) : Promise.resolve();
    ready
      .catch(() => undefined)
      .then(() => {
        if (!isMounted) return;
        try {
          app = new App(container, {
            items,
            bend,
            textColor,
            borderRadius,
            font: resolved,
            scrollSpeed,
            scrollEase,
            autoplay: reduced ? 0 : autoplay,
            planeWidth,
            planeHeight,
          });
        } catch (error) {
          console.error("CircularGallery: WebGL could not start", error);
          onErrorRef.current?.();
        }
      });
    return () => {
      isMounted = false;
      app?.destroy();
    };
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, autoplay, planeWidth, planeHeight]);

  return (
    <div
      className={`h-full w-full cursor-grab overflow-hidden active:cursor-grabbing ${className}`}
      style={{ touchAction: "pan-y" }}
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    />
  );
}
