import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fanhubplus';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.info(`MongoDB connected: ${mongoose.connection.name}`);
}

export const id = (value) => mongoose.isValidObjectId(value);
