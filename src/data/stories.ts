/* ---------------------------------------------------------------------------
 * stories.ts — story themes + seeded stories.
 *
 * The seed stories are anonymised, illustrative first-person accounts written
 * to show what the space is for. They are composites, not verbatim
 * submissions, and carry `illustrative: true` so the UI can label them.
 * ------------------------------------------------------------------------- */

/* Stories ----------------------------------------------------------------- */

export interface StoryTheme {
  emoji: string;
  label: string;
}

export const STORY_THEMES: StoryTheme[] = [
  { emoji: '🏕', label: 'Field Camp' },
  { emoji: '😓', label: 'Burnout' },
  { emoji: '🏠', label: 'Missing Home' },
  { emoji: '💬', label: 'Leadership' },
  { emoji: '🤝', label: 'Friendship' },
  { emoji: '❤️', label: 'Family' },
  { emoji: '😔', label: 'Feeling Alone' },
  { emoji: '💪', label: 'Overcoming Failure' },
  { emoji: '🎖', label: 'National Service' },
  { emoji: '🏃', label: 'Fitness' },
  { emoji: '📚', label: 'Studies' },
];

export interface Story {
  id: string;
  title: string;
  /** Matches a STORY_THEMES label. */
  theme: string;
  preview: string;
  /** Short paragraphs. */
  body: string[];
  lessons: string[];
  /** 1 (heavy) to 5 (hopeful). */
  hopeScore: 1 | 2 | 3 | 4 | 5;
  readMins: number;
  /** True for the seeded stories — anonymised composites, shown with an "illustrative" label. */
  illustrative?: boolean;
}

export const SEED_STORIES: Story[] = [
  {
    id: 'rain-on-day-three',
    title: 'Day Three, When the Rain Came',
    theme: 'Field Camp',
    preview:
      'Field camp broke me a little on the third night. What got me through was smaller than I expected.',
    body: [
      'Everyone says field camp is the worst week of BMT, and I went in thinking I was ready for it. Digging the shellscrape was fine. Eating out of the pack was fine. Then on the third day it rained for six hours straight and everything I owned was wet, including the socks I had been saving.',
      'That night I sat in the shellscrape and genuinely thought about how I could get out. Not in a dramatic way. Just tired, cold, and very sure that I was the only one this close to giving up.',
      'What actually changed things was my buddy passing me half a packet of biscuits without saying anything. Then he said, "I also want to go home." That was it. We laughed for maybe ten seconds and then went back to being miserable, but it was a shared miserable.',
      'The rain stopped on day four. We came back on the ferry, I slept twelve hours, and the socks dried. I still think about how close I felt to something bad, and how a biscuit and one honest sentence pulled me back.',
    ],
    lessons: [
      'Say the honest thing out loud — "I also want to go home" helped both of us.',
      'Small physical comfort matters: dry socks, a snack, a sip of water.',
      'Count in days, not the whole week. Day three ends.',
      'Nobody in the shellscrape next to you is as fine as they look.',
    ],
    hopeScore: 4,
    readMins: 2,
    illustrative: true,
  },
  {
    id: 'running-on-empty-in-unit',
    title: 'Running on Empty After Posting',
    theme: 'Burnout',
    preview:
      'Three months into my posting I stopped caring about anything, and it took a sergeant noticing before I admitted it.',
    body: [
      'After I got posted, life became a loop. Wake up, outfield or maintenance, guard duty every few nights, book out Friday night, sleep through Saturday, back in on Sunday. For the first two months I told myself this was just how it is.',
      'Around month three the small things started to go. I stopped replying to my friends. I snapped at a section mate over a lost pen. I dreaded even easy tasks like packing my field pack, which I had done a hundred times.',
      'My sergeant pulled me aside after a duty and asked if I was okay, and I said yes. He waited. I said no. That was the first time I had said it to anyone, including myself.',
      'Nothing magical happened. He shifted one of my duties, told me to actually sleep on the weekend instead of gaming till 4am, and checked in a week later. The tiredness took a while to lift, but the dread lifted faster once I stopped pretending.',
    ],
    lessons: [
      'Snapping at people and dreading easy tasks were my warning signs.',
      'When someone asks if you are okay, the second answer is usually the real one.',
      'Sleep on book-out weekends instead of trying to "make up" for lost time.',
      'Commanders can only adjust what they know about.',
    ],
    hopeScore: 3,
    readMins: 2,
    illustrative: true,
  },
  {
    id: 'eight-minute-calls',
    title: 'The Eight-Minute Calls With My Mum',
    theme: 'Missing Home',
    preview:
      'Confinement during BMT hit harder than I expected. A boring nightly call became the thing I looked forward to most.',
    body: [
      'Tekong is not far. You can see the mainland from the jetty. But during the first two weeks of confinement it felt like another country. I had never been away from home for more than a few days, and suddenly I was counting sleeps like a kid.',
      'What surprised me was how much I missed the boring stuff. My mum asking whether I had eaten. The sound of the TV in the living room. My sister complaining about school.',
      'In the second week I started calling home during admin time, eight minutes at most before the phones got collected. Nothing important was ever said. My mum told me what she cooked. I told her the food was okay. My dad said "take care" the same way every time.',
      'Those calls did not fix the homesickness. But they made home feel like a place that was still there, waiting, rather than something I had lost. By the first book-out I was almost surprised how normal everything was.',
    ],
    lessons: [
      'Short, regular calls beat one long emotional one.',
      'Let the calls be boring. Boring is what home sounds like.',
      'Homesickness is normal even for people who look completely settled.',
    ],
    hopeScore: 5,
    readMins: 2,
    illustrative: true,
  },
  {
    id: 'first-week-as-section-commander',
    title: 'My Section Did Not Trust Me',
    theme: 'Leadership',
    preview:
      'I came back from command school thinking I knew what a leader was. My section taught me otherwise in about a week.',
    body: [
      'When I got my rank I was proud and a bit scared. I had watched my own commanders and thought I knew the recipe: be firm, be loud, never show that you are unsure.',
      'It did not work. My section did the bare minimum. One of them, older than me and clearly not impressed, asked in front of everyone why we were doing a drill a certain way. I did not actually know. I made something up, and everyone could tell.',
      'That night I sat in the bunk feeling like a fraud. I nearly asked to be taken off. Instead I went to my platoon sergeant and told him the truth. He said something I still remember: "They don\'t need you to know everything. They need to know you won\'t leave them hanging."',
      'The next day I told the section I had been wrong about the drill and asked the older guy how he would do it. That was the turning point. Not because I became a great leader overnight, but because I stopped performing one.',
    ],
    lessons: [
      'Admitting "I don\'t know, let me find out" earned more respect than pretending.',
      'Ask the experienced person in your section for input. It is not weakness.',
      'Talk to your own commander when you feel like a fraud — they have been there.',
      'Consistency matters more than volume.',
    ],
    hopeScore: 4,
    readMins: 3,
    illustrative: true,
  },
  {
    id: 'the-guy-next-to-me',
    title: 'The Guy in the Next Bed',
    theme: 'Friendship',
    preview:
      'We had nothing in common except our bunk numbers. He ended up being the reason I got through the year.',
    body: [
      'In BMT I got assigned a buddy I would never have chosen. Different school, different music, different everything. For the first week we barely spoke beyond "your turn to sweep".',
      'What changed it was a night of area cleaning gone wrong. Our bunk failed inspection twice and we were both blamed for a locker neither of us had touched. Standing in the corridor at 11pm being scolded together, we started laughing, which made it worse, which made us laugh more.',
      'From then on it was easy. He covered for me when I was slow at packing. I helped him with the IPPT static stations. When his grandmother was in hospital during a confinement week, I sat with him in the bunk and did not say much. He did the same for me a few months later when my breakup happened.',
      'We are in different units now and message maybe once a week. It is enough. I did not know I needed a friend who had seen me at my worst until I had one.',
    ],
    lessons: [
      'You do not need to have things in common. You need to have been through things together.',
      'Sitting with someone in silence counts.',
      'Cover each other on the small things and the big things will follow.',
    ],
    hopeScore: 5,
    readMins: 2,
    illustrative: true,
  },
  {
    id: 'dads-diagnosis-during-service',
    title: 'Serving While Dad Was Sick',
    theme: 'Family',
    preview:
      'My father got his diagnosis two months into my service. Being away from home while it happened was the hardest part of NS.',
    body: [
      'My dad called me on a Wednesday to say the tests had come back and it was serious. I was in camp, standing outside the cookhouse, and I did not know what to do with my body. I just stood there until someone asked if I was okay.',
      'For a few weeks I was in two places at once. Physically in camp, doing the programme. Mentally at home, refreshing the family chat every chance I got. I did not tell anyone in camp for a while because I did not want to be treated differently.',
      'Eventually I told my officer, mostly because I had stopped sleeping. He did not make a big deal of it. He helped me apply for compassionate leave for the hospital appointments and told me to say something if I needed more.',
      'My dad is doing better now. What I learnt is that the system can bend if you let it know. I had assumed I would have to choose between being a good son and being a good soldier, and it turned out nobody was asking me to.',
    ],
    lessons: [
      'Tell your commander early — leave and support exist but you have to ask.',
      'You do not have to hide family stuff to be taken seriously.',
      'Set one time a day to check the family chat instead of every five minutes.',
      'Being present in camp is not the same as abandoning home.',
    ],
    hopeScore: 3,
    readMins: 3,
    illustrative: true,
  },
  {
    id: 'everyone-had-a-group',
    title: 'Everyone Had a Group Except Me',
    theme: 'Feeling Alone',
    preview:
      'By the second month in unit it felt like everyone had found their people and I was still eating alone.',
    body: [
      'In BMT you are forced together, so you never really feel alone. In unit it was different. The guys who came from the same school stuck together. The guys who gamed together stuck together. I was quiet and not from anywhere in particular, and by the second month I was eating my cookhouse meals alone most days.',
      'The worst part was how normal I looked. Nobody was mean to me. I just was not part of anything, and the more time passed the more it felt like a permanent fact rather than a phase.',
      'What shifted it was small and a bit embarrassing. During a long wait before an exercise I asked the guy next to me what he was listening to. We talked for an hour about nothing. He invited me to sit with his group at dinner and I nearly said no because I was so used to saying no.',
      'I still eat alone sometimes and I still like it. The difference is that now it is a choice. Being alone and being lonely turned out to be two different things.',
    ],
    lessons: [
      'The first question is the hardest. "What are you listening to?" was enough.',
      'Looking fine from the outside does not mean you are fine. Say something.',
      'Accept the first invitation even if you are used to refusing.',
      'Being alone by choice feels completely different from feeling left out.',
    ],
    hopeScore: 4,
    readMins: 2,
    illustrative: true,
  },
  {
    id: 'out-of-course',
    title: 'Getting Dropped From the Course',
    theme: 'Overcoming Failure',
    preview:
      'I was taken off the course I had set my whole NS around. It felt like the end of something. It was not.',
    body: [
      'I wanted the course badly. I had trained for it, told my family about it, built my idea of who I would be around it. Three weeks in, I failed a key assessment twice and was taken out.',
      'The next few days were bad. Going back to the holding platoon felt like walking around with a sign on my back. I avoided the guys who had made it because seeing them hurt, and I told myself the whole thing was rigged, which I knew was not true.',
      'A regular I barely knew sat next to me one lunch and told me he had been dropped from the same course years ago. He did not give me a speech. He just said that what I did next would matter more than what had happened.',
      'I ended up in a vocation I had never considered and, honestly, I am good at it. I still wish I had passed. But I stopped seeing the failure as the story of my NS and started seeing it as one chapter that happened to be bad.',
    ],
    lessons: [
      'Let yourself be upset for a few days. Then decide what the next thing is.',
      'Find someone who has failed the same thing. They exist and they are usually fine.',
      'Avoiding the people who passed only makes the gap bigger.',
      'Your NS is not one course. It is two years of chances.',
    ],
    hopeScore: 4,
    readMins: 3,
    illustrative: true,
  },
  {
    id: 'why-am-i-even-here',
    title: 'Why Am I Even Here',
    theme: 'National Service',
    preview:
      'For most of my first year I resented every day of NS. I did not become a patriot. I did find a reason.',
    body: [
      'I am going to be honest: I did not want to serve. My friends overseas were starting university while I was learning to fold a smart four. For a long time every morning started with the same thought — what is the point of this.',
      'The resentment made everything heavier. Guard duty was not just guard duty, it was proof that my life was on hold. I complained constantly and I could feel my section getting tired of it.',
      'The turning point was not a speech or a parade. It was a night exercise where a guy from another platoon went down with heat injury and I was one of the people who carried him out. I did not think about it at the time. Afterwards I realised I had just done something that mattered, for someone I did not know, without being asked.',
      'I still count down to ORD. I still think the two years are long. But I stopped asking what the point was, because I found a small one: the people next to me. That turned out to be enough to get through the rest of it.',
    ],
    lessons: [
      'You do not have to love NS to find something in it worth doing well.',
      'Constant complaining made my own days heavier, not lighter.',
      'Look for the moments where you were useful to someone. They add up.',
    ],
    hopeScore: 3,
    readMins: 3,
    illustrative: true,
  },
  {
    id: 'the-2-4-that-would-not-move',
    title: 'The 2.4 That Refused to Move',
    theme: 'Fitness',
    preview:
      'Everyone else improved their 2.4 timing. Mine stayed stuck for months and I started to believe I was just built wrong.',
    body: [
      'I came into BMT overweight and slow, and I made peace with that. What I could not make peace with was that after months of training, everyone around me was improving and my 2.4 timing was stuck at almost exactly the same number.',
      'Every IPPT attempt felt like a public announcement that I was not trying hard enough, even though I was. I started skipping the optional runs because what was the point. My PTI noticed and asked what was going on.',
      'He looked at how I was running and told me I was going out too fast on the first lap and dying on the last two. I had been running the same wrong way for months. He had me run the first lap slower than felt right, and for the first time I finished with something left.',
      'My timing dropped by over a minute in the next six weeks. Not because I got dramatically fitter, but because someone finally looked at what I was doing instead of just telling me to push harder. I passed my IPPT before ORD. The medal is not gold, but I earned it.',
    ],
    lessons: [
      'If you are stuck, ask someone to watch you run, not just time you.',
      'Slower first lap, stronger last lap. It felt wrong and it worked.',
      'Skipping the runs because "nothing works" made it a self-fulfilling prophecy.',
      'Compare against your own last attempt, not the fastest guy in the platoon.',
    ],
    hopeScore: 4,
    readMins: 2,
    illustrative: true,
  },
  {
    id: 'results-day-in-camp',
    title: 'Results Day, Checked From the Bunk',
    theme: 'Studies',
    preview:
      'My A-level results came out while I was in camp. Refreshing the page on a bunk bed was not how I imagined it.',
    body: [
      'I enlisted right after my A levels, so results came out while I was in camp. I had to check them on my phone during admin time, sitting on my bunk with people walking past. My grades were worse than I expected. Not disastrous, but not the course I had planned.',
      'I could not tell anyone properly. My family was messaging me and I did not want to reply. Everyone in the bunk was in a good mood and I did not want to be the one who brought it down. I just lay there and stared at the ceiling until lights out.',
      'Over the next week I went through the university options quietly on my phone at night. A bunkmate who had already been through results the year before told me his story. He had not got his first choice either, and was now genuinely happy about where he had landed.',
      'I applied for a different course than the one I had dreamed about. I got in. Two years is a long time to sit with a decision, and the strange thing is that NS gave me the space to be sure. The results were not the ending I wanted, but they were not the ending.',
    ],
    lessons: [
      'Tell at least one person in camp on the day. Staring at the ceiling alone is worse.',
      'Use the two years — you have more time to plan than you think.',
      'Talk to someone a year ahead of you. Their "disaster" usually turned out fine.',
      'Reply to your family even if it is just "not great, will call you this weekend".',
    ],
    hopeScore: 4,
    readMins: 3,
    illustrative: true,
  },
];
