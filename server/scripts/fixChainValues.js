// /server/scripts/fixChainValues.js
import { getContents, saveContents } from '../data/database.js';
import { recalculateAllChainValues } from '../services/content.service.js';

const fixChainValues = async () => {
  console.log('🔄 Fixing chain values for all content...');
  console.log('===========================================\n');
  
  let contents = await getContents();
  let fixed = 0;
  let skipped = 0;
  
  if (contents.length === 0) {
    console.log('⚠️ No content found in database.');
    return;
  }
  
  console.log(`📊 Found ${contents.length} content items\n`);
  
  for (const content of contents) {
    let modified = false;
    
    if (!content.versions || content.versions.length === 0) {
      console.log(`⚠️ Content ${content.id} (${content.title || 'Untitled'}) has no versions, skipping...`);
      skipped++;
      continue;
    }
    
    console.log(`\n📝 Processing: ${content.id} - ${content.title || 'Untitled'}`);
    console.log(`   Versions: ${content.versions.length}`);
    
    // Ensure each version has required fields
    for (const version of content.versions) {
      let versionModified = false;
      
      if (version.chainValue === undefined) {
        version.chainValue = version.gemsEarned || 0;
        versionModified = true;
        console.log(`   ✅ Added chainValue to v${version.versionNumber}: ${version.chainValue}`);
      }
      
      if (version.miningReward === undefined) {
        version.miningReward = Math.round(((version.gemsEarned || 0) * 0.1) * 100) / 100;
        versionModified = true;
        console.log(`   ✅ Added miningReward to v${version.versionNumber}: ${version.miningReward}`);
      }
      
      if (version.appreciation === undefined) {
        version.appreciation = 0;
        versionModified = true;
        console.log(`   ✅ Added appreciation to v${version.versionNumber}: ${version.appreciation}`);
      }
      
      if (version.noveltyMultiplier === undefined) {
        version.noveltyMultiplier = version.versionNumber === 1 ? 2.0 : 1.0;
        versionModified = true;
        console.log(`   ✅ Added noveltyMultiplier to v${version.versionNumber}: ${version.noveltyMultiplier}`);
      }
      
      if (version.noveltyBonusType === undefined) {
        version.noveltyBonusType = version.versionNumber === 1 ? 'version_first' : 'none';
        versionModified = true;
        console.log(`   ✅ Added noveltyBonusType to v${version.versionNumber}: ${version.noveltyBonusType}`);
      }
      
      if (versionModified) modified = true;
    }
    
    // Recalculate all chain values
    const oldTotal = content.totalGems || 0;
    recalculateAllChainValues(content);
    
    if (oldTotal !== content.totalGems) {
      modified = true;
      console.log(`   📊 Total Gems: ${oldTotal} → ${content.totalGems}`);
    }
    
    // Log final chain values for each published version
    for (const version of content.versions.filter(v => v.published)) {
      console.log(`   📈 Version ${version.versionNumber}:`);
      console.log(`      gemsEarned: ${version.gemsEarned}`);
      console.log(`      chainValue: ${version.chainValue}`);
      console.log(`      miningReward: ${version.miningReward}`);
      console.log(`      appreciation: ${version.appreciation}`);
    }
    
    if (modified) {
      fixed++;
      console.log(`   ✅ Content ${content.id} fixed and saved\n`);
    } else {
      console.log(`   ✅ Content ${content.id} already has correct chain values\n`);
    }
  }
  
  if (fixed > 0) {
    await saveContents(contents);
    console.log('\n===========================================');
    console.log(`✅ SUCCESS: Fixed ${fixed} content items`);
    console.log(`⚠️ Skipped: ${skipped} content items (no versions)`);
    console.log('===========================================');
  } else {
    console.log('\n===========================================');
    console.log('✅ No updates needed - all chain values are correct');
    console.log('===========================================');
  }
};

// Run the script
fixChainValues().catch(err => {
  console.error('❌ Error fixing chain values:', err);
  process.exit(1);
});