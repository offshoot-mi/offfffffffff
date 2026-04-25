import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Content from '../models/content.model.js';
import User from '../models/user.model.js';

dotenv.config();

const createTestArticle = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ status: 'active' });
    if (!user) {
      console.log('No user found. Please create a user first.');
      process.exit(1);
    }

    console.log(`Using user: ${user.username} (${user._id})`);

    const testContent = new Content({
      title: 'Test Article',
      text: '<p>This is a test article to verify the gem system is working.</p><p>It has some content to calculate gems from.</p>',
      author: user._id,
      parentContent: null,
      isPrivateToFollowers: false
    });

    const plainText = testContent.text.replace(/<[^>]*>/g, '');
    const characterCount = plainText.replace(/\s/g, '').length;
    
    testContent.versions = [{
      versionNumber: 1,
      title: 'Test Article',
      text: testContent.text,
      characterCount,
      contributors: [{ user: user._id, contribution: 100, contributedAt: new Date() }],
      likes: [],
      likeCount: 0,
      views: 0,
      uniqueReaders: [],
      createdAt: new Date(),
      published: true,
      publishedAt: new Date(),
      gemsEarned: (characterCount * 0.05) * 2,
      rawGems: characterCount * 0.05,
      noveltyMultiplier: 2.0,
      noveltyBonusType: 'version_first'
    }];
    
    testContent.currentVersion = 1;
    testContent.collaborators = [user._id];
    testContent.characterCount = characterCount;
    testContent.totalGems = (characterCount * 0.05) * 2;
    
    await testContent.save();
    
    console.log('\n✅ Test article created successfully!');
    console.log(`Article ID: ${testContent._id}`);
    console.log(`Title: ${testContent.title}`);
    console.log(`Character count: ${characterCount}`);
    console.log(`Gems earned: ${testContent.totalGems}`);
    console.log(`\nYou can now view it at: http://localhost:5173/read/${testContent._id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to create test article:', error);
    process.exit(1);
  }
};

createTestArticle();