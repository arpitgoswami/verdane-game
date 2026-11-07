# Arpit Goswami — Portfolio

Awwwards-quality personal portfolio built with modern web technologies, focusing on performance, accessibility, and delightful interactions.

## ✨ Features

- **Modern Stack**: Vanilla HTML/CSS/JS with Vite build system
- **Smooth Animations**: GSAP + ScrollTrigger for scroll-based reveals
- **Smooth Scrolling**: Lenis for buttery-smooth scroll experience
- **Responsive Design**: Mobile-first, fluid typography with `clamp()`
- **Dark Mode**: Automatic via `prefers-color-scheme`
- **Accessibility**: WCAG AA compliant, reduced motion support, keyboard navigation
- **Performance**: Optimized assets, lazy loading, minimal dependencies
- **PWA Ready**: Web manifest, service worker ready

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Build** | Vite 5 |
| **Animation** | GSAP 3 + ScrollTrigger |
| **Smooth Scroll** | Lenis |
| **Styling** | CSS Custom Properties, Fluid Typography |
| **Linting** | ESLint, Stylelint, html-validate |
| **Formatting** | Prettier |
| **Deployment** | Vercel |

## 📁 Project Structure

```
├── index.html           # Main HTML entry point
├── styles.css           # Complete stylesheet with design tokens
├── script.js            # All interactivity (GSAP, Lenis, forms)
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies & scripts
├── manifest.webmanifest # PWA manifest
├── robots.txt           # SEO robots
├── vercel.json          # Vercel deployment config
├── .stylelintrc.json    # Stylelint config
├── .gitignore           # Git ignore rules
└── public/              # Static assets (favicons, images)
    ├── favicon.ico
    ├── icon.svg
    ├── icon-192.png
    ├── icon-512.png
    ├── apple-touch-icon.png
    └── og-image.jpg
```

## 🎨 Design System

### Colors
- **Background**: `#f8f9fa` (light) / `#0f172a` (dark)
- **Text**: `#1a1a1a` / `#f1f5f9`
- **Accent**: `#2563eb` / `#3b82f6`
- **Muted**: `#6b7280` / `#94a3b8`

### Typography
- **Font**: Inter (variable font)
- **Scale**: Fluid `clamp()` values from `--fs-xs` to `--fs-4xl`

### Spacing
- **Scale**: `--space-xs` (0.25rem) to `--space-4xl` (6rem)

## ♿ Accessibility

- Semantic HTML5 structure
- Skip to content link
- Focus-visible outlines
- ARIA labels & descriptions
- `prefers-reduced-motion` support
- `prefers-contrast` support
- Keyboard navigable
- Screen reader friendly

## 📈 Performance

- **Lighthouse Target**: 100/100/100/100
- **Core Web Vitals**: Optimized LCP, CLS, FID
- **Bundle Size**: < 50KB JS gzipped
- **Fonts**: Variable font, preloaded, `font-display: swap`
- **Images**: Lazy loaded, responsive, WebP/AVIF ready

## 🌐 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod ./dist
```

### Netlify
```bash
npm run build
# Drag dist/ to Netlify dashboard
```

### Static Hosting
Upload `dist/` contents to any static host (GitHub Pages, Cloudflare Pages, etc.)

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build locally |
| `npm run lint` | ESLint with auto-fix |
| `npm run format` | Prettier format |
| `npm run validate` | HTML validation |
| `npm run check:css` | Stylelint check |
| `npm run check:all` | Run all checks |
| `npm run deploy` | Build + deploy to Vercel |

## 🔧 Customization

### Colors
Edit CSS custom properties in `styles.css`:
```css
:root {
  --color-accent: #your-color;
  --color-bg: #your-bg;
  /* ... */
}
```

### Content
Update `index.html` with your:
- Name, title, bio
- Project data (images, tags, links)
- Social links
- Contact information

### Animations
Modify GSAP timelines in `script.js`:
- Hero intro: `heroTl`
- Section reveals: `revealSections.forEach()`
- Card interactions: `projectCards.forEach()`

## 📄 License

MIT License — feel free to use as inspiration for your own portfolio.

## 🙏 Credits

- **GSAP** by GreenSock
- **Lenis** by Studio Freight
- **Inter Font** by Rasmus Andersson
- **Icons** from Heroicons / Solar Icons
- **Placeholder Images** from picsum.photos

---

Built with ❤️ for clarity and performance.