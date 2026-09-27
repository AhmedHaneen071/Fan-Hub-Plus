// ---------------------------------------------------------------------------
// Fan Hub Plus — database seed
// Run with: `npm run db:seed`
//
// Creates the 8 fandom categories, one user per role, and a realistic set of
// demo content spread across every category so the app never looks empty
// during evaluation. The script is fully re-runnable: it wipes every demo
// table at the start and upserts users/categories by their unique fields.
// ---------------------------------------------------------------------------

import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Number of bcrypt rounds. Higher = slower but safer. 10 is the common default.
const BCRYPT_ROUNDS = 10;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function main() {
  // Wipe every demo table so the seed is fully re-runnable without
  // duplicating rows. Order matters (children before parents). Users and
  // categories are upserted below, so they are re-created, not wiped.
  await prisma.$transaction([
    prisma.rating.deleteMany(),
    prisma.bookmark.deleteMany(),
    prisma.fanSubmission.deleteMany(),
    prisma.feedback.deleteMany(),
    prisma.chatbotQuery.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.content.deleteMany(),
    prisma.characterProfile.deleteMany(),
    prisma.featuredArticle.deleteMany(),
    prisma.merchandiseItem.deleteMany(),
    prisma.event.deleteMany(),
    prisma.chatbotFAQ.deleteMany(),
  ]);

  // -------------------------------------------------------------------------
  // Categories — every fandom in the app enum.
  // -------------------------------------------------------------------------
  const categories = [
    {
      name: "ANIME",
      description: "Japanese animated series, films and culture",
      coverImage: "/seed/anime.svg",
      featured: true,
    },
    {
      name: "GAMING",
      description: "Video games, e-sports and gaming culture",
      coverImage: "/seed/gaming.svg",
      featured: true,
    },
    {
      name: "MOVIES",
      description: "Blockbusters, indies and everything in between",
      coverImage: "/seed/movies.svg",
      featured: true,
    },
    {
      name: "TV_SHOWS",
      description: "Television series, from sitcoms to prestige drama",
      coverImage: "/seed/tv.svg",
      featured: true,
    },
    {
      name: "KPOP",
      description: "K-pop music, idols, and fan culture",
      coverImage: "/seed/kpop.svg",
      featured: true,
    },
    {
      name: "COMICS",
      description: "Western comics and graphic novels",
      coverImage: "/seed/comics.svg",
      featured: false,
    },
    {
      name: "MANGA",
      description: "Japanese manga and light novels",
      coverImage: "/seed/manga.svg",
      featured: false,
    },
    {
      name: "COSPLAY",
      description: "Costume play, props and cosplay photography",
      coverImage: "/seed/cosplay.svg",
      featured: false,
    },
  ] as const;

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        description: category.description,
        cover_image: category.coverImage,
      },
      create: {
        name: category.name,
        description: category.description,
        cover_image: category.coverImage,
        featured: category.featured,
      },
    });
  }

  // Convenience map so we can reference category ids by name below.
  const categoryById: Record<string, string> = {};
  for (const category of await prisma.category.findMany()) {
    categoryById[category.name] = category.id;
  }

  // -------------------------------------------------------------------------
  // Users — one per role, as required. Passwords below are the demo logins.
  // -------------------------------------------------------------------------
  const adminPassword = await hashPassword("HubAdmin!26-Local");
  const userPassword = await hashPassword("HubFan!26-Local");
  const visitorPassword = await hashPassword("HubVisitor!26-Local");

  const admin = await prisma.user.upsert({
    where: { email: "admin@fanhub.dev" },
    update: { password_hash: adminPassword },
    create: {
      name: "Alex Admin",
      email: "admin@fanhub.dev",
      password_hash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const regular = await prisma.user.upsert({
    where: { email: "user@fanhub.dev" },
    update: { password_hash: userPassword },
    create: {
      name: "Mia Fan",
      email: "user@fanhub.dev",
      password_hash: userPassword,
      role: UserRole.USER,
    },
  });

  const visitor = await prisma.user.upsert({
    where: { email: "visitor@fanhub.dev" },
    update: { password_hash: visitorPassword },
    create: {
      name: "Guido Guest",
      email: "visitor@fanhub.dev",
      password_hash: visitorPassword,
      role: UserRole.VISITOR,
    },
  });

  // Give the registered demo user a sensible favorite-fandom list.
  await prisma.user.update({
    where: { id: regular.id },
    data: {
      favoriteCategories: {
        set: [
          { id: categoryById.ANIME },
          { id: categoryById.GAMING },
          { id: categoryById.KPOP },
        ],
      },
    },
  });

  console.log(`Seeded users: ${admin.email}, ${regular.email}, ${visitor.email}`);

  // -------------------------------------------------------------------------
  // Content — six items per category (48 total) so the explorer's filters
  // and pagination have real data to work with. The fields map 1:1 to the
  // Content model; `genre` keeps the drill-down filter useful.
  // -------------------------------------------------------------------------
  const sampleContent = [
    // Anime
    { title: "Neon Skyline Saga — Episode Guide", type: "ARTICLE", category: "ANIME", genre: "Action", description: "A full walkthrough of every arc, the studio secrets behind the animation, and the music that made the finale unforgettable.", popularity: 92, release: "2024-02-14T00:00:00.000Z", media: "/seed/anime.svg" },
    { title: "Studio Spotlight: Frame-by-Frame Interviews", type: "VIDEO", category: "ANIME", genre: "Action", description: "We sat down with the key artists and animators to break down how the famous rain scene was drawn.", popularity: 78, release: "2024-05-02T00:00:00.000Z", media: null },
    { title: "The Official Soundtrack Review", type: "AUDIO", category: "ANIME", genre: "Music", description: "A track-by-track listen of the fan-favourite soundtrack, with the composers' notes.", popularity: 55, release: "2023-11-20T00:00:00.000Z", media: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { title: "The Quiet Season: A Slice-of-Life Reading", type: "ARTICLE", category: "ANIME", genre: "Drama", description: "Why the most understated show of the year became a fan comfort watch, scene by scene.", popularity: 43, release: "2025-01-10T00:00:00.000Z", media: null },
    { title: "Winter Releases: 12 Anime to Watch", type: "VIDEO", category: "ANIME", genre: "Fantasy", description: "The winter line-up, ranked by buzz and quality so your watchlist is decided before January ends.", popularity: 60, release: "2024-11-30T00:00:00.000Z", media: null },
    { title: "Anime Artbook: Settings & Sketches", type: "IMAGE", category: "ANIME", genre: "Art", description: "Concept sketches and setting art from the season's most praised productions.", popularity: 50, release: "2023-06-15T00:00:00.000Z", media: null },
    // Gaming
    { title: "Stellar Drift — Strategy Tier List", type: "ARTICLE", category: "GAMING", genre: "Action", description: "Every character ranked for the current patch, with counters and recommended builds.", popularity: 88, release: "2024-03-10T00:00:00.000Z", media: "/seed/gaming.svg" },
    { title: "Release Recap: The Big Autumn Line-Up", type: "VIDEO", category: "GAMING", genre: "Action", description: "Hands-on impressions of the season's most anticipated titles.", popularity: 71, release: "2023-09-30T00:00:00.000Z", media: null },
    { title: "Speedrun Timeline: Parts 1–3", type: "VIDEO", category: "GAMING", genre: "Adventure", description: "The record-breaking runs that rewrote the leaderboards, annotated by the runners.", popularity: 47, release: "2024-07-20T00:00:00.000Z", media: null },
    { title: "Indie Spotlight: Cozy & Clever Picks", type: "ARTICLE", category: "GAMING", genre: "Adventure", description: "Ten indies the community loved this year, from farming sims to logic puzzlers.", popularity: 56, release: "2025-02-05T00:00:00.000Z", media: null },
    { title: "The Sound of the Grid: Racing OSTs", type: "AUDIO", category: "GAMING", genre: "Music", description: "An energetic mix of the driving tracks that make racing games sing.", popularity: 44, release: "2022-12-01T00:00:00.000Z", media: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { title: "E-sports Arena: Finals, Explained", type: "ARTICLE", category: "GAMING", genre: "Documentary", description: "How the grand final was won — the drafts, the calls, and the comeback.", popularity: 82, release: "2024-09-18T00:00:00.000Z", media: null },
    // Movies
    { title: "Cinema Comeback: Summer Blockbusters Ranked", type: "ARTICLE", category: "MOVIES", genre: "Action", description: "Every summer release ranked by box office hype and fan reaction.", popularity: 84, release: "2024-06-01T00:00:00.000Z", media: "/seed/movies.svg" },
    { title: "Behind the Scenes: Practical FX Revival", type: "IMAGE", category: "MOVIES", genre: "Art", description: "A gallery of behind-the-scenes shots showing practical effects on the new set.", popularity: 63, release: "2024-01-15T00:00:00.000Z", media: null },
    { title: "Director's Cut: The Editing Room Floor", type: "VIDEO", category: "MOVIES", genre: "Drama", description: "What changed between the festival cut and the theatrical release, film by film.", popularity: 58, release: "2023-12-05T00:00:00.000Z", media: null },
    { title: "Midnight Horror Picks for Marathon Nights", type: "ARTICLE", category: "MOVIES", genre: "Horror", description: "The scariest films of the decade, ranked for consecutive-night viewing.", popularity: 67, release: "2024-10-18T00:00:00.000Z", media: null },
    { title: "Animation for Adults: What's Next?", type: "ARTICLE", category: "MOVIES", genre: "Fantasy", description: "Grown-up animation is having a moment. Where does it go from here?", popularity: 49, release: "2025-03-01T00:00:00.000Z", media: null },
    { title: "Score Sessions: Composers in the Studio", type: "AUDIO", category: "MOVIES", genre: "Music", description: "Themes and sketches from the year's biggest film scores, with composer commentary.", popularity: 52, release: "2022-06-20T00:00:00.000Z", media: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    // TV shows
    { title: "The Reunion: Season Finale Explained", type: "ARTICLE", category: "TV_SHOWS", genre: "Mystery", description: "We break down every twist in the season finale and what it means for next year.", popularity: 90, release: "2024-04-22T00:00:00.000Z", media: "/seed/tv.svg" },
    { title: "How the Writers' Room Really Works", type: "VIDEO", category: "TV_SHOWS", genre: "Documentary", description: "An exclusive look at a TV writers' room from outline to final draft.", popularity: 47, release: "2024-02-01T00:00:00.000Z", media: null },
    { title: "Then & Now: The Sitcom Revival", type: "ARTICLE", category: "TV_SHOWS", genre: "Comedy", description: "Why audiences fell back in love with multi-cam sitcoms.", popularity: 62, release: "2023-08-15T00:00:00.000Z", media: null },
    { title: "Character Study: Sable Winters", type: "IMAGE", category: "TV_SHOWS", genre: "Drama", description: "Costume and set stills from the detective's best scenes across the season.", popularity: 70, release: "2024-03-25T00:00:00.000Z", media: null },
    { title: "Binge Guide: One-Season Gems", type: "ARTICLE", category: "TV_SHOWS", genre: "Drama", description: "Limited series that tell a complete story in one perfect season.", popularity: 55, release: "2025-01-22T00:00:00.000Z", media: null },
    { title: "The Docuseries That Defined the Year", type: "VIDEO", category: "TV_SHOWS", genre: "Documentary", description: "From true crime to deep space — the docs everyone talked about.", popularity: 61, release: "2023-10-12T00:00:00.000Z", media: null },
    // K-pop
    { title: "Comeback Coverage: The New Mini-Album", type: "ARTICLE", category: "KPOP", genre: "Pop", description: "First listen, track-by-track highlights and the fan chant guide.", popularity: 95, release: "2024-05-14T00:00:00.000Z", media: "/seed/kpop.svg" },
    { title: "Stage Outfits Gallery — World Tour", type: "IMAGE", category: "KPOP", genre: "Art", description: "Every outfit from the three-night Seoul finale, catalogued by member.", popularity: 69, release: "2024-03-08T00:00:00.000Z", media: null },
    { title: "The Album, Track-by-Track", type: "AUDIO", category: "KPOP", genre: "Pop", description: "A producer's listen-through of the comeback mini-album, sound by sound.", popularity: 88, release: "2024-05-15T00:00:00.000Z", media: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { title: "Debut Watch: Rookies of the Season", type: "ARTICLE", category: "KPOP", genre: "Pop", description: "The newcomers to know, with debut stage highlights and fan reactions.", popularity: 57, release: "2024-08-09T00:00:00.000Z", media: null },
    { title: "Fan Choreography Breakdown", type: "VIDEO", category: "KPOP", genre: "Dance", description: "Line-by-line notes on the point choreography from this tour's biggest hit.", popularity: 73, release: "2023-07-21T00:00:00.000Z", media: null },
    { title: "The Concert Streaming Era", type: "VIDEO", category: "KPOP", genre: "Documentary", description: "How live-streamed concerts turned global fanbases into nightly audiences.", popularity: 50, release: "2025-01-05T00:00:00.000Z", media: null },
    // Comics
    { title: "Comics You Missed This Year", type: "ARTICLE", category: "COMICS", genre: "Adventure", description: "Indie titles the community loved but mainstream lists skipped.", popularity: 61, release: "2024-07-01T00:00:00.000Z", media: "/seed/comics.svg" },
    { title: "The Big Crossover, Explained", type: "ARTICLE", category: "COMICS", genre: "Action", description: "Every tie-in, retcon and reveal of the year's biggest crossover, in order.", popularity: 79, release: "2024-02-28T00:00:00.000Z", media: null },
    { title: "Artist Spotlight: Ink & Velocity", type: "IMAGE", category: "COMICS", genre: "Art", description: "A folio of the artists redefining panel composition this year.", popularity: 54, release: "2023-05-12T00:00:00.000Z", media: null },
    { title: "Re-reading the Classics: The 90s", type: "ARTICLE", category: "COMICS", genre: "Comedy", description: "The good, the bad and the pouch-heavy favourites of the 90s, revisited.", popularity: 46, release: "2025-01-30T00:00:00.000Z", media: null },
    { title: "From Page to Screen: Adaptations We Want", type: "ARTICLE", category: "COMICS", genre: "Fantasy", description: "The graphic novels that deserve a faithful adaptation — and who should direct.", popularity: 65, release: "2024-11-11T00:00:00.000Z", media: null },
    { title: "Graphic Novel of the Month: Recent Reads", type: "IMAGE", category: "COMICS", genre: "Drama", description: "Panels from the month's most talked-about graphic novels.", popularity: 41, release: "2023-09-08T00:00:00.000Z", media: null },
    // Manga
    { title: "Manga Marketplace: Volume Cover Showcase", type: "IMAGE", category: "MANGA", genre: "Art", description: "The most striking covers of the season and the artists behind them.", popularity: 58, release: "2024-04-10T00:00:00.000Z", media: "/seed/manga.svg" },
    { title: "The Fight That Changed Shonen Forever", type: "ARTICLE", category: "MANGA", genre: "Action", description: "One fight scene that rewired how battle manga stage their climaxes.", popularity: 83, release: "2024-01-27T00:00:00.000Z", media: null },
    { title: "Light Novels: Beyond the Mainstream", type: "ARTICLE", category: "MANGA", genre: "Fantasy", description: "Light novel series that deserve the same shelf space as your manga.", popularity: 53, release: "2023-11-02T00:00:00.000Z", media: null },
    { title: "Weekly Serialization: What It Takes", type: "VIDEO", category: "MANGA", genre: "Documentary", description: "The brutal weekly schedule behind a serialized manga, break down by round.", popularity: 48, release: "2024-06-04T00:00:00.000Z", media: null },
    { title: "Cursed Covers: Series That Swapped Artists", type: "IMAGE", category: "MANGA", genre: "Art", description: "The before-and-after covers when a series changed hands mid-run.", popularity: 45, release: "2024-08-22T00:00:00.000Z", media: null },
    { title: "Romance Manga for New Readers", type: "ARTICLE", category: "MANGA", genre: "Romance", description: "Eleven romance manga that make perfect entry points for newcomers.", popularity: 64, release: "2025-02-14T00:00:00.000Z", media: null },
    // Cosplay
    { title: "Cosplay Tutorial: Armour That Breathes", type: "ARTICLE", category: "COSPLAY", genre: "Tutorial", description: "A beginner-to-expert guide on building breathable, con-safe armour.", popularity: 66, release: "2024-06-20T00:00:00.000Z", media: "/seed/cosplay.svg" },
    { title: "Convention Highlights Reel", type: "VIDEO", category: "COSPLAY", genre: "Community", description: "The best cosplay moments from this year's big convention.", popularity: 72, release: "2024-08-05T00:00:00.000Z", media: null },
    { title: "The Toolbox: Foam, Worbla & LEDs", type: "IMAGE", category: "COSPLAY", genre: "Tutorial", description: "A photo guide to the materials behind a modern cosplay build.", popularity: 59, release: "2023-10-19T00:00:00.000Z", media: null },
    { title: "Cosplay Photography: Backdrops on a Budget", type: "ARTICLE", category: "COSPLAY", genre: "Photography", description: "Get studio-quality backgrounds with a roll of paper and clever lighting.", popularity: 54, release: "2025-03-12T00:00:00.000Z", media: null },
    { title: "Meet the Community: Local Cosplay Clubs", type: "VIDEO", category: "COSPLAY", genre: "Community", description: "How local clubs turn solo crafters into teams ahead of Convention season.", popularity: 49, release: "2024-09-27T00:00:00.000Z", media: null },
    { title: "Prop of the Month Showcase", type: "IMAGE", category: "COSPLAY", genre: "Tutorial", description: "This month's best community prop build, with process shots and fails.", popularity: 62, release: "2024-05-30T00:00:00.000Z", media: null },
  ] as const;

  // Sample YouTube clips cycled into trailer offers (Phase 4). Kept to
  // free/open footage so the embedded player always has something to show.
  const TRAILER_POOL = [
    "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    "https://youtu.be/eRsGyueVLvQ",
    "https://www.youtube.com/watch?v=R6MlUcmOul8",
    "https://youtu.be/WhWc3b3KhnY",
    "https://www.youtube.com/watch?v=SkVqJ1SGeL0",
    "https://youtu.be/jNQXAC9IVRw",
  ] as const;

  for (const [index, item] of sampleContent.entries()) {
    // Phase 4 multimedia player: most items offer an embeddable YouTube clip
    // (the pool is sample footage so the demo always plays); a couple are left
    // without one to show the static-thumbnail fallback.
    const hasTrailer = index % 5 !== 4;
    await prisma.content.create({
      data: {
        title: item.title,
        description: item.description,
        type: item.type,
        genre: item.genre,
        category_id: categoryById[item.category],
        popularity_score: item.popularity,
        release_date: new Date(item.release),
        media_url: item.media,
        trailer_url: hasTrailer
          ? TRAILER_POOL[index % TRAILER_POOL.length]
          : null,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Characters, articles, merchandise and events
  // -------------------------------------------------------------------------
  await prisma.characterProfile.createMany({
    data: [
      { name: "Kira Valmont", category_id: categoryById.ANIME, bio: "The cool-headed pilot of Star Squadron 9, known for her signature scarf and calm under pressure.", image_url: "/seed/anime.svg" },
      { name: "Dash Thorne", category_id: categoryById.GAMING, bio: "One of the most aggressive battle-vlogger characters in Starship Arena, loved for his trash talk.", image_url: "/seed/gaming.svg" },
      { name: "Maverick Drake", category_id: categoryById.MOVIES, bio: "The reluctant hero of the Neon City trilogy, played across three movies.", image_url: "/seed/movies.svg" },
      { name: "Sable Winters", category_id: categoryById.TV_SHOWS, bio: "The morally grey detective from 'Night Shift', a fan favourite anti-hero.", image_url: "/seed/tv.svg" },
      { name: "Haneul", category_id: categoryById.KPOP, bio: "Main vocalist of the global group Aether, beloved for her live improv moments.", image_url: "/seed/kpop.svg" },
      { name: "Captain Sterling", category_id: categoryById.COMICS, bio: "The classic comic book hero who pioneered the 'ultimate power' storyline in the 90s.", image_url: "/seed/comics.svg" },
      { name: "Renji Kurogami", category_id: categoryById.MANGA, bio: "The underdog swordsman of 'Blade of the Crescent', whose training arcs inspire fan art weekly.", image_url: "/seed/manga.svg" },
      { name: "Nyx — Professional Cosplayer", category_id: categoryById.COSPLAY, bio: "Known for intricate DIY props and the community's favourite armour tutorials.", image_url: "/seed/cosplay.svg" },
    ],
  });

  await prisma.featuredArticle.createMany({
    data: [
      {
        title: "10 Years of the Anime Boom",
        category_id: categoryById.ANIME,
        rich_text_body: "<p>Streaming opened the floodgates. In this retrospective we trace the shows that made anime a global default, not a niche.</p>",
        cover_image: "/seed/anime.svg",
        event_timeline: JSON.stringify([
          { date: "2015", label: "The Breakout", body: "First anime cracks the global top-10 streaming charts." },
          { date: "2019", label: "The Movie Event", body: "The genre-crossing film breaks regional box office records." },
          { date: "2024", label: "Mainstream Forever", body: "Anime now outperforms live-action in key markets." },
        ]),
      },
      {
        title: "The Esports Explosion",
        category_id: categoryById.GAMING,
        rich_text_body: "<p>From LAN parties to packed arenas — how competitive gaming became a spectator sport with real careers.</p>",
        cover_image: "/seed/gaming.svg",
        event_timeline: JSON.stringify([
          { date: "2018", label: "First Arena", body: "Purpose-built esports arenas open in major cities." },
          { date: "2022", label: "Record Viewership", body: "Peak concurrent viewers crest a new record." },
          { date: "2026", label: "University Leagues", body: "Collegiate leagues make esports a scholarship path." },
        ]),
      },
      {
        title: "K-pop's Global Takeover",
        category_id: categoryById.KPOP,
        rich_text_body: "<p>How three-minute singles and devoted fan communities turned K-pop into a worldwide phenomenon.</p>",
        cover_image: "/seed/kpop.svg",
        event_timeline: JSON.stringify([
          { date: "2017", label: "First World Tour", body: "A debut world tour sells out in hours." },
          { date: "2021", label: "Billboard History", body: "First all-Korean album tops the global chart." },
          { date: "2026", label: "Fan Platforms", body: "Dedicated fan communities like Fan Hub Plus go mainstream." },
        ]),
      },
    ],
  });

  await prisma.merchandiseItem.createMany({
    data: [
      { name: "Star Squadron 9 — Sequin Jacket Replica", category_id: categoryById.ANIME, image_url: "/seed/anime.svg", tag: "COLLECTIBLE", is_upcoming: false, price: 129.99, view_count: 1204 },
      { name: "Stellar Drift Collector's Edition Box", category_id: categoryById.GAMING, image_url: "/seed/gaming.svg", tag: "LIMITED_EDITION", is_upcoming: true, price: 249.99, view_count: 3410 },
      { name: "Neon City Trilogy — 4K Steelbook", category_id: categoryById.MOVIES, image_url: "/seed/movies.svg", tag: "PRE_ORDER", is_upcoming: true, price: 89.99, view_count: 2105 },
      { name: "Night Shift — Detective's Coat Replica", category_id: categoryById.TV_SHOWS, image_url: "/seed/tv.svg", tag: "COLLECTIBLE", is_upcoming: false, price: 199.0, view_count: 880 },
      { name: "Aether — Lightstick v2", category_id: categoryById.KPOP, image_url: "/seed/kpop.svg", tag: "PRE_ORDER", is_upcoming: true, price: 59.99, view_count: 5320 },
      { name: "Captain Sterling Omnibus Vol. 1", category_id: categoryById.COMICS, image_url: "/seed/comics.svg", tag: "COLLECTIBLE", is_upcoming: false, price: 34.99, view_count: 640 },
      { name: "Blade of the Crescent — Signed Volume", category_id: categoryById.MANGA, image_url: "/seed/manga.svg", tag: "LIMITED_EDITION", is_upcoming: false, price: 74.99, view_count: 1510 },
      { name: "Nyx Pro-Worx — Foam Smithing Kit", category_id: categoryById.COSPLAY, image_url: "/seed/cosplay.svg", tag: "COLLECTIBLE", is_upcoming: false, price: 44.99, view_count: 980 },
    ],
  });

  await prisma.event.createMany({
    data: [
      { name: "Anime Expo Fan Meet", city: "Tokyo", date: new Date("2026-11-12T09:00:00.000Z"), ticket_link: "https://example.com/tickets/anime-expo", latitude: 35.6762, longitude: 139.6503, category_id: categoryById.ANIME },
      { name: "Pixels & Pointers — Gaming Fest", city: "Seoul", date: new Date("2026-12-03T10:00:00.000Z"), ticket_link: "https://example.com/tickets/pp-gaming", latitude: 37.5665, longitude: 126.978, category_id: categoryById.GAMING },
      { name: "Neon City Screening Marathon", city: "New York", date: new Date("2027-01-16T18:00:00.000Z"), ticket_link: "https://example.com/tickets/neon-marathon", latitude: 40.7128, longitude: -74.006, category_id: categoryById.MOVIES },
      { name: "K-pop Fan Stage — Encore", city: "Singapore", date: new Date("2027-02-08T12:00:00.000Z"), ticket_link: "https://example.com/tickets/kfan-encore", latitude: 1.3521, longitude: 103.8198, category_id: categoryById.KPOP },
      { name: "Comic Guild Meetup", city: "London", date: new Date("2027-03-06T10:00:00.000Z"), ticket_link: "https://example.com/tickets/comic-guild", latitude: 51.5074, longitude: -0.1278, category_id: categoryById.COMICS },
    ],
  });

  // -------------------------------------------------------------------------
  // Chatbot knowledge base — feeds the explainable FAQ bot in Phase 7.
  // -------------------------------------------------------------------------
  await prisma.chatbotFAQ.createMany({
    data: [
      { question: "How do I create an account?", answer: "Click 'Sign up' in the top navigation, enter your name, email and a password, then you're in. Your account unlocks bookmarks, ratings and the dashboard.", keywords: "account, signup, register, create, sign up" },
      { question: "How do I reset my password?", answer: "Use 'Forgot password' on the login screen. We email you a single-use reset link that expires in 30 minutes.", keywords: "password, reset, forgot" },
      { question: "What can a registered user do?", answer: "Registered users can bookmark content, rate media, submit fan content for review, send feedback, and manage their profile.", keywords: "user, benefits, registered, features" },
      { question: "How does fan content get approved?", answer: "Fan submissions go to a pending queue. An admin reviews each submission before it is published, to keep the catalogue clean.", keywords: "submission, approve, pending, fan content" },
      { question: "Where are events listed?", answer: "The Events calendar lists fandom events by city and date. If you choose Use my location and grant browser permission, the map can show your position and sort events by approximate distance.", keywords: "event, calendar, map, ticket" },
      { question: "What fandom categories exist?", answer: "Anime, Gaming, Movies, TV Shows, K-pop, Comics, Manga and Cosplay.", keywords: "category, categories, fandoms" },
      { question: "How does bookmarking work?", answer: "Open any content, character profile or merchandise item and press the bookmark icon. You can add a private note to each bookmark.", keywords: "bookmark, save, note" },
      { question: "How do I rate content?", answer: "On any content detail page use the star scale (1–5) or the thumbs up/down control. You can change your rating at any time.", keywords: "rate, rating, stars, thumbs" },
      { question: "Who runs Fan Hub Plus?", answer: "Fan Hub Plus is a student-built showcase project. An admin account manages content moderation, the FAQ knowledge base and usage statistics.", keywords: "admin, who, team, project" },
      { question: "Do you sell the merchandise shown?", answer: "No. The merchandise showcase is display-only for this project — there is no checkout or payment flow.", keywords: "buy, purchase, merch, checkout, payment" },
    ],
  });

  // -------------------------------------------------------------------------
  // Engagement demo data — bookmarks, a rating and a pending submission so
  // the dashboard and admin panel have something to show straight away.
  // -------------------------------------------------------------------------
  const aContent = await prisma.content.findFirst({ where: { category_id: categoryById.KPOP } });
  const anArticle = await prisma.content.findFirst({ where: { category_id: categoryById.ANIME } });

  if (aContent && anArticle) {
    await prisma.rating.upsert({
      where: { user_id_content_id: { user_id: regular.id, content_id: aContent.id } },
      update: {},
      create: { user_id: regular.id, content_id: aContent.id, value: 5, ratingType: "STARS" },
    });
    await prisma.bookmark.create({
      data: { user_id: regular.id, content_id: anArticle.id, note: "Great reading list for the finale — definitely bookmarking this." },
    });
  }

  await prisma.fanSubmission.create({
    data: {
      user_id: regular.id,
      category_id: categoryById.COSPLAY,
      title: "Midweek Cosplay Spotlight: DIY Props",
      body: "A suggested article about building lightweight props using foam and LED strips, with a picture guide.",
    },
  });

  console.log("Seed complete!");
  console.log("Demo logins:");
  console.log("  admin   -> admin@fanhub.dev / HubAdmin!26-Local");
  console.log("  user    -> user@fanhub.dev / HubFan!26-Local");
  console.log("  visitor -> visitor@fanhub.dev / HubVisitor!26-Local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
