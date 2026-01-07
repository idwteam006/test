# Zenora.ai UI Design Analysis

## Color Theme

### Primary Colors
- **Primary Brand**: Purple-Indigo Gradient
  - HSL: `hsl(262, 83%, 58%)`
  - Gradients: `from-purple-600 to-indigo-600`, `from-purple-500 to-indigo-600`
  - Used for: CTAs, active navigation states, primary actions, brand identity

### Light Mode Color Palette
```css
--background: hsl(0, 0%, 100%)              /* Pure white */
--foreground: hsl(240, 10%, 3.9%)           /* Dark slate text */
--primary: hsl(262, 83%, 58%)               /* Purple */
--primary-foreground: hsl(0, 0%, 98%)       /* Off-white */
--secondary: hsl(240, 4.8%, 95.9%)          /* Light gray */
--secondary-foreground: hsl(240, 5.9%, 10%) /* Dark text */
--muted: hsl(240, 4.8%, 95.9%)              /* Muted gray */
--muted-foreground: hsl(240, 3.8%, 46.1%)   /* Gray text */
--border: hsl(240, 5.9%, 90%)               /* Light slate */
--input: hsl(240, 5.9%, 90%)                /* Input borders */
--ring: hsl(262, 83%, 58%)                  /* Focus rings - purple */
--destructive: hsl(0, 84.2%, 60.2%)         /* Red */
--radius: 0.5rem                             /* Border radius */
```

### Dark Mode Color Palette
```css
--background: hsl(240, 10%, 3.9%)           /* Dark slate */
--foreground: hsl(0, 0%, 98%)               /* Off-white */
--card: hsl(240, 10%, 3.9%)                 /* Dark card bg */
--secondary: hsl(240, 3.7%, 15.9%)          /* Dark gray */
--muted: hsl(240, 3.7%, 15.9%)              /* Dark muted */
--muted-foreground: hsl(240, 5%, 64.9%)     /* Light gray text */
--border: hsl(240, 3.7%, 15.9%)             /* Dark borders */
```

### Semantic Colors
- **Success/Approved**: Green shades (`green-600`, `green-700`, `green-50`)
- **Warning/Pending**: Yellow/Orange (`yellow-600`, `orange-600`)
- **Error/Destructive**: Red (`red-600`, `red-50`)
- **Info**: Blue/Cyan (`blue-600`, `cyan-600`)

### Background Gradients
- **Admin/Dashboard**: `from-slate-50 via-blue-50 to-indigo-50`
- **Auth Pages**: `from-purple-50 via-white to-indigo-50`
- **Cards**: `from-purple-50 to-white`

### Feature-Based Color Coding
| Feature | Color | Usage |
|---------|-------|-------|
| Time/Clock | Blue (`blue-600`, `cyan-600`) | Timesheets, hours logged |
| Onboarding | Purple (`purple-600`) | Onboarding status, progress |
| Approvals | Green (`green-600`) | Approved states, success |
| Leave/Balance | Orange/Amber (`orange-600`, `amber-600`) | Leave requests, warnings |
| Finance | Emerald (`emerald-600`) | Payroll, invoices |
| Documents | Slate/Gray | Neutral content |
| Alerts | Red (`red-600`) | Critical actions, notifications |

---

## Typography

### Font Families
```typescript
--font-geist-sans: Geist (Google Font)     // Primary sans-serif
--font-geist-mono: Geist Mono              // Monospace for code
```

**Font Features**:
- Ligatures enabled: `font-feature-settings: "rlig" 1, "calt" 1`
- Antialiased rendering: `antialiased` class applied globally

### Type Scale
| Element | Class | Size | Weight |
|---------|-------|------|--------|
| Page Headlines | `text-3xl font-bold` | 36px | 700 |
| Card Titles | `text-2xl font-semibold` | 24px | 600 |
| Section Headers | `text-lg font-bold` | 18px | 700 |
| Subsection Headers | `text-lg font-medium` | 18px | 500 |
| Body Text | `text-sm font-medium` | 14px | 500 |
| Body Regular | `text-sm` | 14px | 400 |
| Captions | `text-xs` | 12px | 400 |
| Extra Small | `text-[10px]` | 10px | 400 |

### Text Colors
- Primary text: `text-gray-900` or `text-slate-900`
- Secondary text: `text-muted-foreground`
- Descriptive text: `text-gray-600`, `text-slate-600`
- Label text: `text-gray-700`

---

## Component Design System

### Cards
```tsx
// Base card styling
className="rounded-lg border bg-card text-card-foreground shadow-sm"

// Variants:
- Hover: "hover:shadow-lg transition-shadow"
- Gradient: "bg-gradient-to-r from-purple-50 to-white"
- Accent border: "border-l-4 border-l-purple-500"
- Glassmorphism: "backdrop-blur-sm bg-white/90"
```

**Card Structure**:
- Header: `p-6` padding
- Content: `p-6 pt-0` (no top padding)
- Footer: `p-6 pt-0`

### Buttons

**Sizes**:
- Default: `h-10 px-4 py-2`
- Small: `h-9 px-3`
- Large: `h-11 px-8`
- Icon: `h-10 w-10`

**Variants**:
```tsx
// Default (Primary)
"bg-primary text-primary-foreground hover:bg-primary/90"

// Gradient (Custom)
"bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"

// Outline
"border border-input bg-background hover:bg-accent hover:text-accent-foreground"

// Secondary
"bg-secondary text-secondary-foreground hover:bg-secondary/80"

// Ghost
"hover:bg-accent hover:text-accent-foreground"

// Destructive
"bg-destructive text-destructive-foreground hover:bg-destructive/90"

// Link
"text-primary underline-offset-4 hover:underline"
```

**States**:
- Disabled: `disabled:pointer-events-none disabled:opacity-50`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

### Badges

```tsx
// Base
"rounded-md px-2.5 py-0.5 text-xs font-semibold"

// Status-specific backgrounds:
- Blue: "bg-blue-100 text-blue-700"
- Yellow: "bg-yellow-100 text-yellow-700"
- Purple: "bg-purple-100 text-purple-700"
- Orange: "bg-orange-100 text-orange-700"
- Green: "bg-green-100 text-green-700"
- Red: "bg-red-100 text-red-700"
```

### Inputs
```tsx
className="h-12 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
```

### Icons
- Default size: `w-5 h-5` or `w-4 h-4`
- Large icons: `w-6 h-6` or `w-8 h-8`
- Icon containers: `w-10 h-10` or `w-12 h-12`

**Icon Backgrounds**:
```tsx
// Gradient circles/squares
"w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white"
```

### Border Radius
```css
--radius: 0.5rem                  /* Base: 8px */
lg: var(--radius)                 /* 8px */
md: calc(var(--radius) - 2px)    /* 6px */
sm: calc(var(--radius) - 4px)    /* 4px */
```

---

## Layout & Spacing

### Navigation Structure

**Header**:
- Height: `h-16` (64px)
- Position: `fixed top-0 left-0 right-0`
- Background: `bg-white border-b border-slate-200 shadow-sm`
- Z-index: `z-40`

**Sidebar**:
- Width: `w-64` (256px)
- Position: `fixed left-0 top-16 h-[calc(100vh-4rem)]`
- Mobile: `-translate-x-full lg:translate-x-0` (collapsible)
- Z-index: `z-30`

**Main Content**:
- Top padding: `pt-16` (to account for fixed header)
- Left padding: `lg:pl-64` (when sidebar open)
- Min height: `min-h-[calc(100vh-8rem)]`

### Grid Systems

**Dashboard Stats** (4-column responsive):
```tsx
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
```

**Content Areas** (2-column):
```tsx
"grid grid-cols-1 md:grid-cols-2 gap-6"
```

**Quick Actions** (Flexible):
```tsx
"lg:col-span-2" // Takes 2/3 of space
"lg:col-span-1" // Takes 1/3 of space
```

### Spacing Scale
- Extra tight: `gap-2` (8px)
- Tight: `gap-3` (12px)
- Normal: `gap-4` (16px)
- Comfortable: `gap-6` (24px)
- Loose: `space-y-6` or `space-y-4`

### Container Padding
- Pages: `p-6` (24px)
- Cards: `p-6` header/content, `p-4` for compact
- Sections: `px-4` (16px)

---

## Animations

### Framework
**Framer Motion** - All animations use `motion.*` components

### Common Animation Patterns

#### 1. Page/Card Entry (Fade + Slide Up)
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}
```

#### 2. Staggered List Items
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.1 }}
```

#### 3. Scale Pop-in (Icons/Logos)
```tsx
initial={{ scale: 0 }}
animate={{ scale: 1 }}
transition={{ delay: 0.2, type: 'spring' }}
```

#### 4. Dropdown Menus
```tsx
initial={{ opacity: 0, y: -10 }}
animate={{ opacity: 1, y: 0 }}
```

#### 5. Status Cards (Slide Down)
```tsx
initial={{ opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5 }}
```

#### 6. Background Blobs (Login Page)
```tsx
animate={{
  scale: [1, 1.2, 1],
  rotate: [0, 90, 0],
}}
transition={{
  duration: 20,
  repeat: Infinity,
  ease: 'linear',
}}
```

### Tailwind CSS Animations

#### Built-in:
- `animate-spin` - Loading spinners
- `animate-pulse` - Status indicators (green dot)

#### Custom (Accordion):
```typescript
keyframes: {
  "accordion-down": {
    from: { height: "0" },
    to: { height: "var(--radix-accordion-content-height)" },
  },
  "accordion-up": {
    from: { height: "var(--radix-accordion-content-height)" },
    to: { height: "0" },
  },
}
animation: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out",
}
```

### Hover Transitions

```tsx
// Buttons
"transition-all duration-200"
"hover:shadow-xl"

// Cards
"transition-shadow"
"hover:shadow-lg"

// Icon containers
"group-hover:scale-110 transition-transform"

// Text slides
"group-hover:translate-x-1 transition-transform"

// Background changes
"transition-colors"
```

---

## Visual Effects

### Glassmorphism
```tsx
"backdrop-blur-sm bg-white/90 shadow-2xl"
```

### Gradient Overlays
```tsx
// Animated blobs
"bg-gradient-to-br from-purple-200/30 to-transparent rounded-full blur-3xl"
"bg-gradient-to-tl from-indigo-200/30 to-transparent rounded-full blur-3xl"
```

### Icon Background Gradients
```tsx
"w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white"

// Variants:
- Blue-Cyan: "from-blue-500 to-cyan-500"
- Purple-Indigo: "from-purple-500 to-indigo-500"
- Green-Emerald: "from-green-500 to-emerald-500"
- Orange-Amber: "from-orange-500 to-amber-500"
```

### Shadow Elevation
```css
shadow-sm    /* Subtle - cards */
shadow-md    /* Medium - hover states */
shadow-lg    /* Large - elevated cards */
shadow-xl    /* Extra large - buttons hover */
shadow-2xl   /* Maximum - modals, auth cards */
```

### Border Accents
```tsx
// Left accent bar
"border-l-4 border-l-purple-500"

// Status-based
"border-l-4 border-l-green-500"  // Success
"border-l-4 border-l-orange-500" // Warning
```

---

## UI Patterns & Sections

### Dashboard Layout Pattern

1. **Welcome Header**
   ```tsx
   <h1 className="text-3xl font-bold text-gray-900">
     Welcome back, {userName}! 👋
   </h1>
   ```

2. **Status Banner** (when needed)
   - Onboarding status
   - Important notifications
   - Action required alerts

3. **Stats Grid** (4 cards)
   - Icon with gradient background
   - Large number (metric)
   - Label text
   - Hover shadow effect

4. **Quick Actions** (Grid)
   - Icon + Title + Description
   - Clickable cards
   - Color-coded gradients

5. **Recent Activity** (Sidebar)
   - Timeline format
   - Icon + Title + Description + Time
   - Color-coded status icons

6. **Summary Cards** (Bottom)
   - Leave summary
   - Upcoming events
   - Additional info

### Navigation States

**Active Link**:
```tsx
"bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
```

**Inactive Link**:
```tsx
"text-slate-700 hover:bg-slate-100"
```

**Quick Action Hover**:
```tsx
"hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 group"
"group-hover:scale-110 transition-transform" // Icon
"group-hover:translate-x-1 transition-transform" // Text
```

### Status Indicators

**Timeline Steps**:
```tsx
// Completed
<CheckCircle2 className="h-4 w-4 text-green-600" />

// Pending
<div className="h-4 w-4 rounded-full border-2 border-gray-300" />
```

**Live Status**:
```tsx
<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
```

---

## Responsive Breakpoints

### Tailwind Default Breakpoints
```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large */
2xl: 1400px /* Custom container max-width */
```

### Common Responsive Patterns

**Mobile Navigation**:
```tsx
// Hidden on desktop, visible on mobile
"lg:hidden"

// Hamburger toggle
"lg:hidden" // Show on mobile
"-translate-x-full lg:translate-x-0" // Slide-in sidebar
```

**Grid Collapsing**:
```tsx
"grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 4 columns
```

**Content Visibility**:
```tsx
"hidden md:flex"   // Hide on mobile, show on tablet+
"hidden md:block"  // Block on tablet+
```

**Text Size Adjustments**:
```tsx
"text-sm md:text-base lg:text-lg"
```

---

## Design Principles

### 1. **Color Consistency**
- Purple-indigo for primary brand actions
- Feature-specific color coding (blue=time, green=approved, etc.)
- Muted backgrounds for status badges

### 2. **Hierarchy**
- Bold headlines (3xl) → Card titles (2xl) → Body (sm) → Captions (xs)
- Icon size correlates with importance
- Shadow depth indicates elevation

### 3. **Spacing**
- Consistent 6-unit padding on pages
- 4-unit gaps between grid items
- 6-unit gaps between major sections

### 4. **Micro-interactions**
- Staggered entry animations
- Hover scale on icons (110%)
- Smooth transitions (200ms default)
- Focus rings for accessibility

### 5. **Accessibility**
- Focus rings: 2px purple with offset
- Sufficient color contrast
- Semantic HTML structure
- Disabled state opacity: 50%

---

## Component Library

**UI Framework**: Custom components built on Radix UI primitives
**Styling**: Tailwind CSS with custom design tokens
**Animations**: Framer Motion
**Icons**: Lucide React
**Utilities**: class-variance-authority (cva) for variant management

### Key Components
- `Button` - 6 variants, 4 sizes
- `Card` - Header, Content, Footer, Description
- `Badge` - 4 variants (default, secondary, destructive, outline)
- `Input` - Purple focus states
- `Dialog` / `AlertDialog` - Modal overlays
- `DropdownMenu` - Navigation menus
- `Progress` - Onboarding progress bars
- `Tabs` - Content organization
- `Table` - Data displays

---

## File Locations Reference

```
/frontend
├── tailwind.config.ts          # Tailwind configuration & theme
├── app/globals.css             # CSS variables & base styles
├── app/layout.tsx              # Root layout (fonts, toaster)
├── components/ui/              # Reusable UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   └── ...
├── app/admin/layout.tsx        # Admin sidebar & navigation
├── app/employee/dashboard/     # Example dashboard implementation
└── app/auth/login/             # Example animations & effects
```

---

*Last Updated: November 23, 2025*