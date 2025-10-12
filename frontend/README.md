# World Map Component Integration

This project successfully integrates a React World Map component with the following features:

## ✅ Completed Setup

1. **Next.js Project**: Created with TypeScript, Tailwind CSS, and App Router
2. **shadcn/ui**: Initialized with default configuration
3. **Dependencies Installed**:
   - `dotted-map`: For generating world map SVG
   - `framer-motion`: For animations
   - `next-themes`: For dark/light mode support
   - `lucide-react`: For icons (ready for future use)

## 📁 Project Structure

```
frontend/src/
├── app/
│   ├── layout.tsx          # Root layout with ThemeProvider
│   ├── page.tsx           # Main page showcasing WorldMapDemo
│   └── globals.css        # Global styles with shadcn/ui variables
├── components/
│   ├── ui/
│   │   └── world-map.tsx   # Main WorldMap component
│   ├── world-map-demo.tsx # Demo component with sample data
│   └── theme-provider.tsx # Theme provider wrapper
└── lib/
    └── utils.ts           # Utility functions from shadcn/ui
```

## 🚀 Usage

### Basic WorldMap Component

```tsx
import { WorldMap } from "@/components/ui/world-map";

export function MyComponent() {
  return (
    <WorldMap
      dots={[
        {
          start: { lat: 40.7128, lng: -74.0060 }, // New York
          end: { lat: 51.5074, lng: -0.1278 },    // London
        },
      ]}
      lineColor="#0ea5e9"
    />
  );
}
```

### Component Props

- `dots`: Array of connection points with start/end coordinates
- `lineColor`: Color for the connection lines (default: "#0ea5e9")

## 🎨 Features

- **Responsive Design**: Adapts to different screen sizes
- **Dark/Light Mode**: Automatically switches based on system theme
- **Animated Connections**: Smooth curved lines with fade effects
- **Interactive Points**: Animated pulsing dots at connection points
- **SVG-based**: Scalable vector graphics for crisp rendering

## 🛠 Development

To start the development server:

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the component in action.

## 📦 Build

To build for production:

```bash
cd frontend
npm run build
```

The component is fully integrated and ready for use in your application!