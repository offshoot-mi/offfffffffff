// Rewrite/client/src/components/Content/ArticleForm.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaSave, FaWindowClose, FaPaperPlane, FaSpinner, FaGem, FaCalculator, FaArrowUp } from 'react-icons/fa';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ArticleForm = ({
  parentContentId = null,
  onPostSuccess,
  onCancel,
  isEditMode = false,
  contentToEdit = null,
  onEditSuccess
}) => {
  const isReply = !!parentContentId && !isEditMode;
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [estimatedGems, setEstimatedGems] = useState(0);
  const [estimatedChainValue, setEstimatedChainValue] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [showEstimateDetails, setShowEstimateDetails] = useState(false);
  const { apiClient } = useAuth();

  // Normalize response from backend (add `id` field)
  const normalizeContent = (data) => {
    if (!data) return data;
    return { ...data, id: data.id || data._id };
  };

  useEffect(() => {
    if (isEditMode && contentToEdit) {
      setText(contentToEdit.text || '');
      if (!contentToEdit.parentContent) setTitle(contentToEdit.title || '');
    } else {
      setText('');
      setTitle('');
    }
  }, [isEditMode, contentToEdit]);

  // Calculate estimated gems based on content (UI only)
  useEffect(() => {
    if (text && text !== '<p><br></p>') {
      const plainText = text.replace(/<[^>]*>/g, '');
      const characters = plainText.replace(/\s/g, '').length;
      setCharacterCount(characters);
      
      let baseGems = characters * 0.05;
      let finalGems = baseGems;
      let chainValueEstimate = baseGems;
      
      if (isReply && parentContentId) {
        finalGems = baseGems * 0.7;
        chainValueEstimate = finalGems * 0.5;
      } else {
        finalGems = baseGems * 2.0;
      }
      
      setEstimatedGems(Math.round(finalGems * 100) / 100);
      setEstimatedChainValue(Math.round(chainValueEstimate * 100) / 100);
    } else {
      setEstimatedGems(0);
      setEstimatedChainValue(0);
      setCharacterCount(0);
    }
  }, [text, isReply, parentContentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text || text === '<p><br></p>') {
      setError(isEditMode ? "Content cannot be empty." : (isReply ? "Reply cannot be empty." : "Content cannot be empty."));
      return;
    }
    if (!isReply && !isEditMode && !title.trim()) {
      setError("Title cannot be empty for a new article.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditMode && contentToEdit) {
        const payload = { text };
        const { data } = await apiClient.put(`/content/${contentToEdit.id}`, payload);
        const normalized = normalizeContent(data);
        if (onEditSuccess) onEditSuccess(normalized);
      } else {
        const payload = {
          text,
          ...(isReply ? { parentContent: parentContentId } : { title: title.trim() }),
        };
        // characterCount is NOT sent – backend calculates it automatically
        const { data } = await apiClient.post('/content', payload);
        const normalized = normalizeContent(data);
        setText('');
        if (!isReply) setTitle('');
        if (onPostSuccess) onPostSuccess(normalized);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.error || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const showTitleField = !isReply && !isEditMode;

  const toolbarOptions = [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ 'align': [] }],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ];

  return (
    <form onSubmit={handleSubmit} className="article-form" style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>
      {error && <p style={{ color:'#d93025', marginBottom:'10px' }}>{error}</p>}

      {showTitleField && (
        <div className="form-group mb-3">
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter article title..."
            maxLength="150"
            required
            disabled={loading}
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              padding: '12px 10px',
              marginBottom: '1rem',
              border: 'none',
              borderBottom: '2px solid #ccc',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      <ReactQuill
        theme="snow"
        value={text}
        onChange={setText}
        modules={{ toolbar: toolbarOptions }}
        formats={[
          'header', 'bold', 'italic', 'underline', 'strike',
          'list', 'bullet', 'blockquote', 'code-block',
          'link', 'image', 'align', 'color', 'background'
        ]}
        placeholder={isEditMode ? 'Edit your content...' : (isReply ? 'Write your reply...' : 'Write your article content...')}
        style={{
          minHeight: '400px',
          background: '#fff',
          fontSize: '1rem',
          lineHeight: '1.6',
          padding: '15px',
          marginBottom: '1rem',
          borderRadius: '4px',
          boxShadow: '0 0 5px rgba(0,0,0,0.05)'
        }}
        readOnly={loading}
      />

      {/* Gem Estimate Display (unchanged) */}
      {!isEditMode && text && text !== '<p><br></p>' && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          marginBottom: '15px',
          overflow: 'hidden'
        }}>
          <div 
            onClick={() => setShowEstimateDetails(!showEstimateDetails)}
            style={{
              padding: '12px 15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              background: '#fff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaGem style={{ color: '#000', fontSize: '1rem' }} />
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  Estimated Value: {estimatedGems} gems
                </div>
                {estimatedChainValue > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                    <FaArrowUp style={{ color: '#4caf50' }} /> Chain impact: +{estimatedChainValue} gems to previous blocks
                  </div>
                )}
              </div>
            </div>
            <FaCalculator style={{ color: '#999' }} />
          </div>
          
          {showEstimateDetails && (
            <div style={{
              padding: '15px',
              background: '#f8f9fa',
              borderTop: '1px solid #e0e0e0',
              fontSize: '0.85rem'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Gem Calculation Breakdown</h4>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Characters ({characterCount}):</span>
                  <span>{(characterCount * 0.05).toFixed(2)} gems</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Views (estimated):</span>
                  <span>0 gems</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Likes (estimated):</span>
                  <span>0 gems</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>Unique Readers (estimated):</span>
                  <span>0 gems</span>
                </div>
              </div>
              <hr style={{ margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Base Value:</span>
                <span>{(characterCount * 0.05).toFixed(2)} gems</span>
              </div>
              {!isReply ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#4caf50' }}>
                  <span>🎉 First Version Bonus (2x):</span>
                  <span>+{(characterCount * 0.05).toFixed(2)} gems</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#ff9800' }}>
                  <span>Collaboration Decay (30% reduction):</span>
                  <span>-{(characterCount * 0.05 * 0.3).toFixed(2)} gems</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 'bold' }}>
                <span>Total Estimated:</span>
                <span style={{ color: '#FFD700' }}>{estimatedGems} gems</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent:'flex-end', gap:'10px' }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={loading}>
            <FaWindowClose style={{marginRight:'4px'}}/>Cancel
          </button>
        )}
        <button type="submit" className={`btn btn-sm ${isEditMode ? 'btn-success' : 'btn-primary'}`} 
                disabled={loading || (!text || text === '<p><br></p>') || (showTitleField && !title.trim())}>
          {loading ? <FaSpinner className="spin" style={{marginRight:'5px'}}/> :
            (isEditMode ? <><FaSave style={{marginRight:'4px'}}/>Save Changes</> :
             (isReply ? <><FaPaperPlane style={{marginRight:'4px'}}/>Post Reply</> :
             <><FaPaperPlane style={{marginRight:'4px'}}/>Post Article</>))}
        </button>
      </div>
    </form>
  );
};

export default ArticleForm;