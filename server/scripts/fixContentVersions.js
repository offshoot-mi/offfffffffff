import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Content from '../models/content.model.js';

dotenv.config();

const fixContentLineage = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all content
    const contents = await Content.find({});
    console.log(`Found ${contents.length} content items`);

    let fixedCount = 0;
    let createdCount = 0;

    for (const content of contents) {
      let modified = false;

      // Check if content has versions
      if (!content.versions || content.versions.length === 0) {
        console.log(`Fixing content: ${content._id} - ${content.title || 'Untitled'}`);
        
        // Calculate character count
        const plainText = content.text.replace(/<[^>]*>/g, '');
        const characterCount = plainText.replace(/\s/g, '').length;
        
        // Create initial version
        content.versions = [{
          versionNumber: 1,
          title: content.title || null,
          text: content.text,
          characterCount,
          contributors: [{
            user: content.author,
            contribution: 100,
            contributedAt: content.createdAt || new Date()
          }],
          likes: content.likes || [],
          likeCount: content.likeCount || 0,
          views: 0,
          uniqueReaders: [],
          createdAt: content.createdAt || new Date(),
          published: true,
          publishedAt: content.createdAt || new Date(),
          gemsEarned: Math.round((characterCount * 0.05) * 100) / 100,
          rawGems: Math.round((characterCount * 0.05) * 100) / 100,
          noveltyMultiplier: 1.0,
          noveltyBonusType: 'none'
        }];
        
        content.currentVersion = 1;
        content.collaborators = [content.author];
        content.characterCount = characterCount;
        content.totalGems = Math.round((characterCount * 0.05) * 100) / 100;
        
        modified = true;
        fixedCount++;
      }

      // Ensure collaborators array exists
      if (!content.collaborators || content.collaborators.length === 0) {
        content.collaborators = [content.author];
        modified = true;
      }

      // Ensure characterCount exists
      if (!content.characterCount || content.characterCount === 0) {
        const plainText = content.text.replace(/<[^>]*>/g, '');
        content.characterCount = plainText.replace(/\s/g, '').length;
        modified = true;
      }

      if (modified) {
        await content.save();
        console.log(`✅ Fixed content: ${content._id}`);
      }
    }

    // Check if there are any content items at all
    const finalCount = await Content.countDocuments();
    console.log(`\n📊 Summary:`);
    console.log(`   Total content in database: ${finalCount}`);
    console.log(`   Fixed content: ${fixedCount}`);
    
    if (finalCount === 0) {
      console.log(`\n⚠️ No content found! Creating a test article...`);
      
      // Find a user to be the author
      const User = (await import('../models/user.model.js')).default;
      const user = await User.findOne({ status: 'active' });
      
      if (!user) {
        console.log('❌ No user found. Please create a user first.');
        process.exit(1);
      }
      
      console.log(`Using user: ${user.username} (${user._id})`);
      
      // Create test article
      const testContent = new Content({
        title: 'Test Article',
        text: '<p>This is a test article for the gem system.</p><p>It has multiple paragraphs to demonstrate the chain value system.</p><p>Add more content to see how gems accumulate!</p>',
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
        contributors: [{
          user: user._id,
          contribution: 100,
          contributedAt: new Date()
        }],
        likes: [],
        likeCount: 0,
        views: 0,
        uniqueReaders: [],
        createdAt: new Date(),
        published: true,
        publishedAt: new Date(),
        gemsEarned: Math.round((characterCount * 0.05) * 100) / 100,
        rawGems: Math.round((characterCount * 0.05) * 100) / 100,
        noveltyMultiplier: 2.0,
        noveltyBonusType: 'version_first'
      }];
      
      testContent.currentVersion = 1;
      testContent.collaborators = [user._id];
      testContent.characterCount = characterCount;
      testContent.totalGems = Math.round((characterCount * 0.05) * 2 * 100) / 100;
      
      await testContent.save();
      createdCount++;
      
      console.log(`✅ Created test article: ${testContent._id}`);
      console.log(`   Title: ${testContent.title}`);
      console.log(`   Gems: ${testContent.totalGems}`);
    }
    
    // List all content with IDs
    console.log('\n📝 All content in database:');
    const allContent = await Content.find({}).select('_id title parentContent versions');
    allContent.forEach(c => {
      const hasVersions = c.versions && c.versions.length > 0;
      console.log(`  - ${c._id}: ${c.title || 'Untitled'} [${hasVersions ? '✓ has versions' : '✗ NO VERSIONS'}]`);
    });
    
    console.log(`\n✅ Migration complete! Fixed ${fixedCount} items, created ${createdCount} new items.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

fixContentLineage();