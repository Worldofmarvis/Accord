import type { ReactNode } from 'react'

/** A form control with a small icon inside its left edge (and an optional arrow on the right, for the category list). */
export default function IconField({ icon, chevron, top, children }: { icon: ReactNode; chevron?: ReactNode; top?: boolean; children: ReactNode }) {
  return (
    <div className={`sd-icon-field${top ? ' sd-icon-field-top' : ''}`}>
      <span className="sd-field-icon" aria-hidden="true">
        {icon}
      </span>
      {children}
      {chevron && (
        <span className="sd-field-chevron" aria-hidden="true">
          {chevron}
        </span>
      )}
    </div>
  )
}
