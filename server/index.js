import "dotenv/config";
import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { connectDatabase, disconnectDatabase, id } from "./db.js";
import {
  getCurrentUser,
  issueSession,
  requireAdmin,
  requireMember,
  requireUser,
  sessionCookie,
} from "./auth.js";
import {
  User,
  Category,
  Content,
  Character,
  Article,
  Merch,
  Event,
  Bookmark,
  Rating,
  Feedback,
  Submission,
  FAQ,
  ChatQuery,
} from "./models.js";

const app = express();
const dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);
const categories = [
  "ANIME",
  "GAMING",
  "MOVIES",
  "TV_SHOWS",
  "KPOP",
  "COMICS",
  "MANGA",
  "COSPLAY",
];
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "3mb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error:
      "Too many accounts were created from this connection. Try again later.",
  },
});
const chatLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Please pause a moment before asking again." },
});
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "fanhub-plus-login-timing-equalizer",
  12,
);
const validate = (schema, data) => schema.safeParse(data);
const safe = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const handleList = (Model, populate = "category") =>
  Model.find().sort({ createdAt: -1 }).populate(populate).lean();

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, database: "mongodb", status: "ready" }),
);

// Authentication -----------------------------------------------------------
const credentials = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(128),
});
app.post(
  "/api/auth/register",
  registerLimiter,
  safe(async (req, res) => {
    const parsed = validate(
      credentials.extend({ name: z.string().trim().min(2).max(80) }),
      req.body,
    );
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Check your name, email, and password." });
    const { name, email, password } = parsed.data;
    const user = await User.findOne({ email });
    if (user)
      return res
        .status(409)
        .json({ error: "Unable to create an account with those details." });
    let created;
    try {
      created = await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "USER",
      });
    } catch (error) {
      if (error?.code === 11000)
        return res
          .status(409)
          .json({ error: "Unable to create an account with those details." });
      throw error;
    }
    res
      .cookie("fanhub_session", issueSession(created), sessionCookie)
      .status(201)
      .json({ user: publicUser(created) });
  }),
);
app.post(
  "/api/auth/login",
  authLimiter,
  safe(async (req, res) => {
    const parsed = validate(credentials, req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Enter a valid email and password." });
    const { email, password } = parsed.data;
    const user = await User.findOne({ email }).select("+passwordHash");
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash || DUMMY_PASSWORD_HASH,
    );
    if (
      !passwordMatches ||
      !user ||
      (user.suspendedUntil && user.suspendedUntil > new Date())
    )
      return res.status(401).json({ error: "Email or password is incorrect." });
    user.lastSeen = new Date();
    await user.save();
    res
      .cookie("fanhub_session", issueSession(user), sessionCookie)
      .json({ user: publicUser(user) });
  }),
);
app.post("/api/auth/logout", (_req, res) =>
  res
    .clearCookie("fanhub_session", { ...sessionCookie, maxAge: undefined })
    .json({ ok: true }),
);
app.get(
  "/api/auth/me",
  requireUser,
  safe(async (req, res) => res.json({ user: publicUser(req.user) })),
);
function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || "",
    favoriteCategories: user.favoriteCategories || [],
  };
}

// Discovery and public pages ------------------------------------------------
app.get(
  "/api/categories",
  safe(async (_req, res) =>
    res.json(await Category.find().sort({ name: 1 }).lean()),
  ),
);
app.get(
  "/api/home",
  safe(async (req, res) => {
    const viewer = await getCurrentUser(req);
    const all = await Category.find().sort({ name: 1 }).lean();
    if (!all.length)
      return res.json({
        categories: [],
        trending: [],
        latest: [],
        upcoming: [],
        lanes: [],
      });
    const [trending, latest, upcoming, lanes] = await Promise.all([
      Content.find({ isUpcoming: false })
        .sort({ popularityScore: -1, createdAt: -1 })
        .limit(8)
        .populate("category")
        .lean(),
      Content.find({ isUpcoming: false })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("category")
        .lean(),
      Content.find({ isUpcoming: true })
        .sort({ releaseDate: 1 })
        .limit(6)
        .populate("category")
        .lean(),
      Promise.all(
        all
          .slice(0, 6)
          .map(async (category) => ({
            category,
            items: await Content.find({
              category: category._id,
              isUpcoming: false,
            })
              .sort({ popularityScore: -1 })
              .limit(5)
              .lean(),
          })),
      ),
    ]);
    const favoriteIds = viewer?.favoriteCategories || [];
    lanes.sort(
      (a, b) =>
        Number(favoriteIds.some((x) => String(x) === String(b.category._id))) -
        Number(favoriteIds.some((x) => String(x) === String(a.category._id))),
    );
    const counts = await Content.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(
      counts.map((x) => [String(x._id), x.count]),
    );
    res.json({
      categories: all.map((c) => ({
        ...c,
        count: countByCategory.get(String(c._id)) || 0,
      })),
      trending,
      latest,
      upcoming,
      lanes,
    });
  }),
);
app.get(
  "/api/explore",
  safe(async (req, res) => {
    const query = z
      .object({
        q: z.string().trim().max(100).optional(),
        category: z.enum(categories).optional(),
        genre: z.string().trim().max(40).optional(),
        type: z.enum(["ARTICLE", "VIDEO", "AUDIO", "IMAGE"]).optional(),
        year: z.coerce.number().int().min(1900).max(2200).optional(),
        sort: z.enum(["latest", "popular", "alphabetical"]).default("latest"),
        page: z.coerce.number().int().min(1).default(1),
      })
      .safeParse(req.query);
    if (!query.success)
      return res
        .status(400)
        .json({ error: "One or more filters are invalid." });
    const p = query.data,
      filter = { isUpcoming: false };
    if (p.q)
      filter.$or = [
        { title: { $regex: escapeRegex(p.q), $options: "i" } },
        { description: { $regex: escapeRegex(p.q), $options: "i" } },
        { tags: { $regex: escapeRegex(p.q), $options: "i" } },
      ];
    if (p.category) {
      const category = await Category.findOne({ name: p.category });
      if (!category) return res.json({ items: [], total: 0, page: p.page });
      filter.category = category._id;
    }
    if (p.genre)
      filter.genre = { $regex: `^${escapeRegex(p.genre)}$`, $options: "i" };
    if (p.type) filter.type = p.type;
    if (p.year)
      filter.releaseDate = {
        $gte: new Date(`${p.year}-01-01`),
        $lt: new Date(`${p.year + 1}-01-01`),
      };
    const sort =
      p.sort === "popular"
        ? { popularityScore: -1 }
        : p.sort === "alphabetical"
          ? { title: 1 }
          : { createdAt: -1 };
    const [items, total] = await Promise.all([
      Content.find(filter)
        .sort(sort)
        .skip((p.page - 1) * 24)
        .limit(24)
        .populate("category")
        .lean(),
      Content.countDocuments(filter),
    ]);
    res.json({ items, total, page: p.page });
  }),
);
app.get(
  "/api/content/:id",
  safe(async (req, res) => {
    if (!id(req.params.id))
      return res.status(404).json({ error: "Content not found." });
    const item = await Content.findById(req.params.id)
      .populate("category")
      .lean();
    return item
      ? res.json(item)
      : res.status(404).json({ error: "Content not found." });
  }),
);
const articleHtml = (value) =>
  sanitizeHtml(value || "", {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "s",
      "blockquote",
      "ul",
      "ol",
      "li",
      "h2",
      "h3",
      "h4",
      "a",
      "img",
      "figure",
      "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { rel: "noopener noreferrer", target: "_blank" },
        true,
      ),
    },
  });
app.get(
  "/api/articles",
  safe(async (_req, res) =>
    res.json(
      (
        await Article.find().sort({ createdAt: -1 }).populate("category").lean()
      ).map((a) => ({ ...a, richTextBody: articleHtml(a.richTextBody) })),
    ),
  ),
);
app.get(
  "/api/articles/:id",
  safe(async (req, res) => {
    if (!id(req.params.id))
      return res.status(404).json({ error: "Article not found." });
    const row = await Article.findById(req.params.id)
      .populate("category")
      .lean();
    return row
      ? res.json({ ...row, richTextBody: articleHtml(row.richTextBody) })
      : res.status(404).json({ error: "Article not found." });
  }),
);
app.get(
  "/api/characters/:id",
  safe(async (req, res) => {
    if (!id(req.params.id))
      return res.status(404).json({ error: "Character not found." });
    const row = await Character.findById(req.params.id)
      .populate("category")
      .lean();
    return row
      ? res.json(row)
      : res.status(404).json({ error: "Character not found." });
  }),
);
app.get(
  "/api/characters",
  safe(async (req, res) => {
    const filter = {};
    if (req.query.category && categories.includes(String(req.query.category))) {
      const cat = await Category.findOne({ name: req.query.category });
      if (cat) filter.category = cat._id;
    }
    res.json(
      await Character.find(filter)
        .sort({ name: 1 })
        .populate("category")
        .lean(),
    );
  }),
);
app.get(
  "/api/merch",
  safe(async (req, res) => {
    const filter = {};
    if (req.query.upcoming === "true") filter.isUpcoming = true;
    res.json(
      await Merch.find(filter)
        .sort({ isUpcoming: -1, createdAt: -1 })
        .populate("category")
        .lean(),
    );
  }),
);
app.get(
  "/api/merch/:id",
  safe(async (req, res) => {
    if (!id(req.params.id))
      return res.status(404).json({ error: "Item not found." });
    const item = await Merch.findById(req.params.id)
      .populate("category")
      .lean();
    return item
      ? res.json(item)
      : res.status(404).json({ error: "Item not found." });
  }),
);
const merchViewLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.post(
  "/api/merch/:id/view",
  merchViewLimiter,
  safe(async (req, res) => {
    if (!id(req.params.id))
      return res.status(404).json({ error: "Item not found." });
    const result = await Merch.updateOne(
      { _id: req.params.id },
      { $inc: { viewCount: 1 } },
    );
    return result.matchedCount
      ? res.json({ ok: true })
      : res.status(404).json({ error: "Item not found." });
  }),
);
app.get(
  "/api/events",
  safe(async (req, res) => {
    const query = z
      .object({
        city: z.string().trim().max(80).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .safeParse(req.query);
    if (!query.success)
      return res.status(400).json({ error: "Invalid event filters." });
    const filter = {};
    if (query.data.city)
      filter.city = { $regex: escapeRegex(query.data.city), $options: "i" };
    if (query.data.from || query.data.to) filter.date = {};
    if (query.data.from && !Number.isNaN(Date.parse(query.data.from)))
      filter.date.$gte = new Date(query.data.from);
    if (query.data.to && !Number.isNaN(Date.parse(query.data.to)))
      filter.date.$lte = new Date(query.data.to);
    res.json(
      await Event.find(filter).sort({ date: 1 }).populate("category").lean(),
    );
  }),
);
app.get(
  "/api/upcoming",
  safe(async (_req, res) => {
    const [content, merch] = await Promise.all([
      Content.find({ isUpcoming: true })
        .sort({ releaseDate: 1 })
        .populate("category")
        .lean(),
      Merch.find({ isUpcoming: true })
        .sort({ createdAt: -1 })
        .populate("category")
        .lean(),
    ]);
    res.json({ content, merch });
  }),
);
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Member tools --------------------------------------------------------------
app.get(
  "/api/profile",
  requireUser,
  safe(async (req, res) => {
    const user = await User.findById(req.user.id)
      .populate("favoriteCategories")
      .lean();
    res.json({
      user: publicUser(user),
      favoriteCategories: user.favoriteCategories,
    });
  }),
);
app.patch(
  "/api/profile",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    const schema = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        favoriteCategories: z.array(z.string().refine(id)).max(8).optional(),
        avatarUrl: z
          .string()
          .regex(/^\/uploads\/[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i)
          .optional(),
      })
      .strict();
    const parsed = validate(schema, req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Profile details are invalid." });
    if (parsed.data.favoriteCategories) {
      const count = await Category.countDocuments({
        _id: { $in: parsed.data.favoriteCategories },
      });
      if (count !== parsed.data.favoriteCategories.length)
        return res.status(400).json({ error: "Choose valid fandoms." });
    }
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: parsed.data },
      { new: true },
    );
    res.json({ user: publicUser(updated) });
  }),
);
app.post(
  "/api/profile/avatar",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    const parsed = validate(
      z.object({ dataUrl: z.string().max(2_800_000) }),
      req.body,
    );
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Choose an image smaller than 2 MB." });
    const match =
      /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        parsed.data.dataUrl,
      );
    if (!match)
      return res.status(400).json({ error: "Use a PNG, JPEG, or WebP image." });
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 2 * 1024 * 1024)
      return res
        .status(413)
        .json({ error: "Images must be smaller than 2 MB." });
    const signatures = {
      png: [0x89, 0x50, 0x4e, 0x47],
      jpeg: [0xff, 0xd8, 0xff],
      webp: [0x52, 0x49, 0x46, 0x46],
    };
    if (
      !signatures[match[1]].every((b, i) => bytes[i] === b) ||
      (match[1] === "webp" && bytes.subarray(8, 12).toString() !== "WEBP")
    )
      return res.status(400).json({ error: "The image file is invalid." });
    const filename = `${crypto.randomUUID()}.${match[1] === "jpeg" ? "jpg" : match[1]}`;
    const uploadDir = path.resolve(dirname, "../public/uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), bytes, { flag: "wx" });
    const avatarUrl = `/uploads/${filename}`;
    await User.updateOne({ _id: req.user.id }, { $set: { avatarUrl } });
    res.status(201).json({ avatarUrl });
  }),
);
app.get(
  "/api/dashboard/activity",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    const [bookmarks, ratings, submissions] = await Promise.all([
      Bookmark.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Rating.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Submission.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);
    res.json(
      [
        ...bookmarks.map((x) => ({
          type: "Saved something",
          date: x.createdAt,
          id: x._id,
        })),
        ...ratings.map((x) => ({
          type: "Rated a discovery",
          date: x.createdAt,
          id: x._id,
        })),
        ...submissions.map((x) => ({
          type: `Submission ${x.status.toLowerCase()}`,
          date: x.createdAt,
          id: x._id,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    );
  }),
);
app.get(
  "/api/bookmarks",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    const rows = await Bookmark.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    const models = {
      content: Content,
      character: Character,
      merch: Merch,
      article: Article,
    };
    const populated = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        item: await models[row.targetType]
          .findById(row.target)
          .populate("category")
          .lean(),
      })),
    );
    res.json(populated);
  }),
);
app.post(
  "/api/bookmarks",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    const parsed = validate(
      z.object({
        targetType: z.enum(["content", "character", "merch", "article"]),
        target: z.string().refine(id),
        note: z.string().max(500).optional(),
      }),
      req.body,
    );
    if (!parsed.success)
      return res.status(400).json({ error: "Bookmark details are invalid." });
    const { targetType, target, note } = parsed.data;
    const models = {
      content: Content,
      character: Character,
      merch: Merch,
      article: Article,
    };
    if (!(await models[targetType].exists({ _id: target })))
      return res.status(404).json({ error: "That item could not be found." });
    const row = await Bookmark.findOneAndUpdate(
      { user: req.user.id, targetType, target },
      {
        $set: { note },
        $setOnInsert: { user: req.user.id, targetType, target },
      },
      { new: true, upsert: true, runValidators: true },
    );
    res.status(201).json(row);
  }),
);
app.delete(
  "/api/bookmarks/:id",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    if (!id(req.params.id))
      return res.status(404).json({ error: "Bookmark not found." });
    const row = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    return row
      ? res.json({ ok: true })
      : res.status(404).json({ error: "Bookmark not found." });
  }),
);
app.patch(
  "/api/bookmarks/:id",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    if (!id(req.params.id))
      return res.status(404).json({ error: "Bookmark not found." });
    const parsed = validate(
      z.object({ note: z.string().trim().max(500) }),
      req.body,
    );
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Notes can be up to 500 characters." });
    const row = await Bookmark.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { note: parsed.data.note } },
      { new: true },
    );
    return row
      ? res.json(row)
      : res.status(404).json({ error: "Bookmark not found." });
  }),
);
app.post(
  "/api/ratings",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    const schema = z
      .object({
        content: z.string().refine(id),
        value: z.number().int().min(-1).max(5),
        ratingType: z.enum(["STARS", "THUMBS"]),
      })
      .refine((v) =>
        v.ratingType === "STARS"
          ? v.value >= 1 && v.value <= 5
          : v.value === 1 || v.value === -1,
      );
    const parsed = validate(schema, req.body);
    if (
      !parsed.success ||
      !(await Content.exists({ _id: parsed.data.content }))
    )
      return res.status(400).json({ error: "Rating details are invalid." });
    const { content, value, ratingType } = parsed.data;
    const row = await Rating.findOneAndUpdate(
      { user: req.user.id, content },
      { value, ratingType },
      { upsert: true, new: true, runValidators: true },
    );
    const score = ratingType === "THUMBS" ? (value > 0 ? 5 : 1) : value;
    const key = String(req.user.id);
    await Content.updateOne({ _id: content }, [
      {
        $set: {
          ratingLedger: {
            $setField: {
              field: { $literal: key },
              input: { $ifNull: ["$ratingLedger", {}] },
              value: { score, value, ratingType },
            },
          },
        },
      },
      {
        $set: {
          ratingScore: {
            $ifNull: [
              {
                $avg: {
                  $map: {
                    input: { $objectToArray: "$ratingLedger" },
                    as: "entry",
                    in: "$$entry.v.score",
                  },
                },
              },
              null,
            ],
          },
          popularityScore: {
            $add: [
              { $ifNull: ["$editorialScore", 0] },
              {
                $multiply: [
                  {
                    $ifNull: [
                      {
                        $avg: {
                          $map: {
                            input: { $objectToArray: "$ratingLedger" },
                            as: "entry",
                            in: "$$entry.v.score",
                          },
                        },
                      },
                      0,
                    ],
                  },
                  10,
                ],
              },
            ],
          },
        },
      },
    ]);
    const updated = await Content.findById(content)
      .select("ratingScore popularityScore")
      .lean();
    res.json({ rating: row, ratingScore: updated?.ratingScore });
  }),
);
app.post(
  "/api/submissions",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    const parsed = validate(
      z.object({
        title: z.string().trim().min(3).max(160),
        body: z.string().trim().min(20).max(10000),
        type: z.enum(["CONTENT", "FEATURED_ARTICLE"]),
        category: z.string().refine(id),
      }),
      req.body,
    );
    if (
      !parsed.success ||
      !(await Category.exists({ _id: parsed.data?.category }))
    )
      return res.status(400).json({ error: "Submission details are invalid." });
    res
      .status(201)
      .json(await Submission.create({ ...parsed.data, user: req.user.id }));
  }),
);
app.post(
  "/api/feedback",
  requireUser,
  requireMember,
  safe(async (req, res) => {
    const parsed = validate(
      z.object({
        type: z.enum(["BUG", "SUGGESTION", "QUERY"]),
        message: z.string().trim().min(8).max(4000),
      }),
      req.body,
    );
    if (!parsed.success)
      return res.status(400).json({ error: "Feedback details are invalid." });
    res
      .status(201)
      .json(await Feedback.create({ ...parsed.data, user: req.user.id }));
  }),
);
app.post(
  "/api/chat",
  chatLimiter,
  safe(async (req, res) => {
    const parsed = validate(
      z.object({ message: z.string().trim().min(2).max(1000) }),
      req.body,
    );
    if (!parsed.success)
      return res.status(400).json({ error: "Please enter a short question." });
    const faqs = await FAQ.find().lean();
    const message = parsed.data.message.toLowerCase();
    const hit = faqs.find((f) =>
      [f.question, f.keywords || ""]
        .join(" ")
        .toLowerCase()
        .split(/[,\s]+/)
        .filter(Boolean)
        .some((word) => word.length > 3 && message.includes(word)),
    );
    const response =
      hit?.answer ||
      "I can help with browsing fandoms, events, articles, and account tools. Try asking about one of those.";
    await ChatQuery.create({
      message: parsed.data.message,
      response,
      category: hit?.category,
    });
    res.json({ response });
  }),
);

// Administrator tools -------------------------------------------------------
const adminModels = {
  categories: Category,
  content: Content,
  characters: Character,
  articles: Article,
  merch: Merch,
  events: Event,
  faqs: FAQ,
  users: User,
  submissions: Submission,
  feedback: Feedback,
};
app.get(
  "/api/admin/overview",
  requireUser,
  requireAdmin,
  safe(async (_req, res) => {
    const [users, content, pending, feedback, questions, activeUsers] =
      await Promise.all([
        User.countDocuments(),
        Content.countDocuments(),
        Submission.countDocuments({ status: "PENDING" }),
        Feedback.countDocuments({ status: "OPEN" }),
        ChatQuery.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 864e5) },
        }),
        User.countDocuments({
          role: { $in: ["USER", "ADMIN"] },
          lastSeen: { $gte: new Date(Date.now() - 30 * 864e5) },
        }),
      ]);
    res.json({ users, content, pending, feedback, questions, activeUsers });
  }),
);
app.get(
  "/api/admin/analytics",
  requireUser,
  requireAdmin,
  safe(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 864e5);
    const [popularCategories, chatbotInteractions] = await Promise.all([
      Content.aggregate([
        {
          $group: {
            _id: "$category",
            score: { $avg: "$popularityScore" },
            items: { $sum: 1 },
          },
        },
        { $sort: { score: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        { $project: { _id: 0, name: "$category.name", score: 1, items: 1 } },
      ]),
      ChatQuery.countDocuments({ createdAt: { $gte: since } }),
    ]);
    res.json({
      activeUsersWindow: "30 days since successful login",
      activeUsers: await User.countDocuments({
        role: { $in: ["USER", "ADMIN"] },
        lastSeen: { $gte: since },
      }),
      popularCategories,
      chatbotInteractions,
    });
  }),
);
app.get(
  "/api/admin/:kind",
  requireUser,
  requireAdmin,
  safe(async (req, res) => {
    const Model = adminModels[req.params.kind];
    if (!Model)
      return res.status(404).json({ error: "Unknown management area." });
    if (req.params.kind === "users")
      return res.json(
        await User.find()
          .select(
            "name email role avatarUrl lastSeen suspendedUntil suspensionReason createdAt",
          )
          .sort({ createdAt: -1 })
          .lean(),
      );
    if (req.params.kind === "submissions")
      return res.json(
        await Submission.find()
          .sort({ createdAt: -1 })
          .populate("user", "name email")
          .populate("category")
          .lean(),
      );
    if (req.params.kind === "feedback")
      return res.json(
        await Feedback.find()
          .sort({ createdAt: -1 })
          .populate("user", "name email")
          .lean(),
      );
    res.json(
      await Model.find().sort({ createdAt: -1 }).populate("category").lean(),
    );
  }),
);
app.post(
  "/api/admin/:kind",
  requireUser,
  requireAdmin,
  safe(async (req, res) => {
    const Model = adminModels[req.params.kind];
    if (!Model)
      return res.status(404).json({ error: "Unknown management area." });
    const clean = validateAdminPayload(req.params.kind, req.body);
    if (!clean)
      return res
        .status(400)
        .json({ error: "Please review the required fields." });
    res.status(201).json(await Model.create(clean));
  }),
);
app.patch(
  "/api/admin/:kind/:id",
  requireUser,
  requireAdmin,
  safe(async (req, res) => {
    const Model = adminModels[req.params.kind];
    if (!Model || !id(req.params.id))
      return res.status(404).json({ error: "Record not found." });
    if (req.params.kind === "submissions") return reviewSubmission(req, res);
    if (req.params.kind === "users") {
      if (String(req.user._id) === req.params.id && req.body.role !== "ADMIN")
        return res
          .status(400)
          .json({ error: "You cannot remove your own administrator role." });
      const parsed = validate(
        z.object({
          role: z.enum(["VISITOR", "USER", "ADMIN"]),
          suspendedUntil: z
            .union([z.coerce.date(), z.literal("")])
            .optional()
            .transform((v) => (v === "" ? null : v)),
          suspensionReason: z.string().max(500).optional(),
        }),
        req.body,
      );
      if (!parsed.success)
        return res
          .status(400)
          .json({ error: "Review the role and suspension details." });
      const row = await User.findByIdAndUpdate(
        req.params.id,
        { $set: parsed.data },
        { new: true },
      ).select("name email role lastSeen suspendedUntil suspensionReason");
      return row
        ? res.json(row)
        : res.status(404).json({ error: "User not found." });
    }
    if (req.params.kind === "feedback") {
      const parsed = validate(
        z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]) }),
        req.body,
      );
      if (!parsed.success)
        return res.status(400).json({ error: "Invalid feedback status." });
      const row = await Feedback.findByIdAndUpdate(
        req.params.id,
        { $set: parsed.data },
        { new: true },
      );
      return row
        ? res.json(row)
        : res.status(404).json({ error: "Feedback not found." });
    }
    const clean = validateAdminPayload(req.params.kind, req.body, true);
    if (!clean)
      return res
        .status(400)
        .json({ error: "Please review the required fields." });
    const row = await Model.findByIdAndUpdate(req.params.id, clean, {
      new: true,
      runValidators: true,
    });
    return row
      ? res.json(row)
      : res.status(404).json({ error: "Record not found." });
  }),
);
async function reviewSubmission(req, res) {
  const parsed = validate(
    z.object({ status: z.enum(["APPROVED", "REJECTED"]) }),
    req.body,
  );
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid review action." });
  const submission = await Submission.findOne({
    _id: req.params.id,
    status: "PENDING",
  });
  if (!submission)
    return res
      .status(409)
      .json({ error: "This submission has already been reviewed." });
  if (parsed.data.status === "APPROVED" && !submission.category)
    return res
      .status(400)
      .json({ error: "Choose a fandom before approving this submission." });
  let published = null;
  try {
    if (parsed.data.status === "APPROVED") {
      published =
        submission.type === "FEATURED_ARTICLE"
          ? await Article.create({
              category: submission.category,
              title: submission.title,
              richTextBody: articleHtml(submission.body),
            })
          : await Content.create({
              category: submission.category,
              title: submission.title,
              type: "ARTICLE",
              description: submission.body,
            });
    }
    const claimed = await Submission.updateOne(
      { _id: submission._id, status: "PENDING" },
      {
        $set: {
          status: parsed.data.status,
          reviewedAt: new Date(),
          reviewedBy: req.user._id,
        },
      },
    );
    if (claimed.modifiedCount !== 1) {
      if (published) await published.deleteOne();
      return res
        .status(409)
        .json({ error: "This submission has already been reviewed." });
    }
    return res.json({
      ok: true,
      status: parsed.data.status,
      reviewedBy: String(req.user._id),
    });
  } catch (error) {
    if (published) await published.deleteOne().catch(() => {});
    throw error;
  }
}
app.delete(
  "/api/admin/:kind/:id",
  requireUser,
  requireAdmin,
  safe(async (req, res) => {
    const kind = req.params.kind,
      Model = adminModels[kind];
    if (!Model || kind === "users" || !id(req.params.id))
      return res.status(404).json({ error: "Record not found." });
    if (kind === "categories") {
      const [contents, characters, articles, merch, events, faqs, favorites] =
        await Promise.all([
          Content.countDocuments({ category: req.params.id }),
          Character.countDocuments({ category: req.params.id }),
          Article.countDocuments({ category: req.params.id }),
          Merch.countDocuments({ category: req.params.id }),
          Event.countDocuments({ category: req.params.id }),
          FAQ.countDocuments({ category: req.params.id }),
          User.countDocuments({ favoriteCategories: req.params.id }),
        ]);
      if (
        contents + characters + articles + merch + events + faqs + favorites >
        0
      )
        return res
          .status(409)
          .json({
            error: "Move or remove this fandom’s records before deleting it.",
          });
    }
    const row = await Model.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ error: "Record not found." });
    if (kind === "content") {
      await Promise.all([
        Bookmark.deleteMany({ targetType: "content", target: row._id }),
        Rating.deleteMany({ content: row._id }),
      ]);
    }
    if (kind === "characters" || kind === "merch" || kind === "articles") {
      await Bookmark.deleteMany({
        targetType:
          kind === "characters"
            ? "character"
            : kind === "merch"
              ? "merch"
              : "article",
        target: row._id,
      });
    }
    return res.json({ ok: true });
  }),
);
function validateAdminPayload(kind, input, partial = false) {
  const category = z.string().refine(id);
  const text = (min = 1, max = 10000) => z.string().trim().min(min).max(max);
  const httpUrl = z
    .string()
    .url()
    .max(1000)
    .refine(
      (value) => ["https:", "http:"].includes(new URL(value).protocol),
      "Use an HTTP or HTTPS URL.",
    );
  const schemas = {
    categories: z.object({
      name: z.enum(categories),
      description: text(0, 1000),
      coverImage: httpUrl.optional().or(z.literal("")),
      featured: z.boolean().optional(),
    }),
    content: z.object({
      category,
      title: text(2, 180),
      type: z.enum(["ARTICLE", "VIDEO", "AUDIO", "IMAGE"]),
      tags: z.string().max(500).optional(),
      genre: z.string().max(60).optional(),
      description: text(0, 10000),
      releaseDate: z.coerce.date().optional(),
      popularityScore: z.number().int().min(0).max(100000).optional(),
      editorialScore: z.number().int().min(0).max(100000).optional(),
      isUpcoming: z.boolean().optional(),
      mediaUrl: httpUrl.optional().or(z.literal("")),
      trailerUrl: httpUrl.optional().or(z.literal("")),
    }),
    characters: z.object({
      category,
      name: text(2, 120),
      bio: text(0, 5000),
      imageUrl: httpUrl.optional().or(z.literal("")),
    }),
    articles: z.object({
      category,
      title: text(2, 180),
      richTextBody: text(1, 30000),
      coverImage: httpUrl.optional().or(z.literal("")),
      eventTimeline: z
        .array(
          z.object({
            date: z.string().max(40),
            label: text(1, 120),
            body: text(0, 1500),
          }),
        )
        .max(50)
        .optional(),
    }),
    merch: z.object({
      category,
      name: text(2, 160),
      imageUrl: httpUrl.optional().or(z.literal("")),
      tag: z.enum(["LIMITED_EDITION", "PRE_ORDER", "COLLECTIBLE"]),
      tags: z.string().max(500).optional(),
      isUpcoming: z.boolean().optional(),
      price: z.number().min(0).max(1e6).optional(),
    }),
    events: z.object({
      name: text(2, 160),
      city: text(2, 80),
      date: z.coerce.date(),
      ticketLink: httpUrl.optional().or(z.literal("")),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      category: category.optional(),
    }),
    faqs: z.object({
      question: text(3, 500),
      answer: text(2, 4000),
      category: category.optional(),
      keywords: z.string().max(500).optional(),
    }),
  };
  const schema = schemas[kind];
  if (!schema) return null;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return null;
  const value = { ...parsed.data };
  if (kind === "articles") value.richTextBody = articleHtml(value.richTextBody);
  if (value.category) value.category = value.category;
  if (value.releaseDate === undefined) delete value.releaseDate;
  return value;
}

// Safe API fallback and application static assets --------------------------
app.get(
  "/sitemap.xml",
  safe(async (req, res) => {
    const base = (
      process.env.APP_URL || `${req.protocol}://${req.get("host")}`
    ).replace(/\/$/, "");
    const [categories, contents, articles, characters, merch] =
      await Promise.all([
        Category.find().select("_id name").lean(),
        Content.find({ isUpcoming: false }).select("_id").lean(),
        Article.find().select("_id").lean(),
        Character.find().select("_id").lean(),
        Merch.find().select("_id").lean(),
      ]);
    const paths = [
      "/",
      "/explore",
      "/articles",
      "/characters",
      "/events",
      "/merch",
      "/upcoming",
      "/sitemap",
      ...contents.map((x) => `/content/${x._id}`),
      ...articles.map((x) => `/articles/${x._id}`),
      ...characters.map((x) => `/characters/${x._id}`),
      ...merch.map((x) => `/merch/${x._id}`),
      ...categories.map((x) => `/explore?category=${x.name}`),
    ];
    const xmlEscape = (s) =>
      String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
    res
      .type("application/xml")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>${xmlEscape(base + p)}</loc></url>`).join("")}</urlset>`,
      );
  }),
);
app.get("/robots.txt", (_req, res) =>
  res
    .type("text/plain")
    .send(
      "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: " +
        (process.env.APP_URL || "http://localhost:5173") +
        "/sitemap.xml",
    ),
);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
app.use(express.static(path.resolve(dirname, "../public")));
const dist = path.resolve(dirname, "../client/dist");

await connectDatabase();
await Promise.all([Bookmark.init(), Rating.init()]);
for (const name of categories)
  await Category.updateOne(
    { name },
    {
      $setOnInsert: {
        name,
        description: `A home for ${name.toLowerCase().replace("_", " ")} fans.`,
        featured: false,
      },
    },
    { upsert: true },
  );
if (process.env.NODE_ENV !== "production") {
  const httpServer = createServer(app);
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path.resolve(dirname, "../client/vite.config.ts"),
    server: { middlewareMode: true, ws: { server: httpServer } },
    appType: "custom",
  });
  app.use(vite.middlewares);
  app.get("*path", async (req, res, next) => {
    try {
      const template = await readFile(
        path.resolve(dirname, "../client/index.html"),
        "utf8",
      );
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).type("html").send(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
  app.use((err, _req, res, _next) => {
    console.error("API error:", err?.message || "unknown");
    if (err?.code === 11000)
      return res.status(409).json({ error: "That record already exists." });
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await vite.close();
    } catch (error) {
      console.error("Vite shutdown error:", error?.message || "unknown");
    }
    if (httpServer.listening) {
      const closed = new Promise((resolve) =>
        httpServer.close(() => resolve()),
      );
      httpServer.closeAllConnections?.();
      await closed;
    }
    await disconnectDatabase();
  };
  process.once("SIGTERM", () => {
    void shutdown();
  });
  process.once("SIGINT", () => {
    void shutdown();
  });
  httpServer.on("error", (error) => {
    if (error.code === "EADDRINUSE")
      console.error(
        `Port ${port} is already in use. Stop the other Fan Hub Plus dev server first.`,
      );
    else console.error("Development server error:", error.message);
    process.exitCode = 1;
    void shutdown();
  });
  httpServer.listen(port, () =>
    console.info(`Fan Hub Plus is running at http://localhost:${port}`),
  );
} else {
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*path", (_req, res) =>
      res.sendFile(path.join(dist, "index.html")),
    );
  }
  app.use((err, _req, res, _next) => {
    console.error("API error:", err?.message || "unknown");
    if (err?.code === 11000)
      return res.status(409).json({ error: "That record already exists." });
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });
  app.listen(port, () =>
    console.info(`Fan Hub Plus is running at http://localhost:${port}`),
  );
}
