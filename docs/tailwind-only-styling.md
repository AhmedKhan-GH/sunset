# Tailwind-Only Styling

## Goal

Eliminate all inline `style` attributes and raw CSS. Every visual property should come
from Tailwind utilities or the Tailwind config — no `style={{}}`, no `.css` files, no
`<style>` tags.

## Current exceptions

### Animation delays (chat thinking indicator)

Tailwind v4 has no `animation-delay` utility. The cascading dot animation currently uses
either arbitrary values (`animate-[pulse_1.4s_ease-in-out_0.2s_infinite]`) or inline
`style={{ animationDelay: "0.2s" }}`.

**Fix:** Add custom utilities in `tailwind.config.ts` or `app/globals.css` via `@theme`:

```css
@theme {
  --animate-delay-200: 0.2s;
  --animate-delay-400: 0.4s;
}
```

Then create a plugin or use `@utility` to map these to `animation-delay`:

```css
@utility delay-200 {
  animation-delay: 0.2s;
}
@utility delay-400 {
  animation-delay: 0.4s;
}
```

Usage:
```tsx
<span className="animate-pulse">.</span>
<span className="animate-pulse delay-200">.</span>
<span className="animate-pulse delay-400">.</span>
```

## Rules going forward

1. No `style={{}}` on any element
2. No `.css` files other than `globals.css` (which only contains Tailwind directives and custom utilities)
3. All spacing, color, typography, animation, and layout via Tailwind classes
4. Custom values belong in `@theme` or as Tailwind plugins, not inline
5. If Tailwind doesn't support a property, extend it via `@utility` rather than falling back to raw CSS
