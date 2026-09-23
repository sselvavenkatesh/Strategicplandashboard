import { Link } from 'react-router-dom'

export function WelcomePage() {
  return (
    <main className="page placeholder-page">
      <p className="eyebrow">District 360</p>
      <h1>Strategic Plan Dashboard</h1>
      <p>The application foundation is ready. The Welcome Page UX will be implemented from the approved product specification.</p>
      <Link className="primary-link" to="/summary">Explore dashboard</Link>
    </main>
  )
}
