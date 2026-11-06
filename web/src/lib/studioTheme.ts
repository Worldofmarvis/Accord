import * as Studio from 'ag-studio'

/** The AG Studio licence key (`VITE_AG_STUDIO_LICENSE` in web/.env). Without one Studio still runs, with a watermark. */
export const STUDIO_LICENSE = (import.meta.env.VITE_AG_STUDIO_LICENSE ?? '').trim()

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, -apple-system, 'Segoe UI', sans-serif"

// Studio's own default theme (`studioTheme`), recoloured with this app's navy, warm neutrals and soft
// corners (src/styles/tokens.css). These six are "shared theme params" from the AG Studio theme reference.
//
// It is read from the module object on purpose: if a future AG Studio version renames the export, the
// tables simply keep Studio's default look instead of stopping the build.
const base = (Studio as unknown as { studioTheme?: { withParams: (params: Record<string, unknown>) => unknown } }).studioTheme

export const appStudioTheme: unknown = base?.withParams({
  accentColor: '#003087',
  backgroundColor: '#ffffff',
  chromeBackgroundColor: '#faf8f5',
  headerBackgroundColor: '#f3f1ed',
  borderRadius: 10,
  fontFamily: FONT,
})

/**
 * The chart strip of the sales history: the same palette, but with no frame around the dashboard (the card
 * around it is the frame), a white canvas, and smaller, bolder chart titles. Names are from the AG Studio
 * theme reference (`studioWrapperBorder`, `studioCanvas*`, `studioWidget*`).
 */
export const chartStudioTheme: unknown = base?.withParams({
  accentColor: '#003087',
  backgroundColor: '#ffffff',
  fontFamily: FONT,
  studioWrapperBorder: false,
  studioCanvasBorder: false,
  studioCanvasBackgroundColor: '#ffffff',
  studioWidgetBorder: { style: 'solid', width: 1, color: '#efece6' },
  studioWidgetBorderRadius: 12,
  studioWidgetPadding: 8,
  studioWidgetTitleFontFamily: FONT,
  studioWidgetTitleFontSize: 15,
  studioWidgetTitleFontWeight: 700,
  studioWidgetTitleTextColor: '#001435',
})
