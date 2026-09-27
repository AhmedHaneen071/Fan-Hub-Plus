// One-way, idempotent data copy. It reads the existing SQLite DB and upserts
// stable ObjectIds in Mongo; it never deletes or alters the SQLite source.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import { User, Category, Content, Character, Article, Merch, Event, Bookmark, Rating, Feedback, Submission, FAQ, ChatQuery, ResetToken } from '../server/models.js';
import { connectDatabase } from '../server/db.js';

const prisma = new PrismaClient();
const oid = (source) => new mongoose.Types.ObjectId(createHash('sha256').update(String(source)).digest().subarray(0, 12));
const dateFields = (record, fields) => Object.fromEntries(fields.map(([to, from]) => [to, record[from]]).filter(([,v]) => v !== undefined));
const replace = async (Model, oldId, data) => Model.replaceOne({ _id: oid(oldId) }, { _id: oid(oldId), ...data }, { upsert: true, timestamps: false });
await prisma.$connect();
await connectDatabase();

const categories = await prisma.category.findMany({ include: { favoritedBy: true } });
for (const c of categories) await replace(Category,c.id,{name:c.name,description:c.description,coverImage:c.cover_image,featured:c.featured,createdAt:new Date(0),updatedAt:new Date(0)});
const users = await prisma.user.findMany({ include: { favoriteCategories: true } });
for (const u of users) await replace(User,u.id,{name:u.name,email:u.email,passwordHash:u.password_hash,role:u.role,avatarUrl:u.avatar_url||'',favoriteCategories:u.favoriteCategories.map(c=>oid(c.id)),lastSeen:u.last_seen,suspendedUntil:u.suspended_until,suspensionReason:u.suspension_reason,createdAt:u.created_at,updatedAt:u.created_at});
const legacyRatings=await prisma.rating.findMany();
const ratingLedgers=new Map();
for(const r of legacyRatings){const ledger=ratingLedgers.get(r.content_id)||{};ledger[String(oid(r.user_id))]={score:r.ratingType==='THUMBS'?(r.value>0?5:1):r.value,value:r.value,ratingType:r.ratingType};ratingLedgers.set(r.content_id,ledger)}
for (const c of await prisma.content.findMany()) await replace(Content,c.id,{category:oid(c.category_id),title:c.title,type:c.type,tags:c.tags,genre:c.genre,description:c.description,releaseDate:c.release_date,popularityScore:c.popularity_score,editorialScore:c.editorial_score,ratingScore:c.rating_score,ratingLedger:ratingLedgers.get(c.id)||{},isUpcoming:c.is_upcoming,mediaUrl:c.media_url,trailerUrl:c.trailer_url,createdAt:new Date(0),updatedAt:new Date(0)});
for (const c of await prisma.characterProfile.findMany()) await replace(Character,c.id,{category:oid(c.category_id),name:c.name,bio:c.bio,imageUrl:c.image_url,createdAt:new Date(0),updatedAt:new Date(0)});
for (const a of await prisma.featuredArticle.findMany()) { let timeline=[];try{timeline=JSON.parse(a.event_timeline||'[]')}catch{} await replace(Article,a.id,{category:oid(a.category_id),title:a.title,richTextBody:a.rich_text_body,coverImage:a.cover_image,eventTimeline:Array.isArray(timeline)?timeline:[],createdAt:new Date(0),updatedAt:new Date(0)}); }
for (const m of await prisma.merchandiseItem.findMany()) await replace(Merch,m.id,{category:oid(m.category_id),name:m.name,imageUrl:m.image_url,tag:m.tag,tags:m.tags,isUpcoming:m.is_upcoming,viewCount:m.view_count,price:m.price==null?undefined:Number(m.price),createdAt:m.created_at,updatedAt:m.created_at});
for (const e of await prisma.event.findMany()) await replace(Event,e.id,{name:e.name,city:e.city,date:e.date,ticketLink:e.ticket_link,latitude:e.latitude,longitude:e.longitude,category:e.category_id?oid(e.category_id):undefined,createdAt:new Date(0),updatedAt:new Date(0)});
for (const b of await prisma.bookmark.findMany()) { const type=b.content_id?'content':b.character_id?'character':b.merchandise_id?'merch':null;const target=b.content_id||b.character_id||b.merchandise_id;if(type&&target)await replace(Bookmark,b.id,{user:oid(b.user_id),targetType:type,target:oid(target),note:b.note,createdAt:b.created_at,updatedAt:b.created_at}); }
for (const r of legacyRatings) await replace(Rating,r.id,{user:oid(r.user_id),content:oid(r.content_id),value:r.value,ratingType:r.ratingType,createdAt:r.created_at,updatedAt:r.created_at});
for (const f of await prisma.feedback.findMany()) await replace(Feedback,f.id,{user:oid(f.user_id),type:f.type,message:f.message,status:f.status,createdAt:f.created_at,updatedAt:f.created_at});
for (const s of await prisma.fanSubmission.findMany()) await replace(Submission,s.id,{user:oid(s.user_id),title:s.title,body:s.body,type:s.type,status:s.status,category:s.category_id?oid(s.category_id):undefined,reviewedAt:s.reviewed_at,reviewedBy:s.reviewed_by?oid(s.reviewed_by):undefined,createdAt:s.created_at,updatedAt:s.created_at});
for (const f of await prisma.chatbotFAQ.findMany()) await replace(FAQ,f.id,{question:f.question,answer:f.answer,category:f.category_id?oid(f.category_id):undefined,keywords:f.keywords,createdAt:f.created_at,updatedAt:f.created_at});
for (const q of await prisma.chatbotQuery.findMany()) await replace(ChatQuery,q.id,{user:q.user_id?oid(q.user_id):undefined,message:q.message,response:q.response,category:q.category_id?oid(q.category_id):undefined,createdAt:q.created_at,updatedAt:q.created_at});
for (const r of await prisma.passwordResetToken.findMany()) await replace(ResetToken,r.id,{user:oid(r.user_id),tokenHash:r.token_hash,expiresAt:r.expires_at,used:r.used,createdAt:r.created_at,updatedAt:r.created_at});

console.info(`Copied ${users.length} users, ${categories.length} fandoms, and the existing catalogue into MongoDB. SQLite remains unchanged.`);
await prisma.$disconnect();
await mongoose.disconnect();
