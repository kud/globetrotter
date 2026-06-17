import Sidebar from "@/components/sidebar"
import MapStage from "@/components/map-stage"

const Home = () => (
  <div className="grid h-dvh grid-cols-1 overflow-hidden md:grid-cols-[340px_1fr] md:grid-rows-1">
    <Sidebar />
    <MapStage />
  </div>
)

export default Home
