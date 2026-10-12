type Props = {
  title: string
  description: string
  day: string
}

// Temporary stand-in for a screen that has not been built yet.
export default function Placeholder({ title, description, day }: Props) {
  return (
    <section className="placeholder">
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="day">Planned for {day}</p>
    </section>
  )
}
