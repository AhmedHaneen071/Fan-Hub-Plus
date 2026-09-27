import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../server/db.js';
import { Article, Bookmark, Category, Character, ChatQuery, Content, Event, FAQ, Feedback, Merch, Rating, Submission, User } from '../server/models.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fanhubplus';
const parsedUri = new URL(uri);
const databaseName = decodeURIComponent(parsedUri.pathname.replace(/^\//, ''));
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

if (process.env.NODE_ENV === 'production' || !localHosts.has(parsedUri.hostname) || databaseName !== 'fanhubplus') {
  throw new Error('Demo seeding is restricted to the local fanhubplus database outside production.');
}

const counts = {};
async function insertIfMissing(Model, identity, document) {
  const result = await Model.updateOne(identity, { $setOnInsert: document }, { upsert: true });
  if (result.upsertedCount) counts[Model.collection.collectionName] = (counts[Model.collection.collectionName] || 0) + 1;
  return Model.findOne(identity);
}

try {
  await connectDatabase();

  const descriptions = {
    ANIME: 'Stories that stay with you, frame by frame.',
    GAMING: 'Worlds to explore, quests to share.',
    MOVIES: 'The films we return to and talk about.',
    TV_SHOWS: 'Characters and chapters worth following.',
    KPOP: 'Music, performances and fan culture.',
    COMICS: 'Panels, heroes and imagined worlds.',
    MANGA: 'Illustrated stories from every shelf.',
    COSPLAY: 'A craft made for stepping into another world.',
  };
  const categories = {};
  for (const [name, description] of Object.entries(descriptions)) {
    categories[name] = await insertIfMissing(Category, { name }, { name, description, featured: name === 'ANIME' || name === 'GAMING' });
  }

  const demoPassword = 'FanHubDemo2026!';
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const admin = await insertIfMissing(User, { email: 'admin@fanhubplus.test' }, {
    name: 'Demo Administrator', email: 'admin@fanhubplus.test', passwordHash, role: 'ADMIN',
    favoriteCategories: [categories.ANIME._id, categories.GAMING._id], lastSeen: new Date(),
  });
  const fan = await insertIfMissing(User, { email: 'fan@fanhubplus.test' }, {
    name: 'Demo Fan', email: 'fan@fanhubplus.test', passwordHash, role: 'USER',
    favoriteCategories: [categories.ANIME._id, categories.MANGA._id], lastSeen: new Date(),
  });

  const contentRows = [
    { category: 'ANIME', title: 'The Lantern Keeper', type: 'ARTICLE', genre: 'Fantasy', releaseDate: '2025-03-14', popularityScore: 88, editorialScore: 38, description: 'A quiet apprentice discovers that every lantern in the harbor keeps a memory alive.', tags: 'fantasy, friendship, demo' },
    { category: 'ANIME', title: 'Beyond the Paper Moon', type: 'VIDEO', genre: 'Adventure', releaseDate: '2024-11-02', popularityScore: 82, editorialScore: 32, description: 'A gentle preview of a hand-drawn adventure across a floating city.', tags: 'adventure, animation, demo', trailerUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    { category: 'GAMING', title: 'Mosslight Valley', type: 'IMAGE', genre: 'Cozy adventure', releaseDate: '2025-06-10', popularityScore: 92, editorialScore: 42, description: 'Restore an overgrown valley, meet its residents and make a place of your own.', tags: 'cozy, exploration, demo' },
    { category: 'MOVIES', title: 'A Map of Small Stars', type: 'ARTICLE', genre: 'Science fiction', releaseDate: '2024-08-23', popularityScore: 76, editorialScore: 31, description: 'An intimate road movie about two siblings mapping the night sky from their rooftop.', tags: 'film, family, demo' },
    { category: 'TV_SHOWS', title: 'The Last Tea House', type: 'VIDEO', genre: 'Drama', releaseDate: '2025-01-19', popularityScore: 79, editorialScore: 30, description: 'A neighborhood tea house becomes the meeting place for stories across generations.', tags: 'series, drama, demo', trailerUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    { category: 'KPOP', title: 'After the Encore', type: 'AUDIO', genre: 'Pop', releaseDate: '2025-04-04', popularityScore: 85, editorialScore: 35, description: 'A sample track for the walk home after a night of music and lights.', tags: 'music, performance, demo', mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { category: 'COMICS', title: 'Northbound, Issue One', type: 'ARTICLE', genre: 'Graphic novel', releaseDate: '2024-10-11', popularityScore: 72, editorialScore: 28, description: 'A cartographer follows a forgotten railway through the mountains.', tags: 'comics, journey, demo' },
    { category: 'MANGA', title: 'Letters from Hoshino Station', type: 'IMAGE', genre: 'Slice of life', releaseDate: '2025-02-07', popularityScore: 81, editorialScore: 34, description: 'A small station collects letters from travelers who never met.', tags: 'manga, slice of life, demo' },
    { category: 'COSPLAY', title: 'Making a Moonlit Mantle', type: 'VIDEO', genre: 'Craft', releaseDate: '2025-05-16', popularityScore: 68, editorialScore: 25, description: 'A practical guide to planning a costume, choosing fabric and finishing details.', tags: 'cosplay, craft, demo', trailerUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
    { category: 'GAMING', title: 'The Glass Orchard', type: 'AUDIO', genre: 'Soundtrack', releaseDate: '2025-07-30', popularityScore: 74, editorialScore: 28, description: 'A sample instrumental for a calm evening in a storybook world.', tags: 'soundtrack, demo', mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  ];
  const content = [];
  for (const row of contentRows) {
    const category = categories[row.category];
    const identity = { category: category._id, title: row.title };
    content.push(await insertIfMissing(Content, identity, { ...row, category: category._id, releaseDate: new Date(row.releaseDate), isUpcoming: false }));
  }

  const upcoming = await insertIfMissing(Content, { title: 'Mosslight Valley: The Greenhouse Chapter' }, {
    category: categories.GAMING._id, title: 'Mosslight Valley: The Greenhouse Chapter', type: 'VIDEO', genre: 'Cozy adventure',
    description: 'A new chapter opens in the valley greenhouse.', releaseDate: new Date('2027-03-12'), popularityScore: 64,
    editorialScore: 24, isUpcoming: true, tags: 'upcoming, gaming, demo', trailerUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  });

  const characters = [
    ['ANIME', 'Aiko Mori', 'A patient lantern maker who remembers every visitor to the harbor.'],
    ['GAMING', 'Juniper Vale', 'A resourceful gardener rebuilding a valley one small patch at a time.'],
    ['MOVIES', 'Mara Sol', 'A curious stargazer with a notebook full of half-finished maps.'],
    ['TV_SHOWS', 'Naveen Shah', 'The observant keeper of a family tea house and its many stories.'],
    ['KPOP', 'Hana Lee', 'A fictional songwriter learning to trust the quiet parts of a song.'],
    ['COMICS', 'Ellis North', 'A careful cartographer who always leaves room for the unknown.'],
    ['MANGA', 'Rin Hoshino', 'A station attendant who keeps a box for unclaimed letters.'],
    ['COSPLAY', 'Theo Stitch', 'A costume maker who believes every good build starts with a sketch.'],
  ];
  for (const [categoryName, name, bio] of characters) {
    const category = categories[categoryName];
    await insertIfMissing(Character, { category: category._id, name }, { category: category._id, name, bio });
  }

  const articles = [
    { category: 'ANIME', title: 'Why quiet stories find a place in us', richTextBody: '<p>Some stories make room for a pause. <strong>The Lantern Keeper</strong> is a demo feature about patience, memory and the small rituals that bring people together.</p><p>Its harbor changes a little with every visitor, reminding us that worlds can feel expansive without being loud.</p>', eventTimeline: [{ date: 'Spring', label: 'A light appears', body: 'The apprentice finds an unlit lantern below the old pier.' }, { date: 'Summer', label: 'The harbor gathers', body: 'Neighbors bring their memories and help restore the workshop.' }] },
    { category: 'GAMING', title: 'Building a gentler kind of game night', richTextBody: '<p>Demo story: the best co-op sessions leave space for everyone to explore at their own pace.</p><p>In <em>Mosslight Valley</em>, each small task gives the group a reason to share the work.</p>', eventTimeline: [{ date: 'Day one', label: 'A new patch', body: 'The group clears a path to the old greenhouse.' }, { date: 'Day three', label: 'First harvest', body: 'The first seeds bring new neighbors to the valley.' }] },
    { category: 'KPOP', title: 'The feeling after the encore', richTextBody: '<p>Demo feature: the concert ends, the lights return, and the chorus carries on in the crowd outside.</p><p><strong>After the Encore</strong> is a sample listing for exploring the hub audio player.</p>', eventTimeline: [] },
  ];
  for (const row of articles) {
    const category = categories[row.category];
    await insertIfMissing(Article, { category: category._id, title: row.title }, { ...row, category: category._id });
  }

  const merchRows = [
    ['ANIME', 'Harbor Lantern Enamel Pin', 'COLLECTIBLE', false, 12],
    ['GAMING', 'Mosslight Valley Field Journal', 'LIMITED_EDITION', false, 18],
    ['MANGA', 'Hoshino Station Letter Set', 'COLLECTIBLE', false, 9],
    ['COSPLAY', 'Moonlit Mantle Pattern Book', 'PRE_ORDER', true, 24],
  ];
  for (const [categoryName, name, tag, isUpcoming, price] of merchRows) {
    const category = categories[categoryName];
    await insertIfMissing(Merch, { category: category._id, name }, { category: category._id, name, tag, isUpcoming, price, tags: 'demo, showcase' });
  }

  const events = [
    { name: 'Fandom Spring Social', city: 'Karachi', days: 35, latitude: 24.8607, longitude: 67.0011, category: 'ANIME' },
    { name: 'Indie Games & Illustration Day', city: 'Lahore', days: 62, latitude: 31.5204, longitude: 74.3587, category: 'GAMING' },
    { name: 'Stories on the Big Screen', city: 'Islamabad', days: 91, latitude: 33.6844, longitude: 73.0479, category: 'MOVIES' },
  ];
  for (const row of events) {
    const { days, category: categoryName, ...event } = row;
    await insertIfMissing(Event, { name: event.name, city: event.city }, {
      ...event, category: categories[categoryName]._id, date: new Date(Date.now() + days * 86400000),
      ticketLink: 'https://example.com/fan-hub-demo-event',
    });
  }

  const faqs = [
    ['How do I save something?', 'Sign in, open a story or discovery, then choose Save to my list.', 'save bookmark collection'],
    ['How do I submit a story?', 'Sign in and use Share a story. Your submission appears in the admin review queue.', 'submit story writing'],
    ['Can I buy the items shown here?', 'No. The merchandise shelf is for discovery only and does not process purchases.', 'merchandise buy payment shop'],
    ['How do event locations work?', 'Allow location access on the Events page to see distances. You can also browse by city without sharing your location.', 'events location city map'],
  ];
  for (const [question, answer, keywords] of faqs) await insertIfMissing(FAQ, { question }, { question, answer, keywords });

  await insertIfMissing(Bookmark, { user: fan._id, targetType: 'content', target: content[0]._id }, {
    user: fan._id, targetType: 'content', target: content[0]._id, note: 'Demo bookmark: revisit this story.',
  });
  await insertIfMissing(Rating, { user: fan._id, content: content[0]._id }, { user: fan._id, content: content[0]._id, value: 5, ratingType: 'STARS' });
  await Content.updateOne({ _id: content[0]._id, ratingLedger: { $eq: {} } }, {
    $set: { ratingScore: 5, popularityScore: 88, ratingLedger: { [String(fan._id)]: { score: 5, value: 5, ratingType: 'STARS' } } },
  });
  await insertIfMissing(Feedback, { user: fan._id, message: 'Demo feedback: the fandom browse page is easy to explore.' }, {
    user: fan._id, type: 'SUGGESTION', message: 'Demo feedback: the fandom browse page is easy to explore.', status: 'OPEN',
  });
  await insertIfMissing(Submission, { user: fan._id, title: 'A demo fan story for review' }, {
    user: fan._id, category: categories.MANGA._id, title: 'A demo fan story for review',
    body: 'This sample submission demonstrates the review workflow. An administrator can approve it to publish the story into the public catalogue.',
    type: 'FEATURED_ARTICLE', status: 'PENDING',
  });
  await insertIfMissing(ChatQuery, { message: 'Where can I find upcoming events?' }, {
    user: fan._id, category: categories.ANIME._id, message: 'Where can I find upcoming events?',
    response: 'Visit Events to browse gatherings by city and date.',
  });

  await User.updateMany({ email: { $in: ['admin@fanhubplus.test', 'fan@fanhubplus.test'] } }, { $set: { lastSeen: new Date() } });
  const totals = {};
  for (const [key, Model] of Object.entries({ users: User, categories: Category, content: Content, characters: Character, articles: Article, merchandise: Merch, events: Event, bookmarks: Bookmark, ratings: Rating, feedback: Feedback, submissions: Submission, faqs: FAQ, chatbotQueries: ChatQuery })) totals[key] = await Model.countDocuments();
  console.log(JSON.stringify({ database: mongoose.connection.name, insertedThisRun: counts, collectionTotals: totals }));
  console.log('Development/Test Only accounts: admin@fanhubplus.test and fan@fanhubplus.test — password: FanHubDemo2026!');
} finally {
  await mongoose.disconnect();
}
