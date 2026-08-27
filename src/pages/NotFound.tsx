import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import CloudFace from '../components/CloudFace';
import './NotFound.css';

const TITLE = 'Page not found — SAF Check-in';

/* 404 — "4 [cloud] 4". The two numerals slide in from the sides, the cloud settles in
   and then floats; heading, line and buttons follow in 100 ms steps. All of it is CSS
   in NotFound.css and only runs under prefers-reduced-motion: no-preference. */
export default function NotFound() {
  const [explain, setExplain] = useState(false);
  const explainId = useId();

  useEffect(() => {
    const previous = document.title;
    document.title = TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="nf-page">
      <div className="nf-art" aria-hidden="true">
        <span className="nf-four nf-four--left">4</span>
        <div className="nf-cloud">
          <div className="nf-cloud-float">
            <CloudFace />
          </div>
        </div>
        <span className="nf-four nf-four--right">4</span>
      </div>

      <p className="nf-kicker">404</p>
      <h1 className="nf-title">This page wandered off.</h1>
      <p className="nf-line">
        It's not here — but you are, and that counts. Let's get you somewhere useful.
      </p>

      <div className="nf-actions">
        <Link className="nf-primary" to="/">
          Take me home
        </Link>
        <Link className="nf-secondary" to="/check-in">
          Start a check-in
        </Link>
      </div>

      <div className="nf-explain">
        <button
          type="button"
          className="nf-explain-toggle"
          aria-expanded={explain}
          aria-controls={explainId}
          onClick={() => setExplain((open) => !open)}
        >
          What's a 404?
        </button>
        {explain && (
          <p id={explainId} className="nf-explain-text">
            It's the code a site sends back when an address doesn't match any page it has —
            usually a typo or an old link, and nothing you did wrong.
          </p>
        )}
      </div>
    </div>
  );
}
