import { themeQuartz } from 'ag-grid-community'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, -apple-system, 'Segoe UI', sans-serif"

/** Row heights for the two densities the ledger offers. */
export const DENSITY = { comfortable: 56, compact: 40 } as const
export type Density = keyof typeof DENSITY

/**
 * AG Grid's Quartz theme, recoloured with this app's navy, warm neutrals and soft corners (tokens.css).
 * Built with the Theming API (`withParams`), so there is no CSS file to import and every value is typed.
 */
export const ledgerTheme = themeQuartz.withParams({
  fontFamily: FONT,
  fontSize: 14,
  accentColor: '#003087',
  backgroundColor: '#ffffff',
  foregroundColor: '#001435',
  borderColor: '#efece6',
  wrapperBorder: false,
  wrapperBorderRadius: 0,
  columnBorder: false,
  rowBorder: { style: 'solid', width: 1, color: '#f3f0eb' },
  headerBackgroundColor: '#faf8f5',
  headerTextColor: '#5b6577',
  headerFontSize: 12,
  headerFontWeight: 700,
  headerHeight: 46,
  headerColumnResizeHandleColor: '#cfd5e0',
  rowHoverColor: '#f4f8ff',
  selectedRowBackgroundColor: '#e6f0fd',
  cellHorizontalPadding: 12,
  iconSize: 14,
  inputBorder: { style: 'solid', width: 1, color: '#c9cfda' },
  inputFocusBorder: { style: 'solid', width: 2, color: '#0057b3' },
  checkboxCheckedBackgroundColor: '#003087',
  menuBackgroundColor: '#ffffff',
  menuShadow: '0 12px 28px rgba(0, 20, 53, 0.16)',
  borderRadius: 8,
  spacing: 8,
})
