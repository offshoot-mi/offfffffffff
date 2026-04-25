import mongoose from 'mongoose';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import User from '../models/user.model.js'; // old mongoose model
import Content from '../models/content.model.js';

dotenv.config();

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}).lean();
  const contents = await Content.find({}).lean();
  await fs.writeFile('./data/users.json', JSON.stringify(users, null, 2));
  await fs.writeFile('./data/contents.json', JSON.stringify(contents, null, 2));
  console.log('Migration complete');
  process.exit();
};

migrate();