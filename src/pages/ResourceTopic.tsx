import { Link, useParams } from 'react-router-dom';
import { RESOURCE_TOPICS } from '../data/content';
import './ResourceTopic.css';

export default function ResourceTopic() {
  const { topic: slug } = useParams<{ topic: string }>();
  const topic = RESOURCE_TOPICS.find((t) => t.slug === slug);

  if (!topic) {
    return (
      <div className="resourcetopic-page">
        <div className="resourcetopic-missing">
          <span className="resourcetopic-missing-emoji" aria-hidden="true">
            🍃
          </span>
          <h1 className="resourcetopic-missing-title">That page took a rest day.</h1>
          <p className="resourcetopic-missing-note">
            We couldn't find that topic — it may have moved, or never existed.
          </p>
          <Link to="/resources" className="resourcetopic-back">
            ← Back to all resources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="resourcetopic-page">
      <Link to="/resources" className="resourcetopic-back">
        ← All resources
      </Link>

      <header className="resourcetopic-head">
        <span className="resourcetopic-emoji" aria-hidden="true">
          {topic.emoji}
        </span>
        <h1 className="resourcetopic-title">{topic.title}</h1>
        <p className="resourcetopic-blurb">{topic.blurb}</p>
      </header>

      <ul className="resourcetopic-tips">
        {topic.tips.map((tip) => (
          <li key={tip.title} className="resourcetopic-tip">
            <h2 className="resourcetopic-tip-title">{tip.title}</h2>
            <p className="resourcetopic-tip-body">{tip.body}</p>
            {tip.source && (
              <p className="resourcetopic-tip-source">
                Source:{' '}
                <a href={tip.source.url} target="_blank" rel="noreferrer">
                  {tip.source.label}
                </a>
              </p>
            )}
          </li>
        ))}
      </ul>

      {topic.links.length > 0 && (
        <section className="resourcetopic-links" aria-labelledby="resourcetopic-links-title">
          <p className="resourcetopic-links-kicker">Further reading</p>
          <h2 id="resourcetopic-links-title" className="resourcetopic-links-title">
            Where these tips come from
          </h2>
          <p className="resourcetopic-links-note">
            Free, public guidance. Each link opens in a new tab — nothing about you is sent along.
          </p>
          <ul className="resourcetopic-links-list">
            {topic.links.map((link) => (
              <li key={link.url}>
                <a className="resourcetopic-link" href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                  <span aria-hidden="true"> ↗</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="resourcetopic-stories">
        <p className="resourcetopic-stories-text">
          <strong>Stories that might help.</strong> Sometimes hearing how someone else got through
          the same thing beats any tip.
        </p>
        <Link to="/stories" className="resourcetopic-stories-link">
          Read stories →
        </Link>
      </aside>

      <p className="resourcetopic-foot">
        <Link to="/resources" className="resourcetopic-back">
          ← Back to all resources
        </Link>
      </p>
    </div>
  );
}
