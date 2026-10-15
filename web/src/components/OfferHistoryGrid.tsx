import { useMemo, type ReactNode } from 'react'
import type { AgPanelConfig } from 'ag-studio'
import { AgStudio, AgStudioProvider } from 'ag-studio-react'
import { appStudioTheme, STUDIO_LICENSE as LICENSE } from '../lib/studioTheme'
import type { Negotiation } from '../types/marketplace'

// Loaded on demand by OfferHistory, so AG Studio is only downloaded when someone opens a negotiation.

const SOURCE = 'offers'

// Sizes, from the AG Studio "Modes & Layout" docs. The page is a grid of rows `ROW_HEIGHT` tall, and with
// `pagePadding: 0` a page of N rows is exactly N * ROW_HEIGHT pixels, so the table can fill its card.
const ROW_HEIGHT = 16
const TABLE_ROW_HEIGHT = 28
const HEADER_AND_TOOLBAR = 72

// View mode shows a Filters panel on the right by default. It only says "No filters available" here
// (the table has no filter fields to offer) and takes about a fifth of the width, so it is hidden.
const PANELS: AgPanelConfig = { view: { left: [], right: [] } }

// How many layout rows the table needs for this many offers (kept between a sensible minimum and maximum).
const rowsFor = (offerCount: number) =>
  Math.min(32, Math.max(12, Math.ceil((offerCount * TABLE_ROW_HEIGHT + HEADER_AND_TOOLBAR) / ROW_HEIGHT)))

// One grid widget over one data source, the same shape as the AG Studio "State" docs.
function gridState(columns: string[], rows: number) {
  return {
    pages: [
      {
        id: 'history',
        widgets: {
          '1': {
            type: 'grid',
            dataMapping: { cols: columns.map((c) => ({ id: `${SOURCE}.${c}` })) },
            format: { style: { theme: { rowHeight: TABLE_ROW_HEIGHT } } },
          },
        },
        // One widget over the whole page: all 24 columns and every row.
        widgetLayout: { '1': { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: rows } },
      },
    ],
    selectedPageId: 'history',
  }
}

/**
 * Every offer of the negotiation as an AG Studio grid: sortable, filterable, resizable columns.
 * It only ever uses what this person may see: their own limit, never the other side's.
 */
export default function OfferHistoryGrid({ negotiation }: { negotiation: Negotiation }) {
  const { offers, viewerRole, buyerLimits, sellerLimits } = negotiation

  // A buyer compares each offer with their maximum, a seller with their price floor.
  const limitField = viewerRole === 'buyer' ? 'vsYourMax' : 'vsYourFloor'
  const limit = viewerRole === 'buyer' ? buyerLimits?.max : sellerLimits?.floor

  const rowsJson = JSON.stringify(
    [...offers]
      .sort((a, b) => a.round - b.round || (a.role === 'buyer' ? -1 : 1))
      .map((o) => ({
        round: o.round,
        agent: o.role === viewerRole ? 'Your agent' : o.role === 'buyer' ? 'Buyer agent' : 'Seller agent',
        offer: o.amount,
        engineCheck: o.blocked ? `Adjusted from $${o.blocked.proposed}` : 'Passed',
        ...(limit != null && { [limitField]: o.amount - limit }),
        note: o.note,
      })),
  )

  // Stable objects: Studio reads them again only when the offers really change.
  const data = useMemo(() => ({ sources: [{ id: SOURCE, data: JSON.parse(rowsJson) }] }), [rowsJson])
  const rows = rowsFor(offers.length)
  const initialState = useMemo(
    () => gridState(['round', 'agent', 'offer', 'engineCheck', ...(limit != null ? [limitField] : []), 'note'], rows),
    [limit, limitField, rows],
  )

  // The default page is at least 720px wide (so it scrolls sideways in a narrower card) and has a 4px
  // margin. Let it shrink to the card, and give it exactly the height of its rows.
  const layout = useMemo(
    () => ({ minWidth: 320, rowHeight: ROW_HEIGHT, pagePadding: 0, height: rows * ROW_HEIGHT }),
    [rows],
  )

  // The state object follows the AG Studio docs; it is typed loosely here so the compiler does not
  // reject a valid shape. If Studio reports it as invalid, re-create it in edit mode and copy it with getState().
  const studio: ReactNode = (
    <AgStudio
      // Studio reads `initialState` once, so a table that needs more rows (a new round) starts over.
      key={rows}
      style={{ width: '100%', height: '100%' }}
      data={data}
      initialState={initialState as never}
      mode="view"
      panels={PANELS}
      layout={layout}
      theme={appStudioTheme as never}
    />
  )
  return (
    <div className="offer-history-grid" style={{ height: rows * ROW_HEIGHT }}>
      {LICENSE ? <AgStudioProvider licenseKey={LICENSE}>{studio}</AgStudioProvider> : studio}
    </div>
  )
}
