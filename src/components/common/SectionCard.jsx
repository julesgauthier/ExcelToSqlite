export default function SectionCard({ title, children }) {
  return (
    <section className="section-card">
      {title && <h2 className="section-title">{title}</h2>}
      {children}
    </section>
  );
}
