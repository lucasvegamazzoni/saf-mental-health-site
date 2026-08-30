import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { RESOURCE_TOPICS } from '../data/content';
import './Resources.css';

function Leaf({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21 C11 14 12 8 17 3 C19 9 17 16 12 21 Z M12 21 C12 15 10 10 5 7 C5 13 8 18 12 21 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Resources() {
  useSeo(
    'Wellbeing resources for NS — stress, sleep, recovery, mental health, relationships',
    'Practical, NS-specific tips: managing stress in camp, sleeping around night duties, recovering after field camp, staying close to people who matter.',
    '/resources',
  );
  return (
    <div className="resources-page">
      <header className="resources-head">
        <Leaf className="resources-leaf" />
        <h1 className="resources-title">Wellbeing Resources</h1>
        <p className="resources-lede">
          Practical, no-fuss guides for the things that actually wear you down — pick a topic and
          take whatever helps.
        </p>
      </header>

      <ul className="resources-grid">
        {RESOURCE_TOPICS.map((topic) => (
          <li key={topic.slug} className="resources-cell">
            <Link to={`/resources/${topic.slug}`} className="resources-card">
              <span className="resources-card-emoji" aria-hidden="true">
                {topic.emoji}
              </span>
              <span className="resources-card-title">{topic.title}</span>
              <span className="resources-card-blurb">{topic.blurb}</span>
              <span className="resources-card-chips">
                {topic.tips.slice(0, 3).map((tip) => (
                  <span key={tip.title} className="resources-chip">
                    {tip.title}
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
