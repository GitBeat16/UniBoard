"use client";

/**
 * TextPressure — from React Bits (https://reactbits.dev) by David Haz, the
 * JS-CSS variant. Ported there from https://codepen.io/JuanFuentes/full/rgXKGQ.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause; the full notice is in
 * ./LICENSE.md. Used here as part of UniBoard — the component itself may not
 * be sold or redistributed on its own.
 *
 * Changes for UniBoard:
 * - Its injected <style> defined global `.flex` and `.stroke` classes, which
 *   would have overridden Tailwind's `flex` on every element of the page. The
 *   classes are now `text-pressure-flex` / `text-pressure-stroke`.
 * - No font is fetched at runtime. The original @imported Roboto Flex from
 *   Google on every visit; the landing page self-hosts it with next/font and
 *   passes the family in. `fontUrl` still works if you give it one.
 * - The size comes from CSS (container query units) instead of a measurement
 *   after mount, so the word is the right size from the first paint rather
 *   than jumping up from `minFontSize`.
 * - `italic` also drives the `slnt` axis. The original set only `ital`, which
 *   Roboto Flex doesn't have, so italic did nothing with the default font.
 * - Accessibility: the heading is read as `label` (or `text`) once, not one
 *   letter at a time.
 * - It rests when nobody can see it: the per-frame loop stops off-screen, and
 *   under reduced motion the word is drawn once and holds still.
 * - A space keeps a minimum width, so compressed words don't run together.
 * - `drift`: with no pointer moving (every phone), the pressure point sweeps
 *   slowly across the word so touch screens see the effect too.
 */
import { useEffect, useRef, useState, useMemo } from 'react';

const dist = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getAttr = (distance, maxDist, minVal, maxVal) => {
  const val = maxVal - Math.abs((maxVal * distance) / maxDist);
  return Math.max(minVal, val + minVal);
};

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/** Pointer idle this long (ms) before the drift takes over. */
const DRIFT_AFTER = 2500;

/**
 * @typedef {object} TextPressureProps
 * @property {string} [text]
 * @property {string} [label] What a screen reader hears. Default: `text`.
 * @property {import('react').ElementType} [as] Default: h1.
 * @property {string} [fontFamily] A variable font with wght/wdth (and slnt) axes.
 * @property {string} [fontUrl] Only if the font isn't loaded by the page.
 * @property {boolean} [width]
 * @property {boolean} [weight]
 * @property {boolean} [italic]
 * @property {boolean} [alpha]
 * @property {boolean} [flex]
 * @property {boolean} [stroke]
 * @property {boolean} [scale]
 * @property {boolean} [drift]
 * @property {string} [textColor]
 * @property {string} [strokeColor]
 * @property {string} [className]
 * @property {number} [minFontSize]
 */

/** @param {TextPressureProps} props */
const TextPressure = ({
  text = 'Compressa',
  label,
  as: Tag = 'h1',
  fontFamily = 'Roboto Flex',
  fontUrl,

  width = true,
  weight = true,
  italic = true,
  alpha = false,

  flex = true,
  stroke = false,
  scale = false,
  drift = true,

  textColor = '#FFFFFF',
  strokeColor = '#FF0000',
  className = '',

  minFontSize = 24
}) => {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const spansRef = useRef([]);

  const mouseRef = useRef({ x: 0, y: 0 });
  const cursorRef = useRef({ x: 0, y: 0 });
  const lastMoveRef = useRef(-Infinity);

  const [scaleY, setScaleY] = useState(1);
  const [lineHeight, setLineHeight] = useState(1);

  const chars = text.split('');

  useEffect(() => {
    const handleMouseMove = e => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      lastMoveRef.current = performance.now();
    };
    const handleTouchMove = e => {
      const t = e.touches[0];
      cursorRef.current.x = t.clientX;
      cursorRef.current.y = t.clientY;
      lastMoveRef.current = performance.now();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    if (containerRef.current) {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = left + width / 2;
      mouseRef.current.y = top + height / 2;
      cursorRef.current.x = mouseRef.current.x;
      cursorRef.current.y = mouseRef.current.y;
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Only `scale` needs a measurement; the font size itself is CSS (below).
  useEffect(() => {
    if (!scale) return;
    const measure = () => {
      if (!containerRef.current || !titleRef.current) return;
      setScaleY(1);
      setLineHeight(1);
      requestAnimationFrame(() => {
        if (!containerRef.current || !titleRef.current) return;
        const containerH = containerRef.current.getBoundingClientRect().height;
        const textH = titleRef.current.getBoundingClientRect().height;
        if (textH > 0) {
          setScaleY(containerH / textH);
          setLineHeight(containerH / textH);
        }
      });
    };
    const debounced = debounce(measure, 100);
    debounced();
    window.addEventListener('resize', debounced);
    return () => window.removeEventListener('resize', debounced);
  }, [scale, chars.length, minFontSize]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let visible = true;

    const paint = () => {
      if (!titleRef.current) return;
      const titleRect = titleRef.current.getBoundingClientRect();
      const maxDist = titleRect.width / 2;

      spansRef.current.forEach(span => {
        if (!span) return;

        const rect = span.getBoundingClientRect();
        const charCenter = {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2
        };

        const d = dist(mouseRef.current, charCenter);

        const wdth = width ? Math.floor(getAttr(d, maxDist, 5, 200)) : 100;
        const wght = weight ? Math.floor(getAttr(d, maxDist, 100, 900)) : 400;
        const italVal = italic ? getAttr(d, maxDist, 0, 1) : 0;
        const alphaVal = alpha ? getAttr(d, maxDist, 0, 1).toFixed(2) : 1;

        const newFontVariationSettings = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal.toFixed(2)}, 'slnt' ${(-10 * italVal).toFixed(1)}`;

        if (span.style.fontVariationSettings !== newFontVariationSettings) {
          span.style.fontVariationSettings = newFontVariationSettings;
        }
        if (alpha && span.style.opacity !== alphaVal) {
          span.style.opacity = alphaVal;
        }
      });
    };

    if (reduced) {
      // One still frame: the resting shape, pressed from the middle.
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        mouseRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      paint();
      return;
    }

    const animate = now => {
      if (drift && now - lastMoveRef.current > DRIFT_AFTER && containerRef.current) {
        // Nobody is pointing: sweep slowly side to side across the word.
        const r = containerRef.current.getBoundingClientRect();
        cursorRef.current.x = r.left + r.width * (0.5 + 0.42 * Math.sin(now / 1400));
        cursorRef.current.y = r.top + r.height / 2;
      }
      mouseRef.current.x += (cursorRef.current.x - mouseRef.current.x) / 15;
      mouseRef.current.y += (cursorRef.current.y - mouseRef.current.y) / 15;
      paint();
      rafId = visible ? requestAnimationFrame(animate) : 0;
    };

    // Stop the per-frame work while the word is scrolled out of view.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !rafId) rafId = requestAnimationFrame(animate);
    });
    if (containerRef.current) io.observe(containerRef.current);

    rafId = requestAnimationFrame(animate);
    return () => {
      io.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [width, weight, italic, alpha, drift]);

  const styleElement = useMemo(() => {
    return (
      <style>{`
        ${fontUrl ? `@import url('${fontUrl}');` : ''}

        .text-pressure-flex {
          display: flex;
          justify-content: space-between;
        }

        .text-pressure-stroke span {
          position: relative;
          color: ${textColor};
        }
        .text-pressure-stroke span::after {
          content: attr(data-char);
          position: absolute;
          left: 0;
          top: 0;
          color: transparent;
          z-index: -1;
          -webkit-text-stroke-width: 3px;
          -webkit-text-stroke-color: ${strokeColor};
        }

        .text-pressure-title {
          color: ${textColor};
        }
      `}</style>
    );
  }, [fontUrl, textColor, strokeColor]);

  const dynamicClassName = [className, flex ? 'text-pressure-flex' : '', stroke ? 'text-pressure-stroke' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'transparent',
        // Lets the font size below be a share of this box's width.
        containerType: 'inline-size'
      }}
    >
      {styleElement}
      <Tag
        ref={titleRef}
        aria-label={label ?? text}
        className={`text-pressure-title ${dynamicClassName}`}
        style={{
          fontFamily,
          textTransform: 'uppercase',
          // The original measured the box after mount: width / (letters / 2).
          fontSize: `max(${minFontSize}px, ${(200 / chars.length).toFixed(3)}cqw)`,
          lineHeight,
          transform: `scale(1, ${scaleY})`,
          transformOrigin: 'center top',
          margin: 0,
          textAlign: 'center',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          fontWeight: 100,
          width: '100%'
        }}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            aria-hidden="true"
            ref={el => {
              spansRef.current[i] = el;
            }}
            data-char={char}
            style={{
              display: 'inline-block',
              color: stroke ? undefined : textColor,
              // A space squeezed to hairline width runs the words together.
              minWidth: char === ' ' ? '0.28em' : undefined
            }}
          >
            {char}
          </span>
        ))}
      </Tag>
    </div>
  );
};

export default TextPressure;
