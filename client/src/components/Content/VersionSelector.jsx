// Rewrite/client/src/components/Content/VersionSelector.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';
import ArticleForm from './ArticleForm';
import { formatDistanceToNow } from 'date-fns';
import { 
  FaThumbsUp, FaRegThumbsUp, FaFlag, FaReply, FaPlusCircle, 
  FaCheckCircle, FaSpinner, FaTimes, FaGem, FaEye, FaUsers,
  FaChartLine, FaArrowUp, FaArrowDown, FaMinus 
} from 'react-icons/fa';

const VersionSelector = ({
  contextSegment,
  onSelectVersion,
  onClose,
  onContextSegmentUpdate,
  onNewVariationAdded,
  currentGemTotal,
  segmentGemValue
}) => {
  const [siblingVersions, setSiblingVersions] = useState([]);
  const [loadingSiblings, setLoadingSiblings] = useState(true);
  const [error, setError] = useState(null);
  const [showReplyFormForContext, setShowReplyFormForContext] = useState(false);
  const [showGlobalNewVariationForm, setShowGlobalNewVariationForm] = useState(false);
  const [selectedVersionForComparison, setSelectedVersionForComparison] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  const [contextLikeStatus, setContextLikeStatus] = useState({ count: 0, likedByUser: false });
  const [contextReportStatus, setContextReportStatus] = useState({ isReported: false, reportedByUser: false });
  const [loadingContextLike, setLoadingContextLike] = useState(false);
  const [loadingContextReport, setLoadingContextReport] = useState(false);

  const { apiClient, user, isAuthenticated } = useAuth();

  // Calculate gem value for a segment with collaboration decay
  const calculateGemValue = useCallback((segment) => {
    if (!segment?.published || !segment?.gemsEarned) return 0;
    const collaborators = segment.contributors?.length || 1;
    return collaborators > 1 ? 
      segment.gemsEarned * (1 / Math.sqrt(collaborators)) : 
      segment.gemsEarned;
  }, []);

  useEffect(() => {
    if (contextSegment) {
        setContextLikeStatus({
            count: contextSegment.likeCount || 0,
            likedByUser: isAuthenticated && contextSegment.likes ? contextSegment.likes.some(like => (typeof like === 'string' ? like : like.id) === user?.id) : false,
        });
        setContextReportStatus({
            isReported: contextSegment.isReported || false,
            reportedByUser: isAuthenticated && contextSegment.reports ? contextSegment.reports.some(report => (report.reporter === user?.id || report.reporter?._id === user?.id)) : false,
        });
    } else {
        setContextLikeStatus({ count: 0, likedByUser: false });
        setContextReportStatus({ isReported: false, reportedByUser: false });
    }
  }, [contextSegment, isAuthenticated, user]);

  const fetchSiblingVersions = useCallback(async () => {
    if (!contextSegment || !contextSegment.id) {
        setSiblingVersions([]);
        setLoadingSiblings(false);
        setError(null);
        return;
    }

    setLoadingSiblings(true);
    setError(null);

    try {
      const { data } = await apiClient.get(`/content/${contextSegment.id}/versions`);

      // Process versions with gem calculations
      const initializedVersions = (data || [])
        .filter(v => v.id !== contextSegment.id)
        .map(v => {
          const gemValue = calculateGemValue(v);
          const rawGems = v.gemsEarned || 0;
          const collaborators = v.contributors?.length || 1;
          
          return {
            ...v,
            likedByUser: isAuthenticated && v.likes ? v.likes.some(likeId => (typeof likeId === 'string' ? likeId : likeId.id) === user?.id) : false,
            currentLikeCount: v.likeCount || 0,
            reportedInUI: v.isReported || false,
            gemValue,
            rawGems,
            collaboratorsCount: collaborators,
            displayGems: gemValue.toFixed(2),
            views: v.views || 0,
            uniqueReaders: v.uniqueReaders?.length || 0,
            gemDifference: segmentGemValue ? gemValue - segmentGemValue : 0
          };
        });

      // Sort versions based on selected sort method
      const sortedVersions = [...initializedVersions].sort((a, b) => {
        switch(sortBy) {
          case 'gems':
            return b.gemValue - a.gemValue;
          case 'likes':
            return b.currentLikeCount - a.currentLikeCount;
          case 'views':
            return b.views - a.views;
          default:
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
      });

      setSiblingVersions(sortedVersions);
    } catch (err) {
      console.error("Failed to fetch sibling versions:", err);
      setError(err.response?.data?.error || "Could not load alternative versions.");
      setSiblingVersions([]);
    } finally {
      setLoadingSiblings(false);
    }
  }, [contextSegment, apiClient, isAuthenticated, user, sortBy, segmentGemValue, calculateGemValue]);

  useEffect(() => {
    fetchSiblingVersions();
  }, [fetchSiblingVersions, sortBy]);

  const handleLikeContextSegment = async (e) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated || !contextSegment) return alert("Please log in.");
    setLoadingContextLike(true);
    try {
        const { data } = await apiClient.post(`/content/${contextSegment.id}/like`);
        setContextLikeStatus({ count: data.likeCount, likedByUser: data.likes.some(like => (typeof like === 'string' ? like : like.id) === user?.id) });
        if (onContextSegmentUpdate) onContextSegmentUpdate({ ...contextSegment, likeCount: data.likeCount, likes: data.likes });
    } catch (err) { 
      console.error("Failed to like context segment:", err); 
      alert(err.response?.data?.error || "Like failed for context segment.");
    } finally { setLoadingContextLike(false); }
  };
  
  const handleReportContextSegment = async (e) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated || !contextSegment) return alert("Please log in.");
    if (contextReportStatus.isReported && contextReportStatus.reportedByUser) return alert("You already reported this segment.");
    setLoadingContextReport(true);
    try {
        const { data } = await apiClient.post(`/content/${contextSegment.id}/report`, { reason: "Reported from VersionSelector (context)" });
        setContextReportStatus({ isReported: data.isReported, reportedByUser: true });
        alert("Context segment reported.");
        if (onContextSegmentUpdate) onContextSegmentUpdate({ ...contextSegment, isReported: data.isReported, reports: [...(contextSegment.reports || []), {reporter: user?.id}] });
    } catch (err) { 
      console.error("Failed to report context segment:", err); 
      alert(err.response?.data?.error || "Report failed for context segment.");
    } finally { setLoadingContextReport(false); }
  };
  
  const handleReplyToContextSuccess = (newReply) => {
    setShowReplyFormForContext(false);
    if (onContextSegmentUpdate) onContextSegmentUpdate({ ...contextSegment, action: 'reply_to_context_in_versions', newReplyId: newReply.id });
  };

  const handleSiblingVersionItemClick = (sibling) => {
    if (onSelectVersion) {
      if (sibling.gemValue !== undefined && segmentGemValue !== undefined) {
        const diff = sibling.gemValue - segmentGemValue;
        const diffPercent = segmentGemValue > 0 ? ((diff / segmentGemValue) * 100).toFixed(1) : 0;
        
        const confirmMessage = `Switch to this version?\n\n` +
          `Current segment value: ${segmentGemValue.toFixed(2)} gems\n` +
          `New segment value: ${sibling.gemValue.toFixed(2)} gems\n` +
          `Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} gems (${diffPercent}%)\n\n` +
          `This will update the entire lineage from this point.`;
        
        if (window.confirm(confirmMessage)) {
          onSelectVersion(sibling.id);
        }
      } else {
        onSelectVersion(sibling.id);
      }
    }
  };

  const handlePreviewVersion = (sibling) => {
    setSelectedVersionForComparison(selectedVersionForComparison?.id === sibling.id ? null : sibling);
  };

  const handleToggleGlobalNewVariationForm = (e) => {
    if(e) e.stopPropagation();
    setShowGlobalNewVariationForm(prev => !prev);
  };

  const handleGlobalNewSiblingVariationPostSuccess = (newVariation) => {
    setShowGlobalNewVariationForm(false);
    fetchSiblingVersions();
    if (onNewVariationAdded) onNewVariationAdded(newVariation);
  };

  const getDifferenceDisplay = (difference) => {
    if (difference > 0) {
      return { icon: <FaArrowUp />, color: '#4caf50', text: `+${difference.toFixed(2)}` };
    } else if (difference < 0) {
      return { icon: <FaArrowDown />, color: '#f44336', text: difference.toFixed(2) };
    } else {
      return { icon: <FaMinus />, color: '#ff9800', text: '0.00' };
    }
  };

  if (!contextSegment) {
    return null;
  }

  const currentSegmentGemValue = segmentGemValue || calculateGemValue(contextSegment);

  return (
    <div className="version-selector card" style={{
      marginTop: '1rem', 
      background: '#ffffff', 
      border: '1px solid #e0e0e0', 
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '10px'
      }}>
        <h4 style={{
          margin: 0, 
          fontSize: '1.2rem', 
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaGem style={{ color: '#FFD700' }} /> Version Selector
          {currentSegmentGemValue > 0 && (
            <span style={{
              marginLeft: '10px',
              background: '#f5f5f5',
              color: '#FFD700',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'normal',
              border: '1px solid #FFD700'
            }}>
              Current: {currentSegmentGemValue.toFixed(2)} gems
            </span>
          )}
        </h4>
        {onClose && (
          <button 
            onClick={onClose} 
            className="btn btn-sm btn-link" 
            style={{
              padding: '0 5px', 
              fontSize: '1.2rem', 
              lineHeight: 1, 
              color: '#999'
            }} 
            title="Close Version Panel"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Current Lineage Total */}
      {currentGemTotal !== undefined && (
        <div style={{
          background: '#f9f9f9',
          padding: '12px 15px',
          borderRadius: '6px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #e0e0e0'
        }}>
          <span style={{ color: '#666' }}>
            <FaChartLine style={{ marginRight: '8px', color: '#666' }} />
            Total Article Gems:
          </span>
          <span style={{ 
            color: '#FFD700', 
            fontWeight: 'bold', 
            fontSize: '1.1rem'
          }}>
            {currentGemTotal.toFixed(2)}
          </span>
        </div>
      )}

      {/* Current Segment Actions */}
      <div className="context-segment-actions-box" style={{
        padding: '15px', 
        background: '#f5f5f5', 
        border: '1px solid #ddd', 
        borderRadius: '6px', 
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <p style={{
            fontWeight: 600, 
            margin: 0, 
            fontSize: '0.95rem', 
            color: '#333'
          }}>
            Current Segment
          </p>
          
          {currentSegmentGemValue > 0 && (
            <span style={{
              background: '#fff3e0',
              color: '#FFD700',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              border: '1px solid #FFD700'
            }}>
              {currentSegmentGemValue.toFixed(2)} gems
            </span>
          )}
        </div>
        
        <em style={{
          display: 'block', 
          fontWeight: 400, 
          fontSize: '0.9rem', 
          color: '#666', 
          marginBottom: '10px',
          padding: '8px',
          background: '#fff',
          borderRadius: '4px',
          border: '1px solid #eee'
        }}>
          "{contextSegment.text.substring(0,100)}{contextSegment.text.length > 100 ? '...' : ''}"
        </em>
        
        {contextSegment.published && (
          <div style={{
            display: 'flex',
            gap: '15px',
            marginBottom: '15px',
            padding: '8px 12px',
            background: '#fff',
            borderRadius: '6px',
            color: '#666',
            flexWrap: 'wrap',
            border: '1px solid #eee'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaGem style={{ color: '#FFD700' }} />
              {currentSegmentGemValue.toFixed(2)} gems
              {contextSegment.contributors?.length > 1 && 
                ` (shared with ${contextSegment.contributors.length})`}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaEye style={{ color: '#666' }} />
              {contextSegment.views || 0} views
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaUsers style={{ color: '#666' }} />
              {contextSegment.uniqueReaders?.length || 0} readers
            </span>
          </div>
        )}
        
        <div className="actions-for-context" style={{
          display: 'flex', 
          gap: '10px', 
          flexWrap: 'wrap', 
          alignItems: 'center'
        }}>
          <button 
            onClick={handleLikeContextSegment} 
            className="btn btn-sm btn-outline-primary" 
            disabled={!isAuthenticated || loadingContextLike}
            style={{ fontSize: '0.85rem' }}
          >
            {loadingContextLike ? 
              <FaSpinner className="icon spin"/> : 
              (contextLikeStatus.likedByUser ? <FaThumbsUp/> : <FaRegThumbsUp />)
            } 
            Like ({contextLikeStatus.count})
          </button>
          <button 
            onClick={handleReportContextSegment} 
            className="btn btn-sm btn-outline-danger" 
            disabled={!isAuthenticated || loadingContextReport || (contextReportStatus.isReported && contextReportStatus.reportedByUser)}
            style={{ fontSize: '0.85rem' }}
          >
            {loadingContextReport ? 
              <FaSpinner className="icon spin"/> : 
              <FaFlag />
            } 
            {(contextReportStatus.isReported && contextReportStatus.reportedByUser) ? 'You Reported' : (contextReportStatus.isReported ? 'Flagged' : 'Report')}
          </button>
          {isAuthenticated && (
            <button 
              onClick={() => setShowReplyFormForContext(prev => !prev)} 
              className="btn btn-sm btn-outline-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              <FaReply /> {showReplyFormForContext ? 'Cancel Reply' : 'Reply'}
            </button>
          )}
        </div>
        
        {showReplyFormForContext && (
          <div style={{
            marginTop: '15px', 
            padding: '15px', 
            background: '#fff', 
            borderRadius: '6px', 
            border: '1px solid #ddd'
          }}>
            <h6 style={{
              marginTop: 0, 
              marginBottom: '10px', 
              fontSize: '0.9rem',
              color: '#333'
            }}>
              Your Reply
            </h6>
            <ArticleForm
              parentContentId={contextSegment.id}
              onPostSuccess={handleReplyToContextSuccess}
              onCancel={() => setShowReplyFormForContext(false)}
            />
          </div>
        )}
      </div>

      {/* Alternative Versions Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h5 style={{
          margin: 0,
          fontSize: '1rem', 
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FaGem style={{ color: '#FFD700' }} /> Alternative Versions ({siblingVersions.length})
        </h5>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="form-select form-select-sm"
          style={{ width: '120px', fontSize: '0.8rem' }}
        >
          <option value="date">Sort by Date</option>
          <option value="gems">Sort by Gems</option>
          <option value="likes">Sort by Likes</option>
          <option value="views">Sort by Views</option>
        </select>
      </div>

      {loadingSiblings && <LoadingSpinner />}
      {error && <p className="error-message text-center" style={{ color: '#d32f2f' }}>{error}</p>}

      {!loadingSiblings && !error && siblingVersions.length > 0 && (
        <div style={{ marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
          {siblingVersions.map(sibling => {
            const diff = sibling.gemDifference;
            const diffDisplay = getDifferenceDisplay(diff);
            
            return (
              <div
                key={sibling.id}
                style={{ 
                  border: selectedVersionForComparison?.id === sibling.id 
                    ? '2px solid #2196f3' 
                    : '1px solid #ddd',
                  padding: '15px',
                  marginBottom: '12px',
                  borderRadius: '6px',
                  background: selectedVersionForComparison?.id === sibling.id ? '#f0f7ff' : '#fff',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#4caf50';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = selectedVersionForComparison?.id === sibling.id ? '#2196f3' : '#ddd';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: sibling.published ? '#4caf50' : '#9e9e9e',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      {sibling.published ? 'Published' : 'Draft'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                      By {sibling.author?.username || 'Unknown'}
                    </span>
                  </div>
                  
                  {sibling.published && sibling.displayGems && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#f5f5f5',
                      padding: '2px 10px',
                      borderRadius: '12px'
                    }}>
                      <FaGem style={{ color: '#FFD700' }} />
                      <span style={{ fontWeight: 'bold', color: '#333' }}>{sibling.displayGems}</span>
                      <span style={{ 
                        color: diffDisplay.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontSize: '0.75rem'
                      }}>
                        {diffDisplay.icon} {diffDisplay.text}
                      </span>
                    </div>
                  )}
                </div>

                <p style={{ 
                  margin: '0 0 10px 0', 
                  fontSize: '0.85rem',
                  color: '#555',
                  lineHeight: '1.5'
                }}>
                  {sibling.text.substring(0, 120)}{sibling.text.length > 120 ? '...' : ''}
                </p>

                <div style={{
                  display: 'flex',
                  gap: '15px',
                  marginBottom: '12px',
                  fontSize: '0.8rem',
                  color: '#666',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <FaThumbsUp /> {sibling.currentLikeCount}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <FaEye /> {sibling.views}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <FaUsers /> {sibling.uniqueReaders}
                  </span>
                  <span style={{ color: '#999' }}>
                    {formatDistanceToNow(new Date(sibling.createdAt), { addSuffix: true })}
                  </span>
                  {sibling.collaboratorsCount > 1 && (
                    <span style={{ color: '#ff9800' }}>
                      {sibling.collaboratorsCount} collaborators
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewVersion(sibling);
                    }}
                    className="btn btn-sm btn-outline-info"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                  >
                    {selectedVersionForComparison?.id === sibling.id ? 'Hide Preview' : 'Preview'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSiblingVersionItemClick(sibling);
                    }}
                    className="btn btn-sm btn-success"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '2px 12px',
                      flex: 1
                    }}
                  >
                    <FaCheckCircle style={{ marginRight: '4px' }} />
                    Select This Version
                  </button>
                </div>

                {selectedVersionForComparison?.id === sibling.id && (
                  <div style={{
                    marginTop: '15px',
                    padding: '15px',
                    background: '#fff',
                    borderRadius: '6px',
                    border: '1px solid #2196f3'
                  }}>
                    <h6 style={{ 
                      marginTop: 0, 
                      marginBottom: '10px', 
                      color: '#2196f3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.9rem'
                    }}>
                      <FaEye /> Version Preview
                    </h6>
                    
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '10px',
                      background: '#f9f9f9',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      border: '1px solid #eee'
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: sibling.text }} />
                    </div>
                    
                    {sibling.published && currentSegmentGemValue > 0 && (
                      <div style={{
                        marginTop: '15px',
                        padding: '12px',
                        background: '#f5f5f5',
                        borderRadius: '6px'
                      }}>
                        <h6 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#333' }}>
                          Gem Comparison
                        </h6>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '15px'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>Current</div>
                            <div style={{ 
                              fontSize: '1rem', 
                              fontWeight: 'bold',
                              color: '#333'
                            }}>
                              {currentSegmentGemValue.toFixed(2)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>This Version</div>
                            <div style={{ 
                              fontSize: '1rem', 
                              fontWeight: 'bold',
                              color: '#333'
                            }}>
                              {sibling.gemValue.toFixed(2)}
                            </div>
                          </div>
                          <div style={{ 
                            gridColumn: 'span 2',
                            textAlign: 'center',
                            padding: '8px',
                            background: '#fff',
                            borderRadius: '4px'
                          }}>
                            <span style={{ color: '#666' }}>Difference: </span>
                            <span style={{ 
                              color: diffDisplay.color,
                              fontWeight: 'bold',
                              fontSize: '0.95rem'
                            }}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(2)} gems
                              {currentSegmentGemValue > 0 && 
                                ` (${((diff / currentSegmentGemValue) * 100).toFixed(1)}%)`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loadingSiblings && !error && siblingVersions.length === 0 && ( 
        <div style={{
          padding: '30px',
          textAlign: 'center',
          background: '#f9f9f9',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px dashed #ddd'
        }}>
          <FaGem style={{ fontSize: '2rem', color: '#ccc', marginBottom: '10px' }} />
          <p style={{ color: '#999' }}>
            No other versions found for this segment.
          </p>
        </div>
      )}

      {!loadingSiblings && contextSegment && contextSegment.parentContent && (
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleToggleGlobalNewVariationForm} 
            className="btn btn-outline-secondary"
            style={{ 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#fff',
              border: '1px solid #ccc',
              color: '#333'
            }}
          >
            <FaPlusCircle /> 
            {showGlobalNewVariationForm ? 'Cancel' : 'Add New Sibling Variation'}
          </button>
          
          {showGlobalNewVariationForm && (
            <div style={{
              marginTop: '15px', 
              padding: '15px', 
              background: '#f9f9f9', 
              borderRadius: '6px', 
              border: '1px solid #ddd'
            }}>
              <h6 style={{
                marginTop: 0, 
                marginBottom: '10px', 
                fontSize: '0.9rem',
                color: '#333'
              }}>
                Create New Version
              </h6>
              <ArticleForm
                parentContentId={contextSegment.parentContent}
                onPostSuccess={handleGlobalNewSiblingVariationPostSuccess}
                onCancel={() => setShowGlobalNewVariationForm(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VersionSelector;