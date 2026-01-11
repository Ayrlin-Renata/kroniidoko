import Doko from './components/Doko'
import './app.css'
import Logo from './components/Logo'
import DokoShare from './components/DokoShare'

export function App() {
  const params = new URLSearchParams(window.location.search);
  const hideForecast = params.has('no_forecast') || params.get('forecast') === '0' || params.get('forecast') === 'false';

  return (
    <>
      <div id="topbar">
        <Logo id="logo" color="#ddd" />
        <h1 id="titleheading" class="serif">kronii doko?</h1>
      </div>
      <br />
      <div class="card">
        <Doko next={true} hideForecast={hideForecast} />
      </div>
      <br />
      <br />
      <br />
      <DokoShare />
      <br />
      <br />
      <br />
      <p>a fan site for <a href="https://www.youtube.com/@OuroKronii">Ouro Kronii</a> of hololive English -Promise-</p>
      <p class="lowtext">powered by holodex.js and the holodex API</p>
      <p class="lowtext">images and intellectual property owned by COVER Corporation, and used under COVER Corp.'s <a href="https://hololivepro.com/en/terms/">derivative works guidelines.</a></p>
    </>
  )
}
