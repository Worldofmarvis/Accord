import { useState } from 'react'

type Props = {
  name: string
  /** A photo. If it is missing or fails to load, the person's initials are shown. */
  src?: string
  size?: number
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

/** A round picture of a person. Decorative: the name is always written next to it. */
export default function Avatar({ name, src, size = 56 }: Props) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : initialsOf(name)}
    </span>
  )
}
