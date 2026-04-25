// Rewrite/server/utils/gemCalculator.js

/**
 * Calculate gems for content based on formula:
 * BaseGems = (Views × 0.1) + (Likes × 3) + (UniqueReaderLikes × 15) + (UniqueReaders × 5) + (Characters × 0.05)
 * 
 * Then apply collaboration decay: value decreases as more contributors join
 * 
 * @param {Object} params - Calculation parameters
 * @param {number} params.views - Number of views
 * @param {number} params.likes - Number of likes
 * @param {number} params.uniqueReaders - Number of unique readers
 * @param {number} params.uniqueReaderLikes - Number of likes from unique readers
 * @param {number} params.characters - Character count (without spaces)
 * @param {number} params.collaborators - Number of collaborators
 * @returns {number} Calculated gem value
 */
const calculateGems = ({ 
  views = 0, 
  likes = 0, 
  uniqueReaders = 0, 
  uniqueReaderLikes = 0, 
  characters = 0, 
  collaborators = 1 
}) => {
  // Base calculation
  let gems = (views * 0.1) + (likes * 3) + (uniqueReaderLikes * 15) + (uniqueReaders * 5) + (characters * 0.05);///for next version existance
  
  // Apply collaboration decay if more than one collaborator
  if (collaborators > 1) {
    gems = gems * (1 / Math.sqrt(collaborators));
  }
  
  // Round to 2 decimal places
  return Math.round(gems * 100) / 100;
};

/**
 * Apply collaboration decay to a value
 * @param {number} baseValue - Original value
 * @param {number} collaborators - Number of collaborators
 * @returns {number} Decayed value
 */
const applyCollaborationDecay = (baseValue, collaborators) => {
  if (collaborators <= 1) return baseValue;
  return baseValue * (1 / Math.sqrt(collaborators));
};

/**
 * Calculate total gems for a lineage (multiple concatenated segments)
 * @param {Array} lineage - Array of content objects
 * @returns {number} Total gems for the lineage
 */
const calculateLineageGems = (lineage) => {
  return lineage.reduce((total, segment) => {
    if (segment.published && segment.gemsEarned) {
      const collaborators = segment.contributors?.length || 1;
      const gems = collaborators > 1 ? 
        segment.gemsEarned * (1 / Math.sqrt(collaborators)) : 
        segment.gemsEarned;
      return total + gems;
    }
    return total;
  }, 0);
};

/**
 * Get gem display value with collaboration info
 * @param {Object} content - Content object
 * @returns {Object} Display info
 */
const getGemDisplayInfo = (content) => {
  if (!content.published || !content.gemsEarned) {
    return { value: 0, display: '0', hasDecay: false };
  }
  
  const collaborators = content.contributors?.length || 1;
  const rawValue = content.gemsEarned;
  const displayValue = collaborators > 1 ? 
    rawValue * (1 / Math.sqrt(collaborators)) : 
    rawValue;
  
  return {
    raw: rawValue,
    value: displayValue,
    display: displayValue.toFixed(2),
    hasDecay: collaborators > 1,
    collaborators,
    decayFactor: collaborators > 1 ? (1 / Math.sqrt(collaborators)).toFixed(3) : 1
  };
};

export {
  calculateGems,
  applyCollaborationDecay,
  calculateLineageGems,
  getGemDisplayInfo
};