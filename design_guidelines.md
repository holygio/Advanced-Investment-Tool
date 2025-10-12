# Advanced Investments Interactive Lab - Design Guidelines

## Design Approach: Data-First Financial Platform

**Selected System:** Carbon Design System with financial data visualization enhancements

**Justification:** This is a utility-focused, information-dense application requiring precise data visualization, complex interactions, and professional credibility. Carbon Design excels at enterprise data applications, providing robust patterns for tables, charts, forms, and dashboards while maintaining clarity at high information densities.

**Core Principles:**
- Data clarity over decorative elements
- Hierarchical information architecture
- Scannable layouts for quick insights
- Professional credibility through restraint

---

## Color Palette

### Dark Mode (Primary)
**Foundation:**
- Background: 220 15% 8% (deep charcoal)
- Surface: 220 12% 12% (elevated panels)
- Surface Elevated: 220 10% 16% (cards, modals)

**Interactive:**
- Primary: 210 100% 50% (financial blue - trust/stability)
- Primary Hover: 210 100% 45%
- Success: 145 65% 45% (positive returns)
- Danger: 0 75% 55% (negative returns/alerts)
- Warning: 35 95% 55% (caution indicators)

**Text:**
- Primary: 220 10% 95%
- Secondary: 220 8% 70%
- Tertiary: 220 6% 55%

### Light Mode
**Foundation:**
- Background: 220 15% 98%
- Surface: 0 0% 100%
- Surface Elevated: 220 10% 96%

**Interactive:** Same hues as dark mode with adjusted lightness for contrast

---

## Typography

**Font Stack:**
- Primary: 'Inter', system-ui, sans-serif (clean, technical)
- Monospace: 'IBM Plex Mono', 'Courier New', monospace (for numbers, data)

**Scale:**
- Headings: font-semibold (600 weight)
- H1: text-3xl (module titles)
- H2: text-2xl (section headers)
- H3: text-xl (subsection headers)
- Body: text-base, leading-relaxed
- Data/Numbers: text-sm to text-lg, font-mono, tabular-nums
- Captions: text-sm, text-secondary

---

## Layout System

**Spacing Primitives:** Tailwind units of **2, 4, 8, 16, 24** (tight, data-focused rhythm)

**Grid Structure:**
- Sidebar: 280px fixed width (module navigation)
- Main canvas: flex-1 with max-w-7xl container
- Top control bar: h-16 sticky positioning
- Content padding: p-6 to p-8

**Component Spacing:**
- Between sections: space-y-8
- Between cards: gap-6
- Within cards: p-6
- Form elements: space-y-4

---

## Component Library

### Navigation
**Sidebar (Left):**
- Dark surface background
- Module links with icon + text
- Active state: primary color border-l-4
- Hover: subtle background lightening
- Collapsible on mobile

**Top Bar:**
- Global controls (date range, risk-free rate, market proxy)
- Compact select dropdowns
- Action buttons (Export, Settings)
- User profile (optional)

### Data Display

**Charts (Plotly):**
- Dark theme with matching palette
- Grid lines: subtle, tertiary color
- Tooltips: surface elevated background
- Legend: compact, positioned strategically
- Axis labels: monospace, secondary text

**Tables:**
- Zebra striping (subtle surface alternation)
- Sticky headers on scroll
- Sortable columns with icons
- Monospace for numerical data
- Right-align numbers, left-align text
- Compact row height (h-12)

**Metric Cards:**
- Surface elevated background
- Large numerical value (text-3xl, font-mono)
- Label above (text-sm, uppercase, tracking-wide)
- Trend indicator (arrow icon + percentage)
- Color coding for positive/negative

### Input Controls

**Form Fields:**
- Dark surface inputs with border
- Focus: primary color ring
- Labels: text-sm, font-medium, above input
- Helper text: text-xs, tertiary color below

**Sliders:**
- Primary color track/thumb
- Value display adjacent (font-mono)
- Range indicators at ends

**Select/Dropdowns:**
- Minimal styling, native dropdown preferred
- Dark surface background
- Primary color on focus

### Theory Tabs

**Tab Navigation:**
- Horizontal tabs below module header
- "Practice" and "Theory" options
- Active: border-b-2 primary color
- Inactive: tertiary text, hover effect

**Theory Content:**
- max-w-4xl prose container
- Mathematical notation: KaTeX rendering
- Equation blocks: surface elevated, p-4, rounded
- Bullet lists for assumptions
- Code-style for formulas (font-mono, bg-surface)

### Buttons & Actions

**Primary Actions:**
- bg-primary, hover:bg-primary-hover
- Medium size (h-10 px-6)
- Rounded corners (rounded-md)

**Secondary Actions:**
- border variant, transparent background
- hover: subtle background fill

**Export Buttons:**
- Icon + text combination
- Grouped together (CSV | PNG)
- Ghost variant with hover state

---

## Data Visualization Patterns

### Efficient Frontier Chart
- Scatter plot with connected line for frontier
- CML as contrasting dashed line
- Tangency portfolio highlighted (larger marker)
- Hover tooltip shows weights breakdown
- Axes: properly labeled with units

### Security Market Line
- Line chart with regression line
- Points labeled by ticker
- Alpha distance shown via vertical line segments
- Grid for easy reading
- Legend with equation display (α, β, R²)

### Correlation Heatmap
- Diverging color scale (cool to warm)
- Cell annotations with correlation values
- Diagonal emphasized (perfect correlation)
- Compact square cells

### Distribution Histograms
- Bars with subtle transparency
- Normal overlay as smooth curve (contrasting color)
- Statistical annotations (mean, median, skew)

---

## Module-Specific Patterns

### Portfolio Builder
- Left panel: ticker selection + controls
- Center: large frontier chart
- Right panel: optimal weights table + metrics

### Model Tester
- Top: regression controls
- Main: SML chart with large canvas
- Bottom: results table (sortable by alpha/beta)

### Factor Analyzer
- Factor selection checkboxes (compact grid)
- Correlation heatmap (center)
- Factor loadings table (below)
- R² comparison visualization

### Utility Explorer
- Utility function type selector (radio buttons)
- Gamma slider with real-time update
- Dual chart: U(x) and U'(x) side by side
- SDF overlay toggle

---

## Responsive Behavior

**Desktop (lg+):** Full sidebar + multi-column layouts
**Tablet (md):** Collapsible sidebar, 2-column grids become 1-column
**Mobile (base):** Bottom navigation, stacked layouts, full-width charts

---

## Animations

**Minimal, purposeful only:**
- Chart data transitions: 300ms ease
- Tab switching: 200ms crossfade
- Dropdown/modal: 150ms slide-fade
- Hover states: 100ms color transition
- No decorative animations

---

## Accessibility & Dark Mode

- Maintain WCAG AA contrast ratios (4.5:1 for text)
- Dark mode is default and primary focus
- Form inputs maintain dark backgrounds consistently
- Focus indicators always visible (ring-2 ring-primary)
- Keyboard navigation fully supported
- Screen reader labels for all interactive elements