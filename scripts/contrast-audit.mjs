#!/usr/bin/env node
/**
 * contrast-audit — static WCAG 2.1 contrast checker for GoalEdge.
 *
 * Why this exists
 * ───────────────
 * Light mode shipped with 416 text elements below AA (measured against
 * 145f860, the commit before the LIGHT-MODE CONTRAST block landed in
 * src/app/globals.css). It now measures 0, and this is the regression guard
 * that keeps it there:
 *
 *     npm run audit:contrast          # light mode — the gate, must stay at 0
 *     npm run audit:contrast:dark     # dark mode — informational only
 *
 * Dark mode is NOT gated: the dark theme still carries ~195 sub-AA elements
 * of its own (mostly white on bg-emerald-500 and `dark:text-slate-500` on
 * slate-900). `--mode=dark` resolves `dark:` variants correctly, so that list
 * is real and can be worked down the same way light mode was.
 *
 * How it works (no browser needed)
 * ────────────────────────────────
 *  1. Rebuilds the effective colour palettes the way the cascade does:
 *     tailwindcss/theme.css → globals.css `@theme inline` → `:root` blocks in
 *     source order, plus the `.dark` and `.on-dark,.bg-pitch` scopes. oklch()
 *     values are converted to sRGB with CSS Color 4 gamut mapping, which
 *     reproduces the shipped hexes exactly.
 *  2. Parses every src/**\/*.tsx with the TypeScript compiler API and, for
 *     each text-bearing JSX element, resolves its effective colour (own
 *     className, else nearest ancestor), font size, weight, and the
 *     background it sits on — compositing alpha layers and gradients up the
 *     ancestor chain and honouring custom classes such as `.bg-pitch`.
 *     Conditional classNames (`scrolled ? A : B`, `cn(base, cond && X)`) are
 *     expanded into every reachable state, and states that disagree about the
 *     same condition are discarded, so the tool reports real renderings rather
 *     than impossible mixes.
 *  3. Applies WCAG thresholds: 4.5:1 body text, 3:1 large text (≥24px, or
 *     ≥18.66px bold) and icon-only elements (1.4.11 non-text contrast).
 *
 * Known blind spots (it is static analysis)
 * ─────────────────────────────────────────
 *   • In light mode variant-prefixed classes (hover:, dark:, md:, …) are
 *     ignored; in dark mode `dark:X` replaces the base utility in the same
 *     slot. Other variants (hover:, md:, …) are never audited — only the
 *     default state is audited.
 *   • Paint contributed by components defined in another file (<Card>,
 *     <Button>) is invisible; the walk stops at the file's root element.
 *   • Inline styles, style props and CSS modules are not resolved.
 *   • Elements whose text arrives through a portal are audited where they are
 *     declared, not where they render.
 *
 * Suppressing a false positive
 * ────────────────────────────
 * Add `contrast-audit-ignore: <reason>` in a comment on the element (leading
 * comment, inside the opening tag, or as the first JSX child comment).
 *
 * Usage
 *   node scripts/contrast-audit.mjs [--mode light|dark] [--json] [--quiet]
 *                                   [--file <substring>] [--trace <file>:<line>]
 *                                   [--skipped]
 *
 *   --file   audit only paths containing the substring (e.g. --file=Hero.tsx)
 *   --trace  print the full resolution chain for one element — the fastest way
 *            to see whether a finding is real or a modelling gap
 *   --skipped list elements whose background could not be resolved statically
 *
 * Exits 1 when there are unsuppressed failures, so it can gate CI.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const optValue = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
if (flag('help')) {
  console.log('Usage: node scripts/contrast-audit.mjs [--mode light|dark] [--json] [--file <substr>] [--trace <file>:<line>] [--skipped] [--quiet]');
  process.exit(0);
}
const MODE = optValue('mode') === 'dark' ? 'dark' : 'light';
const AS_JSON = flag('json');
const LIST_SKIPPED = flag('skipped');
const QUIET = flag('quiet');
const FILE_FILTER = optValue('file');
const TRACE = optValue('trace'); // e.g. --trace=AuthModal.tsx:132
const COMBO_CAP = 48;

/* ══════════════════════════════════════════════════════════════════════
   1. Colour maths
   ══════════════════════════════════════════════════════════════════════ */

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function oklchToLinear(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearToOklab([r, g, b]) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

const linearToSrgbChannel = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const inGamut = (lin, eps = 1e-4) => lin.every((v) => v >= -eps && v <= 1 + eps);
const deltaEOK = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** oklch → 0..255 sRGB via the CSS Color 4 gamut-mapping algorithm. */
function oklchToRgb(L, C, H) {
  const encode = (lin) => lin.map((v) => Math.round(clamp01(linearToSrgbChannel(clamp01(v))) * 255));
  const first = oklchToLinear(L, C, H);
  if (inGamut(first)) return encode(first);
  const JND = 0.002;
  let min = 0;
  let max = C;
  let minInGamut = true;
  while (max - min > 1e-4) {
    const chroma = (min + max) / 2;
    const cand = oklchToLinear(L, chroma, H);
    if (minInGamut && inGamut(cand)) {
      min = chroma;
      continue;
    }
    minInGamut = false;
    const clipped = cand.map(clamp01);
    if (deltaEOK(linearToOklab(clipped), linearToOklab(cand)) < JND) return encode(clipped);
    max = chroma;
  }
  return encode(oklchToLinear(L, min, H).map(clamp01));
}

/** Paint `fg` over `bg` (both {r,g,b,a}, channels 0..255). */
function composite(fg, bg) {
  const a = fg.a ?? 1;
  if (a >= 1) return { ...fg, a: 1 };
  const ba = bg.a ?? 1;
  const out = a + ba * (1 - a);
  if (out <= 0) return { ...bg };
  return {
    r: (fg.r * a + bg.r * ba * (1 - a)) / out,
    g: (fg.g * a + bg.g * ba * (1 - a)) / out,
    b: (fg.b * a + bg.b * ba * (1 - a)) / out,
    a: out,
  };
}

const srgbChannel = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = ({ r, g, b }) => 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
const toHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.round(clamp01(v / 255) * 255).toString(16).padStart(2, '0')).join('');

function hexToColor(hex, alpha = 1) {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const num = (i) => parseInt(h.slice(i, i + 2), 16);
  return {
    r: num(0),
    g: num(2),
    b: num(4),
    a: h.length >= 8 ? (num(6) / 255) * alpha : alpha,
  };
}

/** `20`, `20%` and `0.2` all mean 20% opacity in Tailwind's slash notation. */
function alphaOf(raw, hasPercent) {
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return 1;
  if (hasPercent) return n / 100;
  return n > 1 ? n / 100 : n;
}

function parseColor(value) {
  if (!value) return null;
  let v = String(value).trim();
  let alpha = 1;
  // Tailwind alpha modifier: text-white/70, bg-emerald-500/10, bg-white/[0.06]
  const tailwindAlpha = v.match(/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*\/\s*\[?([\d.]+)(%)?\]?$/);
  if (tailwindAlpha) {
    v = tailwindAlpha[1];
    alpha = alphaOf(tailwindAlpha[2], !!tailwindAlpha[3]);
  }
  const named = { white: '#ffffff', black: '#000000' };
  if (v === 'transparent' || v === 'currentColor' || v === 'inherit') return { transparent: true };
  if (named[v]) return hexToColor(named[v], alpha);
  if (v.startsWith('#')) return hexToColor(v, alpha);

  let m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map((p) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p)));
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] * alpha : alpha };
  }
  m = v.match(/^oklch\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].trim().split(/\s+/);
    const L = parts[0].endsWith('%') ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
    const C = parseFloat(parts[1]) || 0;
    const H = parseFloat(parts[2]) || 0;
    const slashIdx = parts.indexOf('/');
    if (slashIdx !== -1 && parts[slashIdx + 1]) {
      const a = parts[slashIdx + 1];
      alpha *= a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
    }
    if ([L, C, H].some(Number.isNaN)) return null;
    const [r, g, b] = oklchToRgb(L, C, H);
    return { r, g, b, a: alpha };
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   2. A small CSS scanner (enough for our own stylesheets)
   ══════════════════════════════════════════════════════════════════════ */

function skipTrivia(text, i) {
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    return i;
  }
}

function matchBrace(text, open) {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      i++;
      while (i < text.length && text[i] !== c) i += text[i] === '\\' ? 2 : 1;
    } else if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    } else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return text.length;
}

function parseDecls(body) {
  // Comments can contain ';' and ':' ("2.1 → 5.0:1); amber text …") and would
  // otherwise corrupt the declaration split.
  body = body.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const decls = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= body.length; i++) {
    const c = body[i];
    if (c === '(' || c === '{') depth++;
    else if (c === ')' || c === '}') depth--;
    else if ((c === ';' && depth === 0) || i === body.length) {
      const chunk = body.slice(start, i);
      start = i + 1;
      const colon = chunk.indexOf(':');
      if (colon > 0) {
        const prop = chunk.slice(0, colon).trim();
        const value = chunk.slice(colon + 1).trim();
        if (prop && value && !prop.includes('{') && !prop.startsWith('@')) decls.push([prop, value]);
      }
    }
  }
  return decls;
}

/** Collects {selector, atStack, decls} for every plain rule in a sheet. */
function collectRules(text, atStack = [], out = []) {
  let i = 0;
  while (i < text.length) {
    i = skipTrivia(text, i);
    if (i >= text.length) break;
    let j = i;
    let brace = -1;
    let semicolon = -1;
    while (j < text.length) {
      if (text[j] === ';') {
        semicolon = j;
        break;
      }
      if (text[j] === '{') {
        brace = j;
        break;
      }
      if (text[j] === '"' || text[j] === "'") {
        const q = text[j];
        j++;
        while (j < text.length && text[j] !== q) j++;
      }
      j++;
    }
    if (brace === -1) {
      // statement without a block (@import, @charset, stray declaration) — skip it
      i = semicolon === -1 ? text.length : semicolon + 1;
      continue;
    }
    const prelude = text.slice(i, brace).trim().replace(/\s+/g, ' ');
    const end = matchBrace(text, brace);
    const body = text.slice(brace + 1, end);
    if (prelude.startsWith('@')) {
      const name = prelude.slice(1).split(/[\s(]/)[0].toLowerCase();
      if (name === 'theme') {
        out.push({ selector: '@theme', atStack, decls: parseDecls(body) });
      } else if (!['keyframes', 'font-face', 'property', 'import', 'charset', 'namespace'].includes(name)) {
        collectRules(body, [...atStack, prelude], out);
      }
    } else if (prelude) {
      out.push({ selector: prelude, atStack, decls: parseDecls(body) });
    }
    i = end + 1;
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════
   3. Palettes
   ══════════════════════════════════════════════════════════════════════ */

const themePath = path.join(ROOT, 'node_modules/tailwindcss/theme.css');
const globalsPath = path.join(SRC, 'app/globals.css');
for (const p of [themePath, globalsPath]) {
  if (!fs.existsSync(p)) {
    console.error(`contrast-audit: missing ${path.relative(ROOT, p)}`);
    process.exit(2);
  }
}

const globalsRules = collectRules(fs.readFileSync(globalsPath, 'utf8'));
const allRules = [...collectRules(fs.readFileSync(themePath, 'utf8')), ...globalsRules];

const hasDark = (selector) => /(^|[\s,>+~(])\.dark\b/.test(selector);
const hasDarkSurface = (selector) => /(^|[\s,>+~(])\.(on-dark|bg-pitch)\b/.test(selector);

/** Balanced-paren end index for a `(` at `open`. */
function closeParen(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
}

/** Drops scope-only prefixes (:where(...), :is(...), html, body, *) from a selector. */
function stripScope(selector) {
  let s = selector.trim();
  for (;;) {
    let changed = false;
    for (const kw of [':where(', ':is(', ':not(', ':has(']) {
      if (s.startsWith(kw)) {
        s = s.slice(closeParen(s, kw.length - 1) + 1).trim();
        changed = true;
      }
    }
    const bare = s.match(/^(html|body|\*)(?![\w-])/);
    if (bare) {
      s = s.slice(bare[0].length).trim();
      changed = true;
    }
    if (!changed) return s;
  }
}

/**
 * Which of the three audited surfaces a rule applies to:
 *   light  – html without .dark, outside .on-dark / .bg-pitch
 *   ondark – light mode, inside .on-dark / .bg-pitch (stock palette restored)
 *   dark   – html.dark
 * `:not(.dark)` is itself a light-mode scoping (html has no .dark inside
 * .on-dark either), so those rules apply to light and on-dark surfaces.
 */
function scopesOf(selector, atStack) {
  let context = [...atStack, selector].join(' ');
  const lightOnly = /:not\(\s*\.dark\s*\)/.test(context);
  context = context.replace(/:not\([^()]*(?:\([^()]*\)[^()]*)*\)/g, ' ');
  if (hasDark(context)) return new Set(['dark']);
  if (lightOnly) return new Set(['light', 'ondark']);
  if (hasDarkSurface(context)) return new Set(['ondark', 'dark']);
  return new Set(['light', 'ondark', 'dark']);
}

const isVarScope = (selector) => {
  const stripped = stripScope(selector);
  return ['', ':root', ':host', 'html', 'body', '.dark', '.on-dark', '.bg-pitch'].includes(stripped);
};

const VAR_LAYERS = [];
for (const rule of allRules) {
  if (!rule.decls.some(([p]) => p.startsWith('--'))) continue;
  if (rule.selector !== '@theme') {
    // Palette variables come from sheet-wide scopes (:root/html) and from the
    // class scopes that re-declare them (.dark, .on-dark, .bg-pitch). Element
    // scoped overrides (`header[data-scrolled] { --x: … }`) are out of scope.
    const selectors = rule.selector.split(',');
    if (!selectors.every(isVarScope)) continue;
  }
  const scopes = new Set();
  for (const sel of rule.selector === '@theme' ? ['@theme'] : rule.selector.split(',')) {
    for (const scope of scopesOf(sel, rule.atStack)) scopes.add(scope);
  }
  VAR_LAYERS.push({ scopes, decls: rule.decls });
}

function resolveValue(value, vars, seen = new Set()) {
  const v = String(value).trim();
  const ref = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/);
  if (ref) {
    const [, name, fallback] = ref;
    if (seen.has(name)) return null;
    seen.add(name);
    const target = vars.get(name);
    if (target !== undefined) return resolveValue(target, vars, seen);
    return fallback ? resolveValue(fallback, vars, seen) : null;
  }
  if (/^color-mix\(/.test(v)) return null; // not used by our palette today
  return v;
}

function buildPalette(scope) {
  const vars = new Map();
  for (const layer of VAR_LAYERS) {
    if (!layer.scopes.has(scope)) continue;
    for (const [prop, value] of layer.decls) if (prop.startsWith('--')) vars.set(prop, value);
  }
  const palette = new Map();
  for (const [prop, value] of vars) {
    const resolved = resolveValue(value, vars);
    const color = resolved && parseColor(resolved);
    if (!color || color.transparent) continue;
    palette.set(prop.startsWith('--color-') ? prop.slice('--color-'.length) : `@${prop}`, { ...color, source: resolved });
  }
  return { vars, palette };
}

const LIGHT = buildPalette('light');
const ONDARK = buildPalette('ondark');
const DARK = buildPalette('dark');
const paletteFor = (surface) => (MODE === 'dark' ? DARK.palette : surface === 'ondark' ? ONDARK.palette : LIGHT.palette);
const varsFor = (surface) => (MODE === 'dark' ? DARK.vars : surface === 'ondark' ? ONDARK.vars : LIGHT.vars);

/** Base canvas when no ancestor paints a background. */
function pageBase(surface) {
  const vars = varsFor(surface);
  const bg = resolveValue(vars.get('--background') ?? '#ffffff', vars);
  return (bg && parseColor(bg)) || { r: 255, g: 255, b: 255, a: 1 };
}

/**
 * Classes declared in globals.css that paint a colour — both bespoke ones
 * (.bg-pitch, .odds-boost-badge) and Tailwind utilities the app re-declares
 * (`:where(html:not(.dark)) .text-slate-300`). Values stay raw and are
 * resolved per surface so var() indirection follows the right palette.
 */
function buildCustomClasses() {
  const maps = { light: new Map(), ondark: new Map(), dark: new Map() };
  const colorsOf = (value) =>
    [...value.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|oklch\([^)]+\)|hsla?\([^)]+\)|var\(--[\w-]+\)/g)].map((m) => m[0]);
  /** Splits `background-image: a, b, c` into its layers (CSS paints the first
   *  on top, so the last opaque layer is the one that decides contrast). */
  const layersOf = (value) => {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i <= value.length; i++) {
      const c = value[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if ((c === ',' && depth === 0) || i === value.length) {
        parts.push(value.slice(start, i).trim());
        start = i + 1;
      }
    }
    return parts.filter(Boolean);
  };
  for (const rule of globalsRules) {
    if (rule.selector === '@theme') continue;
    const selectors = rule.selector.split(',');
    const names = [];
    for (const sel of selectors) {
      const stripped = stripScope(sel);
      const m = stripped.match(/^\.([-\\\w]+)$/);
      if (m) names.push(m[1].replace(/\\/g, ''));
    }
    if (!names.length) continue;
    const decls = rule.decls.filter(([p]) =>
      ['background', 'background-color', 'background-image', 'color', 'background-clip', '-webkit-background-clip', '-webkit-text-fill-color'].includes(p),
    );
    if (!decls.length) continue;
    rule.order = globalsRules.indexOf(rule);
    const scopes = new Set();
    for (const sel of selectors) for (const scope of scopesOf(sel, rule.atStack)) scopes.add(scope);
    // A light-mode utility still applies inside .on-dark (the palette is what
    // changes there), so light-scoped rules seed every map.
    const targetScopes = new Set();
    if (scopes.has('light')) ['light', 'ondark', 'dark'].forEach((s) => targetScopes.add(s));
    if (scopes.has('ondark')) ['ondark', 'dark'].forEach((s) => targetScopes.add(s));
    if (scopes.has('dark')) targetScopes.add('dark');
    // A class is a dark surface only when it paints for on-dark/dark scopes
    // and never for plain light mode.
    const darkSurface = scopes.has('ondark') && !scopes.has('light');
    for (const scope of targetScopes) {
      const map = maps[scope];
      for (const name of names) {
        const prev = map.get(name) ?? {};
        const next = { ...prev, darkSurface: prev.darkSurface || darkSurface, order: rule.order };
        for (const [prop, value] of decls) {
          if (prop === 'color') next.fgRaw = value;
          else if (prop === 'background-clip' || prop === '-webkit-background-clip') next.clipText = next.clipText || /\btext\b/.test(value);
          else if (prop === '-webkit-text-fill-color') next.clipText = next.clipText || /transparent/.test(value);
          else {
            // Translucent tint layers sit on top of an opaque one; only the
            // opaque layer decides how text reads, so prefer it.
            const layers = layersOf(value);
            const opaqueLayers = layers
              .map((layer) => colorsOf(layer).filter((c) => !/transparent/.test(c)))
              .filter((colors) => colors.some((c) => !/\b0?\.?0?\d*\)$/.test(c) || /^#/.test(c)));
            const stops = opaqueLayers.length ? opaqueLayers[opaqueLayers.length - 1] : colorsOf(value);
            if (stops.length > 1) {
              next.bgStopsRaw = stops;
              next.bgRaw = stops[Math.floor(stops.length / 2)];
            } else if (stops.length === 1) {
              next.bgRaw = stops[0];
            } else next.bgRaw = value;
          }
        }
        if (next.clipText) {
          // `background-clip: text` paints the text itself with the gradient —
          // it is a foreground, not a surface.
          next.fgStopsRaw = next.bgStopsRaw ?? (next.bgRaw ? [next.bgRaw] : null);
          next.bgStopsRaw = null;
          next.bgRaw = null;
        }
        map.set(name, next);
      }
    }
  }
  return maps;
}

const CUSTOM_BY_SCOPE = buildCustomClasses();
const customFor = (surface) => (MODE === 'dark' ? CUSTOM_BY_SCOPE.dark : CUSTOM_BY_SCOPE[surface === 'ondark' ? 'ondark' : 'light']);

/** Resolves a custom class entry's colours against a surface's variables. */
function resolveCustom(entry, surface) {
  if (!entry) return null;
  const vars = varsFor(surface);
  const resolve = (raw) => {
    if (!raw) return null;
    const value = resolveValue(raw, vars);
    const color = value && parseColor(value);
    return color && !color.transparent ? color : null;
  };
  const fgAlts = entry.fgStopsRaw ? entry.fgStopsRaw.map(resolve).filter(Boolean) : null;
  return {
    order: entry.order ?? 0,
    fg: resolve(entry.fgRaw),
    fgAlts: fgAlts && fgAlts.length ? fgAlts : null,
    bg: resolve(entry.bgRaw),
    stops: entry.bgStopsRaw ? entry.bgStopsRaw.map(resolve).filter(Boolean) : null,
    darkSurface: !!entry.darkSurface,
  };
}

// Classes that only ever paint for on-dark/dark scopes (.bg-pitch, .on-dark).
const DARK_SURFACE_CLASSES = new Set([
  ...[...CUSTOM_BY_SCOPE.light.entries()].filter(([, v]) => v.darkSurface).map(([k]) => k),
  ...[...CUSTOM_BY_SCOPE.ondark.entries()].filter(([, v]) => v.darkSurface).map(([k]) => k),
  'on-dark',
]);


/* ══════════════════════════════════════════════════════════════════════
   4. Tailwind class tokens
   ══════════════════════════════════════════════════════════════════════ */

const FONT_SIZES = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128 };
const FONT_WEIGHTS = { thin: 100, extralight: 200, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };
const HIDDEN = new Set(['sr-only', 'hidden', 'invisible', 'opacity-0']);

const splitVariants = (token) => {
  const parts = token.split(':');
  return parts.length === 1 ? { variants: [], base: token } : { variants: parts.slice(0, -1), base: parts.at(-1) };
};

/** Colour for `text-*` / `bg-*` / gradient-stop payloads. */
function paletteColor(name, palette) {
  if (!name) return null;
  const hit = palette.get(name);
  if (hit) return hit;
  // alpha modifier: text-white/60, bg-emerald-500/15, bg-white/[0.06]
  const alphaMod = name.match(/^(.+)\/\[?([\d.]+)(%)?\]?$/);
  if (alphaMod) {
    const base = paletteColor(alphaMod[1], palette);
    if (base) return { ...base, a: (base.a ?? 1) * alphaOf(alphaMod[2], !!alphaMod[3]) };
  }
  if (name.startsWith('[') && name.endsWith(']')) {
    const c = parseColor(name.slice(1, -1));
    return c && !c.transparent ? c : null;
  }
  const direct = parseColor(name); // white, black, #fff, transparent…
  return direct && !direct.transparent ? direct : null;
}

function classifyToken(token, palette) {
  const { variants, base } = splitVariants(token);
  if (variants.length) return { kind: 'variant' };
  if (HIDDEN.has(base)) return { kind: 'hidden' };
  if (DARK_SURFACE_CLASSES.has(base)) return { kind: 'dark-surface' };

  if (base.startsWith('text-')) {
    const rest = base.slice(5);
    if (rest in FONT_SIZES) return { kind: 'size', px: FONT_SIZES[rest] };
    const arbitrary = rest.match(/^\[(.+)\]$/);
    if (arbitrary) {
      const px = arbitrary[1].match(/^([\d.]+)(px|rem)$/);
      if (px) return { kind: 'size', px: parseFloat(px[1]) * (px[2] === 'rem' ? 16 : 1) };
      const color = paletteColor(rest, palette);
      return color ? { kind: 'fg', color, label: base } : null;
    }
    const color = paletteColor(rest, palette);
    return color ? { kind: 'fg', color, label: base } : null;
  }
  if (base.startsWith('bg-')) {
    const rest = base.slice(3);
    if (/^(gradient|linear|radial|conic|none|clip)/.test(rest)) return null;
    const color = paletteColor(rest, palette);
    return color ? { kind: 'bg', color, label: base } : null;
  }
  if (/^(from|via|to)-/.test(base)) {
    const color = paletteColor(base.slice(base.indexOf('-') + 1), palette);
    return color ? { kind: 'stop', color, label: base } : null;
  }
  if (base.startsWith('font-')) {
    const w = FONT_WEIGHTS[base.slice(5)];
    return w ? { kind: 'weight', value: w } : null;
  }
  if (base.startsWith('opacity-')) {
    const n = parseInt(base.slice(8), 10);
    return Number.isNaN(n) ? null : { kind: 'opacity', value: n / 100 };
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   5. className expression → reachable states
   ══════════════════════════════════════════════════════════════════════ */

const tokensOf = (str) => String(str).split(/\s+/).filter(Boolean);

/** The "slot" a utility paints into, so `dark:text-slate-300` (fg) is never
 *  confused with `text-xs` (size) when collapsing variants. */
function tokenFamily(token, palette) {
  const parsed = classifyToken(token, palette);
  if (!parsed || parsed.kind === 'variant') return null;
  return `${parsed.kind}:${token.split(/[-[\]]/)[0]}`;
}

/** Dark mode: `dark:X` replaces the base utility painting the same slot, and
 *  base values with no dark counterpart still apply. Other variants (hover:,
 *  md:, …) are not audited in either mode. */
function tokensForMode(tokens, palette) {
  if (MODE !== 'dark') return tokens;
  const darkSlots = new Map();
  const bare = [];
  for (const token of tokens) {
    if (token.startsWith('dark:')) {
      const inner = token.slice(5);
      const family = tokenFamily(inner, palette);
      // A dark-only class (`.dark`-scoped custom utility) still marks the surface.
      if (family) darkSlots.set(family, inner);
      else if (!inner.includes(':')) bare.push(inner);
      continue;
    }
    if (token.includes(':')) continue;
    bare.push(token);
  }
  if (!darkSlots.size) return bare;
  const out = [];
  for (const token of bare) {
    const family = tokenFamily(token, palette);
    if (family && darkSlots.has(family)) {
      out.push(darkSlots.get(family));
      darkSlots.delete(family);
      continue;
    }
    out.push(token);
  }
  out.push(...darkSlots.values());
  return out;
}
/** A state is {tokens, conds}; conds maps a condition's source text to the
 *  branch taken so correlated ternaries stay correlated across elements. */
const condsKey = (conds) =>
  Object.entries(conds)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

function condsCompatible(a, b) {
  for (const [k, v] of Object.entries(a)) if (b[k] !== undefined && b[k] !== v) return false;
  for (const [k, v] of Object.entries(b)) if (a[k] !== undefined && a[k] !== v) return false;
  return true;
}

function multiply(left, right) {
  const out = [];
  const seen = new Set();
  for (const a of left) {
    for (const b of right) {
      if (!condsCompatible(a.conds, b.conds)) continue;
      const tokens = [...a.tokens, ...b.tokens];
      const conds = { ...a.conds, ...b.conds };
      const key = condsKey(conds) + '|' + tokens.join(' ');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ tokens, conds });
      if (out.length >= COMBO_CAP) return out;
    }
  }
  return out.length ? out : left.slice(0, COMBO_CAP);
}

/** Names of local consts we can resolve, so `${color}` inside a template can
 *  be followed. Populated per file before the tree is built. */
const constInits = new Map();

/** True when a className expression contains a fragment we cannot resolve —
 *  the element's paint is then unknown (e.g. `bg-gradient-to-br ${item.color}`). */
function hasUnresolvedClass(expr) {
  if (!expr) return false;
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return false;
  if (ts.isTemplateExpression(expr)) {
    return expr.templateSpans.some((sp) => hasUnresolvedClass(sp.expression));
  }
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr)) {
    return hasUnresolvedClass(expr.expression);
  }
  if (ts.isConditionalExpression(expr)) return hasUnresolvedClass(expr.whenTrue) || hasUnresolvedClass(expr.whenFalse);
  if (ts.isBinaryExpression(expr)) return hasUnresolvedClass(expr.left) || hasUnresolvedClass(expr.right);
  if (ts.isArrayLiteralExpression(expr)) return expr.elements.some(hasUnresolvedClass);
  if (ts.isObjectLiteralExpression(expr)) return false;
  if (ts.isSpreadElement(expr)) return hasUnresolvedClass(expr.expression);
  if (ts.isIdentifier(expr)) {
    // A forwarded `className` prop only ever adds to the classes we can see,
    // so the element's own defaults stay auditable.
    if (/^(className|classNames|classes|class)$/.test(expr.text)) return false;
    const init = constInits.get(expr.text);
    return init ? hasUnresolvedClass(init) : true;
  }
  if (ts.isPropertyAccessExpression(expr) && /^(className|classNames|classes)$/.test(expr.name.getText())) return false;
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression.getText();
    if (/\b(cn|clsx|classnames|twMerge|twJoin|cx)$/.test(callee)) return expr.arguments.some(hasUnresolvedClass);
    return true; // variants helpers, buttonVariants({…}), …
  }
  return true;
}

/** className values often come from local consts (`const color = a ? 'bg-x' : 'bg-y'`).
 *  Resolve a name only when it is declared exactly once in the file. */
let currentConsts = new Map();

function collectStringConsts(sourceFile) {
  const counts = new Map();
  const decls = [];
  const stringy = (node) =>
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateExpression(node) ||
    ts.isConditionalExpression(node) ||
    (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken);
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name) && node.initializer && stringy(node.initializer)) {
      const name = node.name.text;
      counts.set(name, (counts.get(name) ?? 0) + 1);
      decls.push({ name, init: node.initializer });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const map = new Map();
  constInits.clear();
  for (const d of decls) {
    if (counts.get(d.name) !== 1) continue;
    map.set(d.name, expandClasses(d.init, sourceFile));
    constInits.set(d.name, d.init);
  }
  return map;
}

function expandClasses(expr, sourceFile) {
  if (!expr) return [{ tokens: [], conds: {} }];
  const unwrap = (node) => {
    while (
      node &&
      (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node))
    ) {
      node = node.expression;
    }
    return node;
  };
  const node = unwrap(expr);
  if (!node) return [{ tokens: [], conds: {} }];

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [{ tokens: tokensOf(node.text), conds: {} }];

  if (ts.isTemplateExpression(node)) {
    let combos = [{ tokens: tokensOf(node.head.text), conds: {} }];
    for (const span of node.templateSpans) {
      combos = multiply(combos, expandClasses(span.expression, sourceFile));
      combos = multiply(combos, [{ tokens: tokensOf(span.literal.text), conds: {} }]);
    }
    return combos;
  }

  if (ts.isConditionalExpression(node)) {
    const key = node.condition.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 140);
    const branch = (side, value) =>
      expandClasses(side, sourceFile).map((c) => ({ tokens: c.tokens, conds: { ...c.conds, [key]: value } }));
    return [...branch(node.whenTrue, 'true'), ...branch(node.whenFalse, 'false')].slice(0, COMBO_CAP);
  }

  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.PlusToken) return multiply(expandClasses(node.left, sourceFile), expandClasses(node.right, sourceFile));
    if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      const key = node.left.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 140);
      const right = expandClasses(node.right, sourceFile).map((c) => ({ tokens: c.tokens, conds: { ...c.conds, [key]: 'true' } }));
      return [{ tokens: [], conds: { [key]: 'false' } }, ...right].slice(0, COMBO_CAP);
    }
    return [{ tokens: [], conds: {} }];
  }

  if (ts.isCallExpression(node)) {
    let combos = [{ tokens: [], conds: {} }];
    for (const arg of node.arguments) combos = multiply(combos, expandClasses(arg, sourceFile));
    return combos;
  }

  if (ts.isObjectLiteralExpression(node)) {
    const keys = [];
    for (const prop of node.properties) {
      if (!prop.name) continue;
      keys.push(...tokensOf(prop.name.getText(sourceFile).replace(/^['"]|['"]$/g, '')));
    }
    // cn({ 'text-white': cond }) → the classes are conditional; model both.
    return [{ tokens: keys, conds: {} }, { tokens: [], conds: {} }];
  }

  if (ts.isArrayLiteralExpression(node)) {
    let combos = [{ tokens: [], conds: {} }];
    for (const el of node.elements) combos = multiply(combos, expandClasses(el, sourceFile));
    return combos;
  }

  if (ts.isSpreadElement(node)) return expandClasses(node.expression, sourceFile);
  if (ts.isIdentifier(node)) {
    const resolved = currentConsts.get(node.text);
    if (resolved) return resolved;
  }
  return [{ tokens: [], conds: {} }];
}

/* ══════════════════════════════════════════════════════════════════════
   6. JSX tree
   ══════════════════════════════════════════════════════════════════════ */

function listTsx(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...listTsx(full));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out.sort();
}

const iconNames = new Map(); // file → Set

function collectIconImports(sourceFile) {
  const names = new Set();
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const mod = node.moduleSpecifier.text;
      if (/lucide-react|@heroicons|react-icons/.test(mod) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        for (const el of node.importClause.namedBindings.elements) names.add(el.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return names;
}

const SIZE_TOKENS = new Set(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl']);

/** Does this JSX element paint its own colour? */
function selfColoured(node, sourceFile) {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  for (const attr of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attr) || attr.name?.getText(sourceFile) !== 'className' || !attr.initializer) continue;
    const raw = attr.initializer.getText(sourceFile);
    for (const m of raw.matchAll(/text-([A-Za-z0-9[\]/.#-]+)/g)) {
      if (!SIZE_TOKENS.has(m[1]) && !['left', 'center', 'right', 'justify', 'ellipsis', 'wrap', 'balance', 'pretty'].includes(m[1])) return true;
    }
  }
  return false;
}

/** Does `{expr}` render text (a value) rather than elements? */
function yieldsText(expr) {
  if (!expr) return false;
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return !!expr.text.trim();
  if (ts.isTemplateExpression(expr)) {
    return !!expr.head.text.trim() || expr.templateSpans.some((sp) => yieldsText(sp.expression) || !!sp.literal.text.trim());
  }
  if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr) || ts.isElementAccessExpression(expr)) return true;
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr)) return yieldsText(expr.expression);
  if (ts.isConditionalExpression(expr)) return yieldsText(expr.whenTrue) || yieldsText(expr.whenFalse);
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind;
    if (op === ts.SyntaxKind.PlusToken) return yieldsText(expr.left) || yieldsText(expr.right);
    if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.QuestionQuestionToken) return yieldsText(expr.right);
    return false;
  }
  if (ts.isCallExpression(expr)) {
    // arr.map(…) renders elements; value calls such as x.toFixed(2) render text.
    const name = expr.expression.getText();
    return !/\.(map|flatMap|filter|forEach|some|every|reduce)$/.test(name);
  }
  if (ts.isArrayLiteralExpression(expr)) return expr.elements.some(yieldsText);
  return false;
}

/** JSX elements hiding inside an expression child (ternaries, && , .map()). */
function nestedJsx(expr, out, depth = 0) {
  if (!expr || depth > 6) return out;
  if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr)) {
    out.push(expr);
    return out;
  }
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr) || ts.isSpreadElement(expr)) {
    return nestedJsx(expr.expression, out, depth + 1);
  }
  if (ts.isConditionalExpression(expr)) {
    nestedJsx(expr.whenTrue, out, depth + 1);
    return nestedJsx(expr.whenFalse, out, depth + 1);
  }
  if (ts.isBinaryExpression(expr)) {
    nestedJsx(expr.left, out, depth + 1);
    return nestedJsx(expr.right, out, depth + 1);
  }
  if (ts.isArrayLiteralExpression(expr)) {
    for (const el of expr.elements) nestedJsx(el, out, depth + 1);
    return out;
  }
  if (ts.isCallExpression(expr)) {
    for (const arg of expr.arguments) nestedJsx(arg, out, depth + 1);
    return out;
  }
  if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) return nestedJsx(expr.body, out, depth + 1);
  if (ts.isBlock(expr)) {
    for (const st of expr.statements) {
      if (ts.isReturnStatement(st)) nestedJsx(st.expression, out, depth + 1);
    }
    return out;
  }
  return out;
}

function elementPayload(node, sourceFile) {
  const children = ts.isJsxElement(node) ? node.children : [];
  const icons = iconNames.get(sourceFile.fileName) ?? new Set();
  const bits = [];
  let dependentIcons = 0;

  const countIcons = (elements) => {
    for (const el of elements) {
      const name = el.tagName?.getText(sourceFile) ?? '';
      if (name === 'svg' || name === 'path' || name === 'circle' || icons.has(name) || /Icon$/.test(name)) {
        // An icon that sets its own colour is not painted by its parent.
        if (!selfColoured(el, sourceFile)) dependentIcons++;
      }
    }
  };

  for (const child of children) {
    if (ts.isJsxText(child)) {
      const t = child.text.replace(/\s+/g, ' ').trim();
      if (t) bits.push(t);
    } else if (ts.isJsxExpression(child)) {
      const inner = child.expression;
      if (!inner) continue;
      if (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) {
        if (inner.text.trim()) bits.push(inner.text.trim());
      } else if (yieldsText(inner)) bits.push('{…}');
      else countIcons(nestedJsx(inner, []));
    } else if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      countIcons([child]);
    }
  }
  return {
    text: bits.join(' ').slice(0, 56),
    hasText: bits.length > 0,
    iconOnly: dependentIcons > 0 && bits.length === 0,
  };
}

function buildTree(sourceFile) {
  const nodes = [];
  const visit = (node, parent) => {
    let entry = parent;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const combos = [];
      let ariaHidden = false;
      let unknownClass = false;
      let alwaysDisabled = false;
      for (const attr of opening.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || !attr.name) continue;
        const name = attr.name.getText(sourceFile);
        if (name === 'className' && attr.initializer) {
          const value = ts.isStringLiteral(attr.initializer) ? attr.initializer : ts.isJsxExpression(attr.initializer) ? attr.initializer.expression : null;
          if (value) {
            combos.push(...expandClasses(value, sourceFile));
            if (hasUnresolvedClass(value)) unknownClass = true;
          }
        }
        if (name === 'disabled' && !attr.initializer) alwaysDisabled = true;
        if (name === 'aria-hidden' && attr.initializer) {
          const raw = (ts.isStringLiteral(attr.initializer) ? attr.initializer.text : attr.initializer.getText(sourceFile)).replace(/["{}']/g, '');
          if (raw === 'true') ariaHidden = true;
        }
      }
      const deduped = [];
      const seen = new Set();
      for (const c of combos.slice(0, COMBO_CAP * 2)) {
        const key = condsKey(c.conds) + '|' + c.tokens.join(' ');
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(c);
      }
      entry = {
        node,
        sourceFile,
        tag: opening.tagName.getText(sourceFile),
        combos: deduped.slice(0, COMBO_CAP),
        parent,
        index: 0,
        children: [],
        surface: parent ? parent.surface : MODE === 'dark' ? 'dark' : 'light',
        ariaHidden,
        alwaysDisabled,
        unknownClass,
        unknownBg: opening.attributes.properties.some(
          (a) => ts.isJsxAttribute(a) && a.name?.getText(sourceFile) === 'style' && /background/i.test(a.initializer?.getText(sourceFile) ?? ''),
        ),
        _styles: null,
        _bg: null,
      };
      if (parent) {
        entry.index = parent.children.length;
        parent.children.push(entry);
      }
      const darkish = entry.combos.some((c) => c.tokens.some((t) => DARK_SURFACE_CLASSES.has(t) || t === 'on-dark'));
      if (darkish) entry.surface = 'ondark';
      nodes.push(entry);
    }
    ts.forEachChild(node, (child) => visit(child, entry));
  };
  visit(sourceFile, null);
  return nodes;
}

/* ── per-element style states ──────────────────────────────────────── */

function stylesOf(entry) {
  if (entry._styles) return entry._styles;
  const out = [];
  for (const c of entry.combos) {
    const darkToken = c.tokens.some((t) => !t.includes(':') && (t === 'on-dark' || DARK_SURFACE_CLASSES.has(t)));
    const surface = darkToken ? 'ondark' : entry.surface;
    const palette = paletteFor(surface);
    const customs = customFor(surface);
    const style = {
      fg: null,
      fgRank: -1,
      bg: null,
      bgRank: -1,
      stops: null,
      clipText: false,
      size: null,
      weight: null,
      opacity: null,
      hidden: false,
      surface,
      conds: c.conds,
      tokens: MODE === 'dark' ? tokensForMode(c.tokens, palette) : c.tokens,
    };
    // Unlayered rules in globals.css beat Tailwind's layered utilities, and
    // later rules beat earlier ones — so rank every paint source.
    const modeTokens = tokensForMode(c.tokens, palette);
    let tokenIndex = 0;
    for (const token of modeTokens) {
      const rank = tokenIndex++;
      const customEntry = token.includes(':') ? null : customs.get(token);
      if (token === 'bg-clip-text') {
        style.clipText = true;
        continue;
      }
      if (customEntry) {
        const custom = resolveCustom(customEntry, surface);
        const customRank = 1000 + custom.order;
        if (custom.darkSurface) style.surface = 'ondark';
        if (custom.bg && customRank > style.bgRank) {
          style.bg = { color: custom.bg, label: `.${token}` };
          style.bgRank = customRank;
        }
        if (custom.stops && customRank >= style.bgRank) style.stops = custom.stops;
        if (custom.fgAlts && customRank > style.fgRank) {
          style.fg = { color: custom.fgAlts[0], alts: custom.fgAlts, label: `.${token} (gradient text)` };
          style.fgRank = customRank;
        } else if (custom.fg && customRank > style.fgRank) {
          style.fg = { color: custom.fg, label: `.${token}` };
          style.fgRank = customRank;
        }
        continue;
      }
      const parsed = classifyToken(token, palette);
      if (!parsed) continue;
      if (parsed.kind === 'hidden') style.hidden = true;
      else if (parsed.kind === 'dark-surface') style.surface = 'ondark';
      else if (parsed.kind === 'fg' && rank >= style.fgRank) {
        style.fg = { color: parsed.color, label: parsed.label };
        style.fgRank = rank;
      } else if (parsed.kind === 'bg' && rank >= style.bgRank) {
        style.bg = { color: parsed.color, label: parsed.label };
        style.bgRank = rank;
      } else if (parsed.kind === 'stop') style.stops = [...(style.stops ?? []), parsed.color];
      else if (parsed.kind === 'size') style.size = parsed.px;
      else if (parsed.kind === 'weight') style.weight = parsed.value;
      else if (parsed.kind === 'opacity') style.opacity = parsed.value;
    }
    if (style.clipText && style.stops?.length) {
      // `bg-gradient-to-r … bg-clip-text text-transparent` paints the TEXT with
      // the gradient; the element contributes no surface of its own.
      style.fg = { color: style.stops[0], alts: style.stops, label: 'gradient text' };
      style.fgRank = 10_000;
      style.bg = null;
      style.stops = null;
    } else if (style.stops?.length) {
      const stops = style.bg ? [style.bg.color, ...style.stops] : style.stops;
      style.stops = stops;
      if (!style.bg) style.bg = { color: stops[0], label: 'gradient' };
    }
    out.push(style);
  }
  entry._styles = out;
  return out;
}


const visibleStyles = (entry) => stylesOf(entry).filter((s) => !s.hidden);

/* ── background scenarios (walk up the ancestors) ─────────────────── */

/** Absolutely-positioned earlier siblings paint behind this element's content
 *  (the app's gradient cards do this), so they belong in the background stack. */
function overlayLayers(entry) {
  if (!entry.parent || entry.index == null) return [];
  const layers = [];
  for (const sib of entry.parent.children.slice(0, entry.index)) {
    for (const style of stylesOf(sib)) {
      const t = style.tokens;
      const positioned = t.includes('absolute') || t.includes('fixed');
      const covers = t.some((token) => /^-?inset(-[xy])?-(0|px|full|\[)/.test(token));
      if (!positioned || !covers || !style.bg) continue;
      const fade = style.opacity ?? 1;
      layers.push({
        color: { ...style.bg.color, a: (style.bg.color.a ?? 1) * fade },
        stops: style.stops ? style.stops.map((c) => ({ ...c, a: (c.a ?? 1) * fade })) : null,
        label: `overlay ${style.bg.label}`,
        conds: style.conds,
      });
      break;
    }
  }
  return layers;
}

function bgScenarios(entry, depth = 0) {
  if (entry._bg) return entry._bg;
  if (entry.unknownBg) {
    entry._bg = [{ conds: {}, layers: [], label: 'inline style', base: null, surface: entry.surface, unknown: true }];
    return entry._bg;
  }
  const styles = visibleStyles(entry);
  const base = depth < 14 && entry.parent ? bgScenarios(entry.parent, depth + 1) : [terminal(entry)];
  const overlays = overlayLayers(entry);
  // A className fragment we could not resolve may paint over anything we found.
  const untrustworthy = entry.unknownClass || base.some((b) => b.unknown) || overlays.some((o) => o.unknownClass);
  const out = [];
  const add = (scenario) => {
    if (out.length < COMBO_CAP) out.push(scenario);
  };
  for (const style of styles) {
    const own = style.bg ? { color: style.bg.color, stops: style.stops, label: style.bg.label } : null;
    const opaque = !!own && !own.stops && (own.color.a ?? 1) >= 1;
    if (opaque) {
      add({ conds: style.conds, layers: [own], label: own.label, base: null, surface: style.surface, unknown: untrustworthy });
      continue;
    }
    for (const parentScenario of base) {
      if (!condsCompatible(style.conds, parentScenario.conds)) continue;
      const usable = overlays.filter((o) => condsCompatible(style.conds, o.conds) && condsCompatible(parentScenario.conds, o.conds));
      const labels = [own?.label, ...usable.map((o) => o.label), parentScenario.label].filter(Boolean);
      add({
        conds: Object.assign({}, style.conds, parentScenario.conds, ...usable.map((o) => o.conds)),
        layers: [...(own ? [own] : []), ...usable.map((o) => ({ color: o.color, stops: o.stops, label: o.label })), ...parentScenario.layers],
        label: labels.join(' over '),
        base: parentScenario.base,
        surface: parentScenario.surface ?? style.surface,
        unknown: parentScenario.unknown || untrustworthy,
      });
    }
  }
  const scenarios = out.length ? out : base;
  entry._bg = scenarios;
  return scenarios;
}

function terminal(entry) {
  const surface = surfaceOf(entry);
  const base = pageBase(surface);
  return {
    conds: {},
    layers: [],
    label: surface === 'ondark' ? 'dark surface' : MODE === 'dark' ? 'dark canvas' : 'page background',
    base,
    surface,
  };
}

/** How much of the backdrop is pinned down by the layers we could see. */
function coverage(scenario) {
  let remaining = 1;
  for (const layer of scenario.layers) {
    const stops = layer.stops && layer.stops.length ? layer.stops : [layer.color];
    const alpha = Math.max(...stops.map((c) => c.a ?? 1));
    remaining *= 1 - alpha;
  }
  return 1 - remaining;
}
const BACKDROP_COVERAGE = 0.75;

/** Sticky/fixed chrome with no painted background floats over whatever the
 *  page scrolls beneath it (the header over the hero), which static analysis
 *  cannot know — such states are skipped rather than guessed. */
function floatsOverContent(entry) {
  let cur = entry;
  while (cur) {
    for (const style of stylesOf(cur)) {
      if (style.tokens.some((t) => t === 'sticky' || t === 'fixed')) return true;
    }
    cur = cur.parent;
  }
  return false;
}

function surfaceOf(entry) {
  let cur = entry;
  while (cur) {
    if (cur.surface === 'ondark') return 'ondark';
    cur = cur.parent;
  }
  return MODE === 'dark' ? 'dark' : 'light';
}

/** Concrete background colours for a scenario (worst-case gradient stops). */
function scenarioColors(scenario, surface) {
  const base = scenario.base ?? pageBase(surface);
  const gradientLayers = scenario.layers.filter((l) => l.stops && l.stops.length > 1);
  if (!gradientLayers.length) return [paint(scenario.layers, base, [])];
  const variants = [];
  const walk = (i, chosen) => {
    if (i === gradientLayers.length) {
      variants.push(paint(scenario.layers, base, chosen));
      return;
    }
    for (const stop of gradientLayers[i].stops.slice(0, 4)) walk(i + 1, [...chosen, { layer: gradientLayers[i], stop }]);
  };
  walk(0, []);
  return variants.slice(0, 6);
}

function paint(layers, base, overrides) {
  let bottom = base;
  for (const layer of [...layers].reverse()) {
    const override = overrides.find((o) => o.layer === layer);
    const color = override ? override.stop : layer.color;
    bottom = (color.a ?? 1) >= 1 ? { ...color, a: 1 } : composite(color, bottom);
  }
  return bottom;
}

/* ── inherited colour / size / weight ─────────────────────────────── */

function inheritedFg(entry) {
  let cur = entry.parent;
  while (cur) {
    const options = [];
    for (const style of visibleStyles(cur)) {
      if (style.fg && !options.some((o) => o.label === style.fg.label && condsKey(o.conds) === condsKey(style.conds))) {
        options.push({ color: style.fg.color, alts: style.fg.alts, label: `${style.fg.label} (inherited)`, conds: style.conds });
      }
    }
    if (options.length) return options;
    cur = cur.parent;
  }
  const surface = surfaceOf(entry);
  const fallback = paletteFor(surface).get('foreground');
  return fallback ? [{ color: fallback, label: 'text-foreground (canvas default)', conds: {} }] : [];
}

function inheritedScalar(entry, key, fallback) {
  let cur = entry.parent;
  while (cur) {
    for (const style of visibleStyles(cur)) if (style[key] != null) return style[key];
    cur = cur.parent;
  }
  return fallback;
}

/* ══════════════════════════════════════════════════════════════════════
   7. Evaluation
   ══════════════════════════════════════════════════════════════════════ */

function requiredRatio(pair) {
  if (pair.iconOnly) return 3; // WCAG 1.4.11 non-text contrast
  const large = pair.size >= 24 || (pair.size >= 18.66 && pair.weight >= 700);
  return large ? 3 : 4.5;
}

function isSuppressed(sourceFile, node) {
  const full = sourceFile.getFullText();
  const start = node.getStart(sourceFile);
  const { line } = sourceFile.getLineAndCharacterOfPosition(start);
  const openingEnd = ts.isJsxElement(node) ? node.openingElement.getEnd() : node.getEnd();
  const endLine = sourceFile.getLineAndCharacterOfPosition(openingEnd).line;
  const lines = full.split('\n');
  const window = lines.slice(Math.max(0, line - 2), Math.min(lines.length, endLine + 1)).join('\n');
  const leading = (ts.getLeadingCommentRanges(full, node.getFullStart()) ?? []).map((r) => full.slice(r.pos, r.end)).join('\n');
  return /contrast-audit-ignore/.test(window) || /contrast-audit-ignore/.test(leading);
}

const lineOf = (entry) => entry.sourceFile.getLineAndCharacterOfPosition(entry.node.getStart(entry.sourceFile)).line;

const findings = [];
const files = listTsx(SRC).filter((f) => !FILE_FILTER || f.includes(FILE_FILTER));
let evaluated = 0;
let skippedUnknown = 0;
let skippedFloating = 0;
const skippedList = [];

const locate = (entry) =>
  `${path.relative(ROOT, entry.sourceFile.fileName)}:${entry.sourceFile.getLineAndCharacterOfPosition(entry.node.getStart(entry.sourceFile)).line + 1}`;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  iconNames.set(file, collectIconImports(sourceFile));
  currentConsts = collectStringConsts(sourceFile);
  const nodes = buildTree(sourceFile);

  for (const entry of nodes) {
    if (entry.ariaHidden || entry.alwaysDisabled) continue;
    const payload = elementPayload(entry.node, sourceFile);
    if (!payload.hasText && !payload.iconOnly) continue;
    const styles = visibleStyles(entry);
    if (!styles.length) continue;

    const size = styles.find((s) => s.size != null)?.size ?? inheritedScalar(entry, 'size', 16);
    const weight = styles.find((s) => s.weight != null)?.weight ?? inheritedScalar(entry, 'weight', 400);
    const scenarios = bgScenarios(entry);
    const ownFg = styles.filter((s) => s.fg).map((s) => ({ color: s.fg.color, alts: s.fg.alts, label: s.fg.label, conds: s.conds }));
    const fgOptions = ownFg.length ? ownFg : inheritedFg(entry);
    if (!fgOptions.length) continue;

    const usableScenarios = scenarios.filter((sc) => !sc.unknown);
    if (!usableScenarios.length) {
      skippedUnknown++;
      skippedList.push({
        where: locate(entry),
        reason: entry.unknownBg ? 'inline-style background' : 'unresolved className fragment',
      });
      continue;
    }
    if (TRACE && file.includes(TRACE.split(':')[0]) && `${lineOf(entry) + 1}` === TRACE.split(':')[1]) {
      console.error('── trace', path.relative(ROOT, file), `${lineOf(entry) + 1}:${entry.node.getStart(sourceFile)}`);
      console.error('   tag        ', entry.tag, '| surface', entry.surface, '| payload', JSON.stringify(payload));
      for (const st of styles) {
        console.error('   style      ', JSON.stringify({
          conds: st.conds,
          surface: st.surface,
          fg: st.fg && { label: st.fg.label, hex: toHex(st.fg.color), a: st.fg.color.a },
          bg: st.bg && { label: st.bg.label, hex: toHex(st.bg.color), a: st.bg.color.a },
          stops: st.stops?.length,
          size: st.size,
          weight: st.weight,
        }));
      }
      for (const sc of scenarios) {
        console.error('   scenario   ', JSON.stringify({
          label: sc.label,
          unknown: !!sc.unknown,
          layers: sc.layers.map((l) => ({ label: l.label, hex: toHex(l.color), a: Number((l.color.a ?? 1).toFixed(2)), stops: l.stops?.length })),
        }));
        console.error('   colors     ', scenarioColors(sc, sc.surface ?? surfaceOf(entry)).map((c) => toHex(c)).join(' '));
      }
      console.error('   fgOptions  ', fgOptions.map((f) => `${f.label} ${toHex(f.color)} a=${f.color.a}`).join(' | '));
    }
    const pairs = [];
    let floatingStates = 0;
    for (const fg of fgOptions) {
      for (const scenario of usableScenarios) {
        if (!condsCompatible(fg.conds, scenario.conds)) continue;
        if (coverage(scenario) < BACKDROP_COVERAGE && floatsOverContent(entry)) {
          floatingStates++;
          continue;
        }
        const stateKey = condsKey({ ...fg.conds, ...scenario.conds });
        const surface = scenario.surface ?? surfaceOf(entry);
        for (const bg of scenarioColors(scenario, surface)) {
          const style = styles.find((s) => condsKey(s.conds) === condsKey(scenario.conds)) ?? styles[0];
          // `cursor-not-allowed` marks the disabled state of a control, which
          // WCAG 1.4.3 exempts as an inactive user-interface component.
          if (style?.tokens.includes('cursor-not-allowed')) continue;
          for (const fgColor of fg.alts ?? [fg.color]) {
          const alpha = (fgColor.a ?? 1) * (style?.opacity ?? 1);
          const painted = alpha >= 1 ? { ...fgColor, a: 1 } : composite({ ...fgColor, a: alpha }, bg);
          pairs.push({
            ratio: contrast(painted, bg),
            fgHex: toHex(painted) + (alpha < 0.999 ? ` \u03b1${alpha.toFixed(2)}` : ''),
            bgHex: toHex(bg),
            fgLabel: fg.label,
            bgLabel: scenario.label,
            size,
            weight,
            iconOnly: payload.iconOnly,
            surface,
            conditional: fgOptions.length > 1 || scenarios.length > 1,
            stateKey,
            alpha,
            backdropKnown: coverage(scenario) >= BACKDROP_COVERAGE || !floatsOverContent(entry),
          });
          }
        }
      }
    }
    if (!pairs.length) {
      if (floatingStates) {
        skippedFloating++;
        skippedList.push({ where: locate(entry), reason: 'transparent sticky/fixed chrome' });
      }
      continue;
    }
    evaluated++;

    // Within one state the worst stop governs; across reachable states an
    // element passes if any real rendering of it passes.
    // One entry per reachable render state; within a state the worst gradient
    // stop governs. Every state has to pass — an element that is fine in one
    // branch and unreadable in another is still unreadable.
    const byState = new Map();
    for (const pair of pairs) {
      const key = `${pair.stateKey}|${pair.surface}`;
      const prev = byState.get(key);
      if (!prev || pair.ratio < prev.ratio) byState.set(key, pair);
    }
    const states = [...byState.values()];
    const failing = states.filter((p) => p.ratio < requiredRatio(p));
    if (!failing.length) continue;
    // A state whose backdrop is whatever scrolls under a transparent sticky bar
    // is not decidable here; drop it unless it is the only state we have.
    const decidable = failing.filter((p) => p.backdropKnown);
    if (!decidable.length) {
      if (floatingStates) skippedList.push({ where: locate(entry), reason: 'backdrop behind translucent sticky chrome' });
      continue;
    }

    const worst = failing.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    const alphaNote = worst.alpha != null && worst.alpha < 0.999 ? ` @${Math.round(worst.alpha * 100)}%` : '';
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(entry.node.getStart(sourceFile));
    findings.push({
      file: path.relative(ROOT, file),
      line: line + 1,
      column: character + 1,
      tag: entry.tag,
      text: payload.text || (payload.iconOnly ? '(icon)' : ''),
      ratio: Number(worst.ratio.toFixed(2)),
      required: requiredRatio(worst),
      fgLabel: worst.fgLabel,
      fgHex: worst.fgHex,
      bgLabel: worst.bgLabel,
      bgHex: worst.bgHex,
      surface: worst.surface,
      conditional: states.length > 1 || worst.conditional,
      states: states.length,
      alphaNote,
      iconOnly: worst.iconOnly,
      suppressed: isSuppressed(sourceFile, entry.node),
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   8. Report
   ══════════════════════════════════════════════════════════════════════ */

const failures = findings.filter((f) => !f.suppressed).sort((a, b) => a.ratio - b.ratio);
const suppressed = findings.filter((f) => f.suppressed);

if (LIST_SKIPPED) {
  console.log(`skipped ${skippedList.length} element(s) the audit cannot decide statically:`);
  for (const item of skippedList) console.log(`  ${item.where}  ${item.reason}`);
}

if (AS_JSON) {
  console.log(JSON.stringify({ mode: MODE, evaluated, files: files.length, failures, suppressed, skipped: skippedList }, null, 2));
  process.exit(failures.length ? 1 : 0);
}

if (!QUIET) {
  console.log(
    `contrast-audit · ${MODE} mode · ${evaluated} text-bearing elements across ${files.length} files` +
      (skippedUnknown || skippedFloating
        ? ` · ${skippedUnknown + skippedFloating} skipped (background not statically known)`
        : ''),
  );
}

if (!failures.length) {
  if (!QUIET) console.log(`✓ WCAG AA contrast — no failures${suppressed.length ? ` (${suppressed.length} suppressed)` : ''}`);
  process.exit(0);
}

console.log(`✗ ${failures.length} element${failures.length === 1 ? '' : 's'} below WCAG AA${suppressed.length ? ` (${suppressed.length} suppressed)` : ''}\n`);
const byFile = new Map();
for (const f of failures) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}
for (const [file, list] of [...byFile.entries()].sort()) {
  console.log(file);
  for (const f of list.sort((a, b) => a.line - b.line)) {
    const flags = [f.conditional ? 'cond' : '', f.iconOnly ? 'icon' : '', f.surface === 'ondark' ? 'on-dark' : ''].filter(Boolean).join(',');
    console.log(
      `  ${String(f.line).padStart(4)}:${String(f.column).padEnd(3)} ${f.ratio.toFixed(2)}:1 need ${f.required}  ${f.fgLabel} ${f.fgHex} on ${f.bgLabel} ${f.bgHex}${flags ? `  [${flags}]` : ''}${f.text ? `  "${f.text}"` : ''}`,
    );
  }
  console.log('');
}

const patterns = new Map();
for (const f of failures) {
  const key = `${f.fgLabel} on ${f.bgLabel}`;
  patterns.set(key, (patterns.get(key) ?? 0) + 1);
}
console.log('by pattern:');
for (const [key, count] of [...patterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`  ${String(count).padStart(4)}  ${key}`);
}
console.log('\nSuppress a known false positive with a `contrast-audit-ignore: reason` comment on the element.');
process.exit(1);
