// Rewrite/client/src/components/Content/NestedContent.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ArticleItem from './ArticleItem';
import LoadingSpinner from '../Common/LoadingSpinner';
import { FaGem } from 'react-icons/fa';

const NestedContent = ({ parentId }) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalGems, setTotalGems] = useState(0);
  const { apiClient } = useAuth();

  const fetchChildren = useCallback(async () => {
    if (!parentId) return;

    setLoading(true);
    setError(null);
    try {
       const { data } = await apiClient.get(`/content?parentContent=${parentId}&sortBy=createdAt_asc`);
       setChildren(data.articles || []);
       
       // Calculate total gems from all children
       const gemsTotal = (data.articles || []).reduce((sum, child) => {
         if (child.published && child.gemsEarned) {
           // Apply collaboration decay for display
           const collaborators = child.contributors?.length || 1;
           const displayGems = collaborators > 1 ? 
             child.gemsEarned * (1 / Math.sqrt(collaborators)) : 
             child.gemsEarned;
           return sum + displayGems;
         }
         return sum;
       }, 0);
       
       setTotalGems(Math.round(gemsTotal * 100) / 100);
    } catch (err) {
      console.error(`Failed to fetch children for ${parentId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [parentId, apiClient]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const handleChildUpdate = (updatedChild) => {
    setChildren(prevChildren =>
      prevChildren.map(child =>
        child.id === updatedChild.id ? updatedChild : child
      )
    );
    
    // Recalculate total gems
    const newTotal = children.reduce((sum, child) => {
      if (child.published && child.gemsEarned) {
        const collaborators = child.contributors?.length || 1;
        const displayGems = collaborators > 1 ? 
          child.gemsEarned * (1 / Math.sqrt(collaborators)) : 
          child.gemsEarned;
        return sum + displayGems;
      }
      return sum;
    }, 0);
    setTotalGems(Math.round(newTotal * 100) / 100);
  };

  const handleChildDelete = (deletedChildId) => {
    setChildren(prevChildren =>
      prevChildren.filter(child => child.id !== deletedChildId)
    );
  };

  if (loading) {
    return <div style={{paddingLeft: '20px', marginTop: '10px'}}><LoadingSpinner /></div>;
  }

  if (!children || children.length === 0) {
    return null;
  }

  return (
    <div className="nested-content-container" style={{ marginTop: '15px' }}>
      {/* Total Gems from Replies */}
      {totalGems > 0 && (
        <div className="nested-gems-total" style={{
          padding: '5px 15px',
          marginBottom: '10px',
          background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
          borderRadius: '4px',
          display: 'inline-block',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <FaGem style={{ color: '#FFD700', marginRight: '5px' }} />
          <span style={{ color: '#fff', fontSize: '0.9rem' }}>
            Total Gems from Replies: {totalGems}
          </span>
        </div>
      )}
      
      {error && <p className="error-message">{error}</p>}
      {children.map((child) => (
        <ArticleItem
            key={child.id}
            article={child}
            onContentUpdate={handleChildUpdate}
            onContentDelete={handleChildDelete}
            showPopularityScore={true}
        />
      ))}
    </div>
  );
};

export default NestedContent;