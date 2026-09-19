import styles from './Products.module.css'

const PRODUCTS = [
  'Online Course',
  'Face-to-face Course',
  'Hybrid Course',
  'E-learning Module',
  'Training Video',
  'Learning Game',
  'Presentation',
  'Simulation',
  'Micro-credential Course',
]

export function Products() {
  return (
    <section className={styles.section} id="products" aria-labelledby="products-heading">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.eyebrow}>Products</span>
          <h2 id="products-heading" className={styles.heading}>
            Built for digital learning production.
          </h2>
        </div>

        <ul className={styles.grid}>
          {PRODUCTS.map((product) => (
            <li key={product} className={styles.product}>
              {product}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
