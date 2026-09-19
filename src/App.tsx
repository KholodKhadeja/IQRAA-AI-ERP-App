import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { Hero } from './pages/Landing/sections/Hero'
import { PlatformOverview } from './pages/Landing/sections/PlatformOverview'

function App() {
    return (
      <>
        <Header />
        <main>
          <Hero />
          <PlatformOverview />
        </main>
        <Footer />
      </>
    )
}

export default App
