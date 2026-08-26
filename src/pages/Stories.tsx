import { useState } from 'react';
import { SEED_STORIES, STORY_THEMES } from '../data/content';
import type { Story } from '../data/content';
import SignInGate from '../components/SignInGate';
import { useSession } from '../lib/auth';
import './Stories.css';

function Dot({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="currentColor" />
    </svg>
  );
}

const HELPER_PROMPTS = [
  'What happened?',
  'How did you feel?',
  'What helped?',
  'What advice would you give?',
];

function HopeScore({ score }: { score: Story['hopeScore'] }) {
  return (
    <span className="stories-hope" role="img" aria-label={`Hope score ${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Dot key={n} className={`stories-hope-leaf${n <= score ? ' is-filled' : ''}`} />
      ))}
      <span className="stories-hope-num" aria-hidden="true">
        {score}/5
      </span>
    </span>
  );
}

function StoryCard({
  story,
  expanded,
  onToggle,
}: {
  story: Story;
  expanded: boolean;
  onToggle: () => void;
}) {
  const themeEmoji = STORY_THEMES.find((t) => t.label === story.theme)?.emoji;
  const bodyId = `stories-more-${story.id}`;

  return (
    <article className="stories-card">
      <div className="stories-card-meta">
        <span className="stories-tag">
          {themeEmoji && <span aria-hidden="true">{themeEmoji}</span>} {story.theme}
        </span>
        <HopeScore score={story.hopeScore} />
        <span className="stories-readtime">{story.readMins} min read</span>
      </div>

      <h2 className="stories-card-title">{story.title}</h2>
      <p className="stories-card-preview">{story.preview}</p>

      <div id={bodyId} className="stories-card-more" hidden={!expanded}>
        {story.body.map((para) => (
          <p key={para} className="stories-card-para">
            {para}
          </p>
        ))}
        <div className="stories-lessons">
          <h3 className="stories-lessons-title">What helped this person?</h3>
          <ul className="stories-lessons-list">
            {story.lessons.map((lesson) => (
              <li key={lesson} className="stories-lesson">
                <span className="stories-lesson-check" aria-hidden="true">
                  ✔
                </span>
                {lesson}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        className="stories-readmore"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </article>
  );
}

export default function Stories() {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [stubOpen, setStubOpen] = useState(false);
  const session = useSession();
  const canShare = session.status === 'in';

  const visible = activeTheme
    ? SEED_STORIES.filter((story) => story.theme === activeTheme)
    : SEED_STORIES;

  return (
    <div className="stories-page">
      <header className="stories-head">
        <h1 className="stories-title">Real Stories. Real Growth.</h1>
        <p className="stories-sub">
          Every story shared here is completely anonymous. Names and identifying details are
          automatically removed so everyone can speak honestly and safely.
        </p>
        <p className="stories-banner">
          <span aria-hidden="true">🌱</span> Sample stories — real anonymous stories will appear
          here.
        </p>
      </header>

      <div className="stories-chips" role="group" aria-label="Filter stories by theme">
        <button
          type="button"
          className={`stories-chip${activeTheme === null ? ' is-active' : ''}`}
          aria-pressed={activeTheme === null}
          onClick={() => setActiveTheme(null)}
        >
          All
        </button>
        {STORY_THEMES.map((theme) => (
          <button
            key={theme.label}
            type="button"
            className={`stories-chip${activeTheme === theme.label ? ' is-active' : ''}`}
            aria-pressed={activeTheme === theme.label}
            onClick={() =>
              setActiveTheme((current) => (current === theme.label ? null : theme.label))
            }
          >
            <span aria-hidden="true">{theme.emoji}</span> {theme.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="stories-empty">
          No sample stories under this theme yet — real anonymous stories will fill this space.
        </p>
      ) : (
        <div className="stories-list">
          {visible.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              expanded={expandedId === story.id}
              onToggle={() =>
                setExpandedId((current) => (current === story.id ? null : story.id))
              }
            />
          ))}
        </div>
      )}

      {!canShare ? (
        <SignInGate
          what="anything you share"
          next="/stories"
          note="Stories are published anonymously, but a call sign lets you edit or withdraw yours later. No name, no email, no unit."
        />
      ) : (
      <section className="stories-share" aria-labelledby="stories-share-title">
        <h2 id="stories-share-title" className="stories-share-title">
          Share Your Story
        </h2>
        <p className="stories-share-prompt">
          What's something you've been through that might help someone else?
        </p>
        <ul className="stories-share-hints" aria-label="Prompts to get you started">
          {HELPER_PROMPTS.map((prompt) => (
            <li key={prompt} className="stories-share-hint">
              {prompt}
            </li>
          ))}
        </ul>
        <textarea
          className="stories-share-input"
          aria-label="Your story"
          placeholder="Write as much or as little as you like…"
          rows={7}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="stories-share-actions">
          <button
            type="button"
            className="stories-share-submit"
            onClick={() => setStubOpen(true)}
          >
            Submit
          </button>
          <span className="stories-share-note">Anonymous by design — no names needed.</span>
        </div>

        {stubOpen && (
          <div className="stories-stub" role="status">
            <p className="stories-stub-title">Nothing was uploaded — and that's on purpose.</p>
            <p className="stories-stub-body">
              In the full version, AI anonymisation will automatically remove names, locations,
              and unit details before a story is shared. That step is coming soon — so this demo
              doesn't upload or store anything you write here.
            </p>
            <button
              type="button"
              className="stories-stub-close"
              onClick={() => setStubOpen(false)}
            >
              Got it
            </button>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
