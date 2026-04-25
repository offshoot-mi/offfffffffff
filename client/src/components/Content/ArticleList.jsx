// Rewrite/client/src/components/Content/ArticleList.jsx
import React from 'react';
import ArticleItem from './ArticleItem';
import LoadingSpinner from '../Common/LoadingSpinner';

const ArticleList = ({ articles, onContentUpdate, onContentDelete, loading }) => {
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!articles || articles.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        background: '#f8f9fa',
        borderRadius: '8px',
        color: '#666'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📝</div>
        <h3>No articles found</h3>
        <p>Be the first to create a new article!</p>
      </div>
    );
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <ArticleItem
            key={article.id}
            article={article}
            onContentUpdate={onContentUpdate}
            onContentDelete={onContentDelete}
            showPopularityScore={true}
        />
      ))}
    </div>
  );
};

export default ArticleList;