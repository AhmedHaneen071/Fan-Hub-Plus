import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;
const opts = { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, strict: true };
const make = (name, fields, extra = {}) => {
  if (models[name]) return models[name];
  const { indexes = [], ...schemaOptions } = extra;
  const schema = new Schema(fields, { ...opts, ...schemaOptions });
  for (const index of indexes) schema.index(index.fields, index.options || {});
  return model(name, schema);
};

export const User = make('User', {
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['VISITOR', 'USER', 'ADMIN'], default: 'USER' },
  avatarUrl: { type: String, default: '' }, favoriteCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  lastSeen: Date, suspendedUntil: Date, suspensionReason: String,
});

export const Category = make('Category', {
  name: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' }, coverImage: String, featured: { type: Boolean, default: false },
});

export const Content = make('Content', {
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true }, title: { type: String, required: true, trim: true, maxlength: 180 },
  type: { type: String, enum: ['ARTICLE', 'VIDEO', 'AUDIO', 'IMAGE'], required: true }, tags: { type: String, default: '' }, genre: String,
  description: { type: String, default: '' }, releaseDate: Date, popularityScore: { type: Number, default: 0 }, editorialScore: { type: Number, default: 0 },
  ratingScore: Number, ratingLedger: { type: Schema.Types.Mixed, default: {} }, isUpcoming: { type: Boolean, default: false }, mediaUrl: String, trailerUrl: String,
});
export const Character = make('Character', { category: { type: Schema.Types.ObjectId, ref: 'Category', required: true }, name: { type: String, required: true, trim: true }, bio: { type: String, default: '' }, imageUrl: String });
export const Article = make('Article', { category: { type: Schema.Types.ObjectId, ref: 'Category', required: true }, title: { type: String, required: true, trim: true }, richTextBody: { type: String, default: '' }, coverImage: String, eventTimeline: { type: [Schema.Types.Mixed], default: [] } });
export const Merch = make('Merch', { category: { type: Schema.Types.ObjectId, ref: 'Category', required: true }, name: { type: String, required: true, trim: true }, imageUrl: String, tag: { type: String, enum: ['LIMITED_EDITION', 'PRE_ORDER', 'COLLECTIBLE'], default: 'COLLECTIBLE' }, tags: { type: String, default: '' }, isUpcoming: { type: Boolean, default: false }, viewCount: { type: Number, default: 0 }, price: Number });
export const Event = make('Event', { name: { type: String, required: true, trim: true }, city: { type: String, required: true, trim: true }, date: { type: Date, required: true }, ticketLink: String, latitude: { type: Number, default: 0 }, longitude: { type: Number, default: 0 }, category: { type: Schema.Types.ObjectId, ref: 'Category' } });
export const Bookmark = make('Bookmark', { user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, targetType: { type: String, enum: ['content', 'character', 'merch', 'article'], required: true }, target: { type: Schema.Types.ObjectId, required: true }, note: String }, { ...opts, indexes: [{ fields: { user: 1, targetType: 1, target: 1 }, options: { unique: true } }] });
export const Rating = make('Rating', { user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, content: { type: Schema.Types.ObjectId, ref: 'Content', required: true }, value: { type: Number, min: -1, max: 5, required: true }, ratingType: { type: String, enum: ['STARS', 'THUMBS'], default: 'STARS' } }, { ...opts, indexes: [{ fields: { user: 1, content: 1 }, options: { unique: true } }] });
export const Feedback = make('Feedback', { user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, type: { type: String, enum: ['BUG', 'SUGGESTION', 'QUERY'], required: true }, message: { type: String, required: true, maxlength: 4000 }, status: { type: String, default: 'OPEN' } });
export const Submission = make('FanSubmission', { user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, title: { type: String, required: true }, body: { type: String, required: true }, type: { type: String, enum: ['CONTENT', 'FEATURED_ARTICLE'], default: 'CONTENT' }, status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' }, category: { type: Schema.Types.ObjectId, ref: 'Category' }, reviewedAt: Date, reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' } });
export const FAQ = make('ChatbotFAQ', { question: { type: String, required: true }, answer: { type: String, required: true }, category: { type: Schema.Types.ObjectId, ref: 'Category' }, keywords: String });
export const ChatQuery = make('ChatbotQuery', { user: { type: Schema.Types.ObjectId, ref: 'User' }, message: { type: String, required: true }, response: { type: String, required: true }, category: { type: Schema.Types.ObjectId, ref: 'Category' } });
export const ResetToken = make('PasswordResetToken', { user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, tokenHash: { type: String, unique: true }, expiresAt: Date, used: { type: Boolean, default: false } });
