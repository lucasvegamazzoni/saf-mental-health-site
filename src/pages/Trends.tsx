import { Link } from 'react-router-dom';
import './Trends.css';

/** /trends — stub. The trends feature agent replaces this with the anonymous weekly picture. */
export default function Trends() {
  return (
    <div className="trends-page">
      <header className="trends-head">
        <p className="trends-kicker">This week, together</p>
        <h1 className="trends-title">How the week has been for everyone.</h1>
        <p className="trends-body">
          This page isn't built yet. When it is, it will show anonymous week-by-week patterns —
          never anything about one person.
        </p>
      </header>
      <section className="trends-card" role="status">
        <p>Nothing to show yet.</p>
        <Link className="trends-secondary" to="/check-in">
          Do this week's check-in
        </Link>
      </section>
    </div>
  );
}
