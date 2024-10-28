import { useState } from 'preact/hooks'
import Doko from './components/Doko'
import './app.css'

export function App() {
  const [count, setCount] = useState(0)


  return (
    <>
      <h1>kronii doko?</h1>
      <div class="card">
        <Doko/>
      </div>
    </>
  )
}
