# Tailwind-Only Styling

## Current status

The app is fully Tailwind — no inline `style={{}}` attributes, no custom `.css` files
beyond the default Next.js `globals.css` scaffold.

## One edge case: animation delays

Tailwind v4 has no `animation-delay` utility. The chat thinking indicator uses arbitrary
value syntax: `animate-[pulse_1.4s_ease-in-out_0.2s_infinite]`. This works but is verbose.

**Cleaner alternative** — add `@utility` directives to `globals.css`:

```css
@utility delay-200 {
  animation-delay: 0.2s;
}
@utility delay-400 {
  animation-delay: 0.4s;
}
```

Then simplify to:
```tsx
<span className="animate-pulse">.</span>
<span className="animate-pulse delay-200">.</span>
<span className="animate-pulse delay-400">.</span>
```

## Rules going forward

1. No `style={{}}` on any element
2. All spacing, color, typography, animation, and layout via Tailwind classes
3. If Tailwind doesn't support a property, extend it via `@utility` rather than inline styles
