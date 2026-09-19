import { Header } from '../../components/layout/Header'
import { Footer } from '../../components/layout/Footer'
import { Hero } from './sections/Hero'
import { PlatformOverview } from './sections/PlatformOverview'
import { Products } from './sections/Products'
import { About } from './sections/About'
import { AISection } from './sections/AISection'
import { CTASection } from './sections/CTASection'

export function LandingPage() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <PlatformOverview />
        <Products />
        <About />
        <AISection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
