
import { getContents, saveContents } from '../data/database.js';

const fixExistingChainValues = async () => {
  console.log('🔧 FIXING EXISTING CHAIN VALUES\n');
  
  let contents = await getContents();
  let fixed = 0;
  
  for (const content of contents) {
    console.log(`\n📝 Processing: ${content.id} - ${content.title || 'Untitled'}`);
    let modified = false;
    
    if (!content.versions || content.versions.length === 0) {
      console.log(`   ⚠️ No versions, creating default version`);
      
      const plainText = content.text.replace(/<[^>]*>/g, '');
      const characterCount = plainText.replace(/\s/g, '').length;
      const gemsEarned = Math.round((characterCount * 0.05) * 2 * 100) / 100;
      
      content.versions = [{
        versionNumber: 1,
        title: content.title || null,
        text: content.text,
        characterCount: characterCount,
        contributors: [{ user: content.author, contribution: 100, contributedAt: content.createdAt || new Date().toISOString() }],
        likes: content.likes || [],
        likeCount: content.likeCount || 0,
        views: 0,
        uniqueReaders: [],
        createdAt: content.createdAt || new Date().toISOString(),
        published: true,
        publishedAt: content.createdAt || new Date().toISOString(),
        gemsEarned: gemsEarned,
        rawGems: gemsEarned,
        chainValue: gemsEarned,
        miningReward: Math.round((gemsEarned * 0.1) * 100) / 100,
        appreciation: 0,
        noveltyMultiplier: 2.0,
        noveltyBonusType: 'version_first'
      }];
      content.currentVersion = 1;
      content.collaborators = [content.author];
      content.characterCount = characterCount;
      content.totalGems = gemsEarned;
      modified = true;
      
    } else {
      // Fix existing versions
      for (const version of content.versions) {
        if (version.chainValue === undefined || version.chainValue === null) {
          version.chainValue = version.gemsEarned || 0;
          modified = true;
          console.log(`   ✅ Added chainValue to v${version.versionNumber}: ${version.chainValue}`);
        }
        
        if (version.miningReward === undefined || version.miningReward === null) {
          version.miningReward = Math.round(((version.gemsEarned || 0) * 0.1) * 100) / 100;
          modified = true;
          console.log(`   ✅ Added miningReward to v${version.versionNumber}: ${version.miningReward}`);
        }
        
        if (version.appreciation === undefined || version.appreciation === null) {
          version.appreciation = 0;
          modified = true;
          console.log(`   ✅ Added appreciation to v${version.versionNumber}: ${version.appreciation}`);
        }
        
        if (version.noveltyMultiplier === undefined) {
          version.noveltyMultiplier = version.versionNumber === 1 ? 2.0 : 1.0;
          modified = true;
        }
        
        if (version.noveltyBonusType === undefined) {
          version.noveltyBonusType = version.versionNumber === 1 ? 'version_first' : 'none';
          modified = true;
        }
      }
      
      // Recalculate chain values based on later versions
      const publishedVersions = content.versions.filter(v => v.published);
      for (let i = 0; i < publishedVersions.length; i++) {
        const current = publishedVersions[i];
        let chainVal = current.gemsEarned || 0;
        
        for (let j = i + 1; j < publishedVersions.length; j++) {
          const later = publishedVersions[j];
          const distance = j - i;
          const bonus = (later.gemsEarned || 0) * (1 / Math.pow(2, distance));
          chainVal += bonus;
        }
        
        const newChainValue = Math.round(chainVal * 100) / 100;
        if (current.chainValue !== newChainValue) {
          current.chainValue = newChainValue;
          current.appreciation = Math.round((newChainValue - (current.gemsEarned || 0)) * 100) / 100;
          modified = true;
          console.log(`   📊 Updated v${current.versionNumber} chainValue: ${newChainValue}`);
        }
      }
      
      // Update total gems
      const newTotalGems = publishedVersions.reduce((sum, v) => sum + (v.chainValue || 0), 0);
      if (content.totalGems !== newTotalGems) {
        content.totalGems = newTotalGems;
        modified = true;
        console.log(`   📊 Updated totalGems: ${newTotalGems}`);
      }
    }
    
    if (modified) {
      fixed++;
      console.log(`   ✅ Content ${content.id} fixed`);
    } else {
      console.log(`   ✅ Already has correct chain values`);
    }
  }
  
  if (fixed > 0) {
    await saveContents(contents);
    console.log(`\n✅ Fixed ${fixed} content items`);
  } else {
    console.log('\n✅ No fixes needed');
  }
  
  // Display final data
  console.log('\n📊 FINAL DATA CHECK:');
  for (const content of contents) {
    console.log(`\nContent: ${content.id} - ${content.title || 'Untitled'}`);
    console.log(`  totalGems: ${content.totalGems}`);
    for (const version of content.versions) {
      console.log(`  Version ${version.versionNumber}:`);
      console.log(`    gemsEarned: ${version.gemsEarned}`);
      console.log(`    chainValue: ${version.chainValue}`);
      console.log(`    miningReward: ${version.miningReward}`);
      console.log(`    appreciation: ${version.appreciation}`);
    }
  }
};

fixExistingChainValues().catch(console.error);