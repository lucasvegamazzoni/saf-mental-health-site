import { Link } from 'react-router-dom';
import { useIsModerator } from '../lib/db';
import StoriesQueue from '../components/moderation/StoriesQueue';
import RecognitionsQueue from '../components/moderation/RecognitionsQueue';
import './Moderate.css';

/** /moderate — review queue for the small group of moderators. Everyone else sees a calm note. */
export default function Moderate() {
  const isMod = useIsModerator();

  if (!isMod) {
    return (
      <div className="mod-page">
        <section className="mod-gate" aria-label="Moderators only">
          <p className="mod-kicker">Moderators only</p>
          <h1 className="mod-title">This page is for moderators.</h1>
          <p className="mod-body">
            Nothing to worry about — there is nothing here you are missing. Head back home to
            check in or read a story.
          </p>
          <Link className="mod-primary" to="/">
            Back home
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mod-page">
      <header className="mod-head">
        <p className="mod-kicker">Moderation</p>
        <h1 className="mod-title">Review queue</h1>
        <p className="mod-body">
          Publish what is safe and kind. Nothing here shows who wrote it — keep it that way.
        </p>
      </header>
      <section className="mod-section" aria-labelledby="mod-stories">
        <h2 id="mod-stories" className="mod-h2">
          Stories
        </h2>
        <StoriesQueue />
      </section>
      <section className="mod-section" aria-labelledby="mod-recognitions">
        <h2 id="mod-recognitions" className="mod-h2">
          Recognitions
        </h2>
        <RecognitionsQueue />
      </section>
    </div>
  );
}
