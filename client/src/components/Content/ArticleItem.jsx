// Add this state at the top with other states
const [isPublishing, setIsPublishing] = useState(false);

// Add this function before return
const handlePublish = async () => {
  if (!window.confirm('Publishing this version will make it public and award gems. Continue?')) return;
  
  setIsPublishing(true);
  setError(null);
  
  try {
    const { data } = await apiClient.post(`/content/${article.id}/publish`, {
      versionNumber: article.currentVersion || 1
    });
    
    setActionSuccess(`Published! Earned ${data.gemsEarned.toFixed(2)} gems!`);
    
    // Update the article in the parent
    if (onContentUpdate) {
      onContentUpdate({
        ...article,
        published: true,
        gemsEarned: data.gemsEarned,
        totalGems: data.totalGems
      });
    }
    
    setTimeout(() => setActionSuccess(''), 3000);
  } catch (err) {
    setError(err.response?.data?.error || 'Failed to publish');
  } finally {
    setIsPublishing(false);
  }
};

// Add this state
const [actionSuccess, setActionSuccess] = useState('');

// Add this to the gem display bar to show chain value
{article.published && (
  <div className="gem-display-bar" style={{
    background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)',
    padding: '8px 15px',
    borderRadius: '4px',
    marginBottom: '10px',
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <FaGem style={{ color: '#FFD700' }} />
      <span style={{ color: '#fff', fontWeight: 'bold' }}>{getGemDisplayValue()} gems</span>
    </div>
    {/* Add chain value */}
    {article.currentVersionData?.chainValue && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <FaLink style={{ color: '#FFD700' }} />
        <span style={{ color: '#fff' }}>Chain: {article.currentVersionData.chainValue.toFixed(2)}</span>
      </div>
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <FaEye style={{ color: '#64b5f6' }} />
      <span style={{ color: '#fff' }}>{gemStats.views} views</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <FaUsers style={{ color: '#ba68c8' }} />
      <span style={{ color: '#fff' }}>{gemStats.uniqueReaders} unique readers</span>
    </div>
    {gemStats.collaborators > 1 && (
      <span style={{ color: '#ffa726', fontSize: '0.85rem' }}>
        {gemStats.collaborators} collaborators (value reduced)
      </span>
    )}
  </div>
)}

// Add publish button in the actions section (add this after the Like button)
{isAuthor && !article.published && (
  <button onClick={handlePublish} className="btn btn-sm btn-success" disabled={isPublishing}>
    {isPublishing ? <FaSpinner className="spin" /> : <FaGem />} 
    Publish & Earn Gems
  </button>
)}

// Add actionSuccess display
{actionSuccess && (
  <div className="success-message" style={{ color: '#4caf50', marginTop: '5px', fontSize: '0.8rem' }}>
    {actionSuccess}
  </div>
)}