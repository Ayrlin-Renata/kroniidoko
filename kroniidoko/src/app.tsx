import Doko from './components/Doko'
import './app.css'

export function App() {
  return (
    <>
      <h1 class="serif">kronii doko?</h1>
      <br/>
      <div class="card">
        <Doko/>
      </div>
      <br/>
      <br/>
      <p>a fan site for <a href="https://www.youtube.com/@OuroKronii">Ouro Kronii</a> of hololive English -Promise-</p>
      <p class="lowtext">powered by holodex.js and the holodex API</p>
    </>
  )
}
