// Rewrite/client/src/components/Content/ReadPageArticleView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import VersionSelector from './VersionSelector';
import LoadingSpinner from '../Common/LoadingSpinner';
import ArticleForm from './ArticleForm';
import ChainValueDisplay from './ChainValueDisplay'; // Ensure this exists
import { format, formatDistanceToNow } from 'date-fns';
import {
  FaThumbsUp, FaRegThumbsUp, FaReply, FaSpinner, FaFlag, FaRegFlag,
  FaListUl, FaTimes, FaEdit, FaSave, FaWindowClose, FaBookmark,
  FaRegBookmark, FaPrint, FaGem, FaEye, FaUsers, FaHistory,
  FaChevronDown, FaChevronUp, FaCalculator, FaLink, FaArrowUp,
  FaArrowDown, FaMinus, FaCube
} from 'react-icons/fa';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';

// ==================== PrintedVersion Component (unchanged) ====================
const PrintedVersion = ({ lineage, onClose }) => {
  const generateStoryHTML = () => {
    if (!lineage || lineage.length === 0) return '';
    const fullStory = lineage.map((segment, index) => {
      return `<span class="segment-inline">${segment.text}<sup style="color: #666; font-weight: bold; margin-left: 1px;">[${index + 1}]</sup></span>`;
    }).join(' ');
    const citations = lineage.map((segment, index) => {
      const author = segment.author?.username || 'Anonymous';
      const date = segment.createdAt ? format(new Date(segment.createdAt), 'MM/dd/yyyy') : 'N/A';
      const likes = segment.likeCount || 0;
      return `
        <div class="citation-row" style="display: flex; gap: 10px; font-size: 0.85rem; color: #444; border-bottom: 1px solid #ddd; padding: 4px 0;">
          <span style="min-width: 25px; font-weight: bold;">[${index + 1}]</span>
          <span style="flex: 1;"><strong>${author}</strong> &bull; ${date} &bull; ${likes} Likes</span>
        </div>
      `;
    }).join('');
    return `
      <div class="story-body" style="text-align: justify; margin-bottom: 50px;">
        ${fullStory}
      </div>
      <div class="citation-footer" style="margin-top: 40px; border-top: 1px solid #999; padding-top: 20px;">
        <h4 style="text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px; color: #222; margin-bottom: 15px;">Sources & Contributions</h4>
        ${citations}
      </div>
    `;
  };

  return (
    <div className="printed-version-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(30, 30, 30, 0.9)', zIndex: 10000,
      display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '40px 20px'
    }}>
      <div className="paper-controls" style={{
        position: 'fixed', top: '20px', right: '40px', display: 'flex', gap: '10px'
      }}>
        <button onClick={() => window.print()} className="btn btn-secondary"><FaPrint /> Print</button>
        <button onClick={onClose} className="btn btn-dark"><FaTimes /></button>
      </div>

      <div className="grey-paper-document" style={{
        width: '100%', maxWidth: '800px',
        backgroundColor: '#f4f4f4',
        backgroundImage: 'linear-gradient(to bottom, #f4f4f4 0%, #e9e9e9 100%)',
        padding: '60px 80px',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        minHeight: '29.7cm',
        fontFamily: '"Georgia", serif',
        color: '#333',
        lineHeight: '1.8',
        position: 'relative',
        border: '1px solid #d1d1d1'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          opacity: 0.03, pointerEvents: 'none',
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/pulp.png")'
        }}></div>

        <header style={{ textAlign: 'center', marginBottom: '60px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#111' }}>{lineage[0]?.title || 'Untitled Narrative'}</h1>
          <p style={{ fontStyle: 'italic', color: '#666' }}>Published via Collaborative Lineage Engine</p>
        </header>

        <main
          style={{ position: 'relative', zIndex: 1 }}
          dangerouslySetInnerHTML={{ __html: generateStoryHTML() }}
        />

        <footer style={{ marginTop: 'auto', textAlign: 'center', fontSize: '0.8rem', color: '#888', paddingTop: '40px' }}>
          Document generated on {format(new Date(), 'PPPP')}
        </footer>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .grey-paper-document, .grey-paper-document * { visibility: visible; }
          .grey-paper-document {
            position: absolute; left: 0; top: 0; width: 100%; 
            margin: 0 !important; padding: 1cm !important;
            box-shadow: none !important; background: #f4f4f4 !important;
            -webkit-print-color-adjust: exact;
          }
          .paper-controls { display: none !important; }
        }
        .segment-inline p { display: inline; margin: 0; }
      `}</style>
    </div>
  );
};

// ==================== Enhanced Segment Display ====================
const LineageSegmentDisplay = ({ content, color, onSegmentClick, isActiveForActions, showGemDetails = false, index, totalSegments, chainValue }) => {
  const textToDisplay = content?.text || "[Content not available]";
  const calculateAppreciation = () => {
    if (!content?.published || !content?.gemsEarned || !chainValue) return 0;
    return chainValue - content.gemsEarned;
  };
  const appreciation = calculateAppreciation();
  const blockNumber = index + 1;
  const isLastBlock = blockNumber === totalSegments;

  return (
    <div style={{ position: 'relative', display: 'inline-block', margin: '4px 2px' }}>
      <span
        className="lineage-segment"
        style={{
          backgroundColor: color,
          border: isActiveForActions ? '3px solid #0056b3' : '1px solid rgba(0,0,0,0.1)',
          padding: '8px 12px',
          display: 'inline-block',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isActiveForActions ? '0 0 8px rgba(0,86,179,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
          transform: isActiveForActions ? 'scale(1.01)' : 'scale(1)',
          position: 'relative'
        }}
        onClick={() => onSegmentClick(content)}
        title={`Block #${blockNumber} - Current value: ${chainValue?.toFixed(2) || 0} gems`}
      >
        <span style={{
          position: 'absolute',
          top: '-10px',
          left: '5px',
          background: '#333',
          color: '#FFD700',
          padding: '2px 6px',
          borderRadius: '10px',
          fontSize: '0.6rem',
          fontWeight: 'bold',
          zIndex: 5
        }}>
          #{blockNumber}
        </span>
        <span dangerouslySetInnerHTML={{ __html: textToDisplay }} />
      </span>
      {content.published && content.gemsEarned > 0 && (
        <span style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: isLastBlock ? '#4caf50' : '#FFD700',
          borderRadius: '50%',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#000',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          border: '2px solid #fff'
        }}>
          {isLastBlock ? '⛏️' : '💎'}
        </span>
      )}
      {showGemDetails && chainValue > 0 && (
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#333',
          color: '#FFD700',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          border: '1px solid #FFD700',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FaLink /> {chainValue.toFixed(2)} gems
          </div>
          {appreciation > 0 && (
            <div style={{ color: '#4caf50', fontSize: '0.7rem' }}>
              +{appreciation.toFixed(2)} from later blocks
            </div>
          )}
          {isLastBlock && <div style={{ color: '#4caf50', fontSize: '0.7rem' }}>⛏️ Latest Block</div>}
        </div>
      )}
    </div>
  );
};

// ==================== Main Component ====================
const ReadPageArticleView = ({
  initialLineage: propInitialLineage,
  rootArticleId: propRootArticleId,
  onLineageUpdateFromParent
}) => {
  const { articleId: paramArticleId } = useParams();
  const rootArticleId = propRootArticleId || paramArticleId;
  const [currentLineage, setCurrentLineage] = useState([]);
  const [activeSegmentForActions, setActiveSegmentForActions] = useState(null);
  const [showVersionSelectorFor, setShowVersionSelectorFor] = useState(null);
  const [isReplyingToActiveSegment, setIsReplyingToActiveSegment] = useState(false);
  const [isEditingActiveSegment, setIsEditingActiveSegment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({ type: null, id: null });
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
  const [isCurrentLineageSaved, setIsCurrentLineageSaved] = useState(false);
  const [showPrintedVersion, setShowPrintedVersion] = useState(false);
  const [selectedVersionHistory, setSelectedVersionHistory] = useState([]);
  const [showDetailedStats, setShowDetailedStats] = useState(true);
  const [showChainVisualization, setShowChainVisualization] = useState(true);

  // Chain value stats
  const [chainValues, setChainValues] = useState({});
  const [chainValue, setChainValue] = useState(0);
  const [blockValues, setBlockValues] = useState({});
  const [miningRewards, setMiningRewards] = useState({});
  const [totalViews, setTotalViews] = useState(0);
  const [totalUniqueReaders, setTotalUniqueReaders] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);

  const { apiClient, user, isAuthenticated } = useAuth();
  const location = useLocation();
  const segmentColors = ['#E6F2FF', '#FFF9E6', '#E6FFEB', '#FFEEF0', '#E6FFFA', '#F5E6FF'];

  // ========== Normalization helper ==========
  const normalizeContent = useCallback((item) => {
    if (!item) return null;
    return {
      ...item,
      id: item.id || item._id,
    };
  }, []);

  // ========== Chain Value Calculations ==========
  const calculateSegmentChainValue = useCallback((segment, index, allSegments) => {
    if (segment?.currentVersionData?.chainValue !== undefined) return segment.currentVersionData.chainValue;
    if (segment?.chainValues && segment.chainValues[segment.currentVersion || 1]) return segment.chainValues[segment.currentVersion || 1];
    if (!segment?.published || !segment?.gemsEarned) return 0;
    let value = segment.gemsEarned;
    for (let i = index + 1; i < allSegments.length; i++) {
      const laterSegment = allSegments[i];
      if (laterSegment && laterSegment.gemsEarned) {
        const distance = i - index;
        const bonus = laterSegment.gemsEarned * (1 / Math.pow(2, distance));
        value += bonus;
      }
    }
    return Math.round(value * 100) / 100;
  }, []);

  const calculateMiningReward = useCallback((segment, index, allSegments) => {
    if (segment?.currentVersionData?.miningReward !== undefined) return segment.currentVersionData.miningReward;
    if (segment?.miningRewards && segment.miningRewards[segment.currentVersion || 1]) return segment.miningRewards[segment.currentVersion || 1];
    if (!segment?.published || !segment?.gemsEarned) return 0;
    const baseReward = segment.gemsEarned * 0.1;
    let fees = 0;
    for (let i = 0; i < index; i++) {
      const prevSegment = allSegments[i];
      if (prevSegment && prevSegment.gemsEarned) fees += prevSegment.gemsEarned * 0.01;
    }
    return Math.round((baseReward + fees) * 100) / 100;
  }, []);

  const calculateTotalChainValue = useCallback((lineage) => {
    if (!lineage || lineage.length === 0) return 0;
    let total = 0;
    for (let i = 0; i < lineage.length; i++) total += calculateSegmentChainValue(lineage[i], i, lineage);
    return Math.round(total * 100) / 100;
  }, [calculateSegmentChainValue]);

  const calculateBlockchainStats = useCallback((lineage) => {
    if (!lineage || lineage.length === 0) {
      setChainValue(0);
      setChainValues({});
      setBlockValues({});
      setMiningRewards({});
      setTotalViews(0);
      setTotalUniqueReaders(0);
      setTotalCharacters(0);
      return 0;
    }
    let views = 0, chars = 0;
    const allReaders = new Set();
    const chainValueMap = {}, blockValueMap = {}, miningRewardMap = {};
    for (let i = 0; i < lineage.length; i++) {
      const segment = lineage[i];
      const chainVal = calculateSegmentChainValue(segment, i, lineage);
      const miningReward = calculateMiningReward(segment, i, lineage);
      chainValueMap[segment.id] = chainVal;
      blockValueMap[segment.id] = {
        value: chainVal,
        raw: segment.gemsEarned || 0,
        index: i + 1,
        author: segment.author?.username,
        isLastBlock: i === lineage.length - 1,
        appreciation: chainVal - (segment.gemsEarned || 0)
      };
      miningRewardMap[segment.id] = miningReward;
      views += segment.views || 0;
      chars += segment.characterCount || 0;
      (segment.uniqueReaders || []).forEach(reader => allReaders.add(reader.id || reader));
    }
    const totalChain = Object.values(chainValueMap).reduce((sum, val) => sum + val, 0);
    setChainValues(chainValueMap);
    setChainValue(Math.round(totalChain * 100) / 100);
    setBlockValues(blockValueMap);
    setMiningRewards(miningRewardMap);
    setTotalViews(views);
    setTotalUniqueReaders(allReaders.size);
    setTotalCharacters(chars);
    return totalChain;
  }, [calculateSegmentChainValue, calculateMiningReward]);

  // ========== Helper Functions ==========
  const clearActionMessages = useCallback(() => {
    setActionError('');
    setActionSuccess('');
  }, []);

  const handleSegmentDataChangeInLineage = useCallback((updatedSegmentData) => {
    setCurrentLineage(current => {
      const newLineage = current.map(segment =>
        segment.id === updatedSegmentData.id ? { ...segment, ...updatedSegmentData } : segment
      );
      calculateBlockchainStats(newLineage);
      if (onLineageUpdateFromParent) onLineageUpdateFromParent(newLineage);
      return newLineage;
    });
    if (updatedSegmentData.action?.includes('versions')) refreshLineageAndSetActive(updatedSegmentData.id);
  }, [onLineageUpdateFromParent, calculateBlockchainStats]);

  const checkIfLineageIsSaved = useCallback(async (lineageToCheck) => {
    if (!isAuthenticated || !lineageToCheck || lineageToCheck.length === 0) {
      setIsCurrentLineageSaved(false);
      return;
    }
    try {
      const { data: savedItems } = await apiClient.get('/users/me/saved-articles');
      const currentPathIdsString = lineageToCheck.map(s => s.id).join(',');
      const found = savedItems.some(item =>
        item.lineagePathIds?.map(p => typeof p === 'string' ? p : p._id).join(',') === currentPathIdsString
      );
      setIsCurrentLineageSaved(found);
    } catch (err) {
      console.error("Error checking if lineage is saved:", err);
      setIsCurrentLineageSaved(false);
    }
  }, [apiClient, isAuthenticated]);

  // ========== Data Fetching with normalization ==========
  const fetchAndSetLineage = useCallback(async () => {
    if (!rootArticleId) {
      setError("Article ID not provided.");
      setLoading(false);
      setCurrentLineage([]);
      return;
    }
    setLoading(true);
    setError(null);
    clearActionMessages();
    setActiveSegmentForActions(null);
    setShowVersionSelectorFor(null);
    setIsReplyingToActiveSegment(false);
    setIsEditingActiveSegment(false);

    try {
      const response = await apiClient.get(`/content/${rootArticleId}/lineage`);
      console.log('Lineage API response:', response.data);

      let lineageData = [];
      // Handle different response structures
      if (response.data && Array.isArray(response.data)) {
        lineageData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        lineageData = response.data.data;
      } else if (response.data && response.data.id) {
        lineageData = [response.data];
      } else if (Array.isArray(response.data)) {
        lineageData = response.data;
      }

      // NORMALIZE: add 'id' field from '_id'
      lineageData = lineageData.map(normalizeContent).filter(Boolean);

      // Filter out invalid segments
      lineageData = lineageData.filter(s => s && s.id && typeof s.text === 'string');
      console.log('Processed lineage data length:', lineageData.length);

      setCurrentLineage(lineageData);
      if (lineageData.length === 0) {
        setError(`No content found for this lineage. API returned: ${JSON.stringify(response.data)}`);
      } else {
        const totalChain = calculateBlockchainStats(lineageData);
        console.log('Total chain value:', totalChain);
        setSelectedVersionHistory(prev => [
          ...prev,
          {
            timestamp: new Date(),
            lineage: lineageData,
            chainValue: totalChain || 0,
            blockCount: lineageData.length
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch lineage:", err);
      setError(err.response?.data?.error || `Could not load content. Error: ${err.message}`);
      setCurrentLineage([]);
    } finally {
      setLoading(false);
    }
  }, [rootArticleId, apiClient, clearActionMessages, calculateBlockchainStats, normalizeContent]);

  useEffect(() => {
    if (propInitialLineage?.length > 0 && !location.state?.initialPathIds) {
      const normalized = propInitialLineage
        .map(normalizeContent)
        .filter(s => s && s.id && typeof s.text === 'string');
      setCurrentLineage(normalized);
      calculateBlockchainStats(normalized);
      setLoading(false);
    } else {
      fetchAndSetLineage();
    }
  }, [fetchAndSetLineage, propInitialLineage, location.state?.initialPathIds, calculateBlockchainStats, normalizeContent]);

  useEffect(() => {
    if (currentLineage?.length > 0) checkIfLineageIsSaved(currentLineage);
    else setIsCurrentLineageSaved(false);
  }, [currentLineage, checkIfLineageIsSaved]);

  // ========== Event Handlers ==========
  const handleSegmentClickForActionsPanel = (segment) => {
    if (!segment || !segment.id) return;
    clearActionMessages();
    if (activeSegmentForActions?.id === segment.id && !isReplyingToActiveSegment && !isEditingActiveSegment && !showVersionSelectorFor) {
      setActiveSegmentForActions(null);
    } else {
      setActiveSegmentForActions(segment);
    }
    setIsReplyingToActiveSegment(false);
    setIsEditingActiveSegment(false);
    setShowVersionSelectorFor(null);
  };

  const refreshLineageAndSetActive = useCallback((actedUponSegmentId = null) => {
    if (!rootArticleId) return;
    setLoading(true);
    clearActionMessages();
    apiClient.get(`/content/${rootArticleId}/lineage`)
      .then(response => {
        let refreshedLineage = [];
        if (response.data && Array.isArray(response.data)) refreshedLineage = response.data;
        else if (response.data && response.data.data && Array.isArray(response.data.data)) refreshedLineage = response.data.data;
        else if (response.data && response.data.id) refreshedLineage = [response.data];
        // Normalize
        refreshedLineage = refreshedLineage.map(normalizeContent).filter(Boolean);
        refreshedLineage = refreshedLineage.filter(s => s && s.id && typeof s.text === 'string');
        setCurrentLineage(refreshedLineage);
        calculateBlockchainStats(refreshedLineage);
        if (onLineageUpdateFromParent) onLineageUpdateFromParent(refreshedLineage);
        if (actedUponSegmentId) {
          const newActive = refreshedLineage.find(s => s.id === actedUponSegmentId);
          setActiveSegmentForActions(newActive || null);
        }
      })
      .catch(err => {
        console.error("Error refreshing lineage:", err);
        setError("Could not refresh content.");
      })
      .finally(() => setLoading(false));
  }, [apiClient, rootArticleId, onLineageUpdateFromParent, clearActionMessages, calculateBlockchainStats, normalizeContent]);

  const handleLikeActiveSegment = useCallback(async () => {
    if (!activeSegmentForActions || !isAuthenticated) return;
    setActionLoading({ type: 'like', id: activeSegmentForActions.id });
    clearActionMessages();
    try {
      const { data } = await apiClient.post(`/content/${activeSegmentForActions.id}/like`);
      const updatedSegment = {
        ...activeSegmentForActions,
        likeCount: data.likeCount,
        likes: data.likes
      };
      setActiveSegmentForActions(updatedSegment);
      handleSegmentDataChangeInLineage(updatedSegment);
    } catch (err) {
      setActionError(err.response?.data?.error || "Like failed.");
    } finally {
      setActionLoading({ type: null, id: null });
    }
  }, [apiClient, isAuthenticated, activeSegmentForActions, handleSegmentDataChangeInLineage, clearActionMessages]);

  const handleToggleReportActiveSegment = useCallback(async () => {
    if (!activeSegmentForActions || !isAuthenticated) return;
    setActionLoading({ type: 'report', id: activeSegmentForActions.id });
    clearActionMessages();
    const currentUserHasReported = (activeSegmentForActions.reports || [])
      .some(r => (r.reporter === user.id || r.reporter?._id === user.id));
    try {
      let response;
      if (currentUserHasReported) {
        response = await apiClient.delete(`/content/${activeSegmentForActions.id}/report`);
        setActionSuccess("Your report has been removed.");
      } else {
        response = await apiClient.post(`/content/${activeSegmentForActions.id}/report`, { reason: "Reported" });
        setActionSuccess("Segment reported successfully.");
      }
      const { data } = response;
      const updatedSegment = {
        ...activeSegmentForActions,
        isReported: data.isReported,
        reportsCount: data.reportsCount,
        reports: data.currentUserReported ?
          [...(activeSegmentForActions.reports || []).filter(r => (r.reporter !== user?.id && r.reporter?._id !== user?.id)), { reporter: user.id }] :
          (activeSegmentForActions.reports || []).filter(r => (r.reporter !== user?.id && r.reporter?._id !== user?.id))
      };
      setActiveSegmentForActions(updatedSegment);
      handleSegmentDataChangeInLineage(updatedSegment);
    } catch (err) {
      setActionError(err.response?.data?.error || "Report action failed.");
    } finally {
      setActionLoading({ type: null, id: null });
      setTimeout(clearActionMessages, 4000);
    }
  }, [apiClient, isAuthenticated, user, activeSegmentForActions, handleSegmentDataChangeInLineage, clearActionMessages]);

  const handleReplyToActiveSegmentSuccess = useCallback((newReply) => {
    setIsReplyingToActiveSegment(false);
    setActionSuccess("Reply posted! New block added to chain.");
    const parentId = newReply.parentContent;
    const parentIndex = currentLineage.findIndex(segment => segment.id === parentId);
    if (parentIndex > -1) {
      const newPath = [...currentLineage.slice(0, parentIndex + 1), newReply];
      setCurrentLineage(newPath);
      const totalChain = calculateBlockchainStats(newPath);
      if (onLineageUpdateFromParent) onLineageUpdateFromParent(newPath);
      setActiveSegmentForActions(newReply);
      setSelectedVersionHistory(prev => [...prev, { timestamp: new Date(), lineage: newPath, chainValue: totalChain || 0, action: 'new_block' }]);
      const previousChain = chainValue;
      const newChain = totalChain || 0;
      const appreciation = newChain - previousChain;
      setActionSuccess(`New block added! Chain value increased by ${appreciation.toFixed(2)} gems. Previous blocks appreciated!`);
    } else {
      refreshLineageAndSetActive(parentId);
    }
    setTimeout(clearActionMessages, 5000);
  }, [currentLineage, onLineageUpdateFromParent, refreshLineageAndSetActive, clearActionMessages, calculateBlockchainStats, chainValue]);

  const handleEditActiveSegmentSuccess = useCallback((updatedContent) => {
    setIsEditingActiveSegment(false);
    setActiveSegmentForActions(updatedContent);
    handleSegmentDataChangeInLineage(updatedContent);
    setActionSuccess("Block updated! Chain values recalculated.");
    setSelectedVersionHistory(prev => [...prev, { timestamp: new Date(), lineage: currentLineage, chainValue: chainValue, action: 'edit' }]);
  }, [handleSegmentDataChangeInLineage, currentLineage, chainValue]);

  const handleShowSiblingVersions = useCallback((segmentIdClicked, show) => {
    const segmentObject = currentLineage.find(s => s.id === segmentIdClicked);
    if (show && segmentObject && segmentObject.parentContent) {
      setShowVersionSelectorFor(segmentObject);
      setIsReplyingToActiveSegment(false);
      setIsEditingActiveSegment(false);
      setActiveSegmentForActions(null);
      clearActionMessages();
    } else {
      setShowVersionSelectorFor(null);
    }
  }, [currentLineage, clearActionMessages]);

  const handleSelectSiblingVersionForLineage = useCallback(async (selectedSiblingId) => {
    if (!showVersionSelectorFor) return setError("Error: Context missing.");
    const originalDepth = currentLineage.findIndex(s => s.id === showVersionSelectorFor.id);
    if (originalDepth === -1) return setError("Error: Depth not found.");
    setLoading(true);
    setError(null);
    clearActionMessages();
    setShowVersionSelectorFor(null);
    try {
      const response = await apiClient.get(`/content/${selectedSiblingId}/lineage`);
      let newPartialLineage = [];
      if (response.data && Array.isArray(response.data)) newPartialLineage = response.data;
      else if (response.data && response.data.data && Array.isArray(response.data.data)) newPartialLineage = response.data.data;
      else if (response.data && response.data.id) newPartialLineage = [response.data];
      // Normalize
      newPartialLineage = newPartialLineage.map(normalizeContent).filter(Boolean);
      newPartialLineage = newPartialLineage.filter(s => s && s.id && typeof s.text === 'string');
      if (newPartialLineage.length === 0) throw new Error("Could not construct path.");
      const newLineage = [...currentLineage.slice(0, originalDepth), ...newPartialLineage];
      setCurrentLineage(newLineage);
      const newChainValue = calculateTotalChainValue(newLineage);
      calculateBlockchainStats(newLineage);
      setActiveSegmentForActions(newPartialLineage[0]);
      if (onLineageUpdateFromParent) onLineageUpdateFromParent(newLineage);
      setSelectedVersionHistory(prev => [...prev, { timestamp: new Date(), lineage: newLineage, chainValue: newChainValue, selectedSiblingId, previousSegmentId: showVersionSelectorFor.id, blockCount: newLineage.length }]);
      const previousChainValue = chainValue;
      const diff = newChainValue - previousChainValue;
      setActionSuccess(`Chain forked! New chain value: ${newChainValue.toFixed(2)} gems (${diff > 0 ? '+' : ''}${diff.toFixed(2)} change)`);
    } catch (err) {
      console.error("Failed to update lineage:", err);
      setError(err.response?.data?.error || "Failed to load lineage.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, currentLineage, showVersionSelectorFor, onLineageUpdateFromParent, clearActionMessages, calculateBlockchainStats, calculateTotalChainValue, chainValue, normalizeContent]);

  const handleSaveLineage = useCallback(async () => {
    if (!isAuthenticated || !currentLineage || currentLineage.length === 0) {
      alert("Please log in to save.");
      return;
    }
    const rootId = currentLineage[0].id;
    const lineagePathIdsToSend = currentLineage.map(segment => segment.id);
    setActionLoading({ type: 'save', id: rootId });
    setSaveStatus({ message: '', type: '' });
    clearActionMessages();
    try {
      await apiClient.post('/users/me/saved-articles', {
        rootArticleId: rootId,
        lineagePathIds: lineagePathIdsToSend,
        gemsAtSave: chainValue,
        blockCount: currentLineage.length
      });
      setSaveStatus({ message: 'Blockchain saved!', type: 'success' });
      setIsCurrentLineageSaved(true);
    } catch (err) {
      console.error("Failed to save lineage:", err);
      setSaveStatus({ message: err.response?.data?.error || "Failed to save.", type: 'error' });
    } finally {
      setActionLoading({ type: null, id: null });
    }
  }, [apiClient, isAuthenticated, currentLineage, clearActionMessages, chainValue]);

  const refreshChainValues = useCallback(() => {
    calculateBlockchainStats(currentLineage);
    setActionSuccess('Chain values refreshed!');
    setTimeout(clearActionMessages, 3000);
  }, [currentLineage, calculateBlockchainStats, clearActionMessages]);

  // ========== Render Helpers ==========
  const renderBlockchainVisualization = () => {
    if (!showChainVisualization || currentLineage.length === 0) return null;
    return (
      <div className="blockchain-visualization" style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', cursor: 'pointer' }} onClick={() => setShowChainVisualization(!showChainVisualization)}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FaLink style={{ color: '#FFD700' }} /> Blockchain Explorer</h4>
          <span>{showChainVisualization ? <FaChevronUp /> : <FaChevronDown />}</span>
        </div>
        {showChainVisualization && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', padding: '10px 0', overflowX: 'auto' }}>
            {currentLineage.map((segment, index) => {
              const blockInfo = blockValues[segment.id] || { value: 0, raw: 0, appreciation: 0 };
              const isLastBlock = index === currentLineage.length - 1;
              const isActive = activeSegmentForActions?.id === segment.id;
              return (
                <div key={segment.id} onClick={() => handleSegmentClickForActionsPanel(segment)} style={{
                  flex: '0 0 auto', width: '140px', padding: '12px',
                  background: isActive ? '#e3f2fd' : '#fff',
                  border: isLastBlock ? '2px solid #4caf50' : '1px solid #dee2e6',
                  borderRadius: '8px', textAlign: 'center', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#FFD700', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                    Block #{index + 1}
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>{segment.author?.username || 'Anonymous'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#999', marginBottom: '5px' }}>{formatDistanceToNow(new Date(segment.createdAt), { addSuffix: true })}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FFD700' }}>{blockInfo.value.toFixed(2)}</div>
                    {blockInfo.appreciation > 0 && <div style={{ fontSize: '0.65rem', color: '#4caf50', marginTop: '3px' }}>+{blockInfo.appreciation.toFixed(2)}</div>}
                    {isLastBlock && <div style={{ fontSize: '0.65rem', color: '#4caf50', marginTop: '5px', fontWeight: 'bold' }}>⛏️ Latest</div>}
                  </div>
                  {index < currentLineage.length - 1 && <div style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', color: '#ccc', fontSize: '0.8rem' }}>↓</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderBlockchainLedger = () => {
    if (currentLineage.length === 0) return null;
    return (
      <div className="blockchain-ledger" style={{ marginTop: '20px', marginBottom: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'hidden' }}>
        <div style={{ background: '#333', color: '#fff', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowDetailedStats(!showDetailedStats)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FaLink style={{ color: '#FFD700' }} /> Blockchain Ledger</span>
          <span>Total: <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{chainValue.toFixed(2)}</span><span style={{ marginLeft: '15px', color: '#aaa' }}>{currentLineage.length} blocks</span>{showDetailedStats ? <FaChevronUp style={{ marginLeft: '10px' }} /> : <FaChevronDown style={{ marginLeft: '10px' }} />}</span>
        </div>
        {showDetailedStats && (
          <div style={{ padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Block</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Miner</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Base</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Later</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Reward</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Final</th>
                 </tr>
              </thead>
              <tbody>
                {currentLineage.map((segment, index) => {
                  const blockInfo = blockValues[segment.id] || { value: 0, raw: 0 };
                  const miningReward = miningRewards[segment.id] || 0;
                  const laterAdditions = blockInfo.value - blockInfo.raw;
                  const isActive = activeSegmentForActions?.id === segment.id;
                  const isLastBlock = index === currentLineage.length - 1;
                  return (
                    <tr key={segment.id} style={{ backgroundColor: isActive ? '#e3f2fd' : isLastBlock ? '#fff3e0' : 'transparent', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => handleSegmentClickForActionsPanel(segment)}>
                      <td style={{ padding: '8px' }}>#{index + 1}{isLastBlock && <span style={{ marginLeft: '5px', color: '#4caf50' }}>⛏️</span>}</td>
                      <td style={{ padding: '8px' }}>{segment.author?.username || 'Anonymous'}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{blockInfo.raw.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#4caf50' }}>{laterAdditions > 0 ? `+${laterAdditions.toFixed(2)}` : '0'}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ff9800' }}>{miningReward.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#FFD700', fontWeight: 'bold' }}>{blockInfo.value.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #dee2e6', fontWeight: 'bold' }}>
                  <td colSpan="5" style={{ padding: '10px', textAlign: 'right' }}>Total:</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#FFD700' }}>{chainValue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ========== Main Render ==========
  if (loading && currentLineage.length === 0) return <LoadingSpinner />;
  if (error && currentLineage.length === 0) return <p className="error-message text-center card p-3">{error}</p>;
  if (!loading && currentLineage.length === 0 && !error) return <p className="text-center my-2">No content found.</p>;

  const displaySegment = activeSegmentForActions || currentLineage[0] || {};
  const isAuthorOfActiveSegment = isAuthenticated && activeSegmentForActions && user?.id === activeSegmentForActions.author?.id;
  const currentUserReportedActiveSegment = isAuthenticated && activeSegmentForActions &&
    (activeSegmentForActions.reports || []).some(r => r.reporter === user?.id || r.reporter?._id === user?.id);

  return (
    <div className="read-page-article-view">
      <div className="article-header" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px',
        padding: '15px 20px', background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)', borderRadius: '10px',
        border: '1px solid rgba(255, 215, 0, 0.2)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
      }}>
        <div className="gem-stats" style={{ display: 'flex', gap: '25px', flexWrap: 'wrap' }}>
          <div style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', padding: '8px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 20px rgba(255,215,0,0.3)' }}>
            <FaLink style={{ color: '#000', fontSize: '1.3rem' }} />
            <div><span style={{ color: '#000', fontSize: '0.8rem', display: 'block' }}>CHAIN VALUE</span><span style={{ color: '#000', fontWeight: 'bold', fontSize: '1.5rem' }}>{chainValue.toFixed(2)}</span></div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 15px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaCube style={{ color: '#4caf50' }} /><span style={{ color: '#fff' }}>Block #{currentLineage.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaEye style={{ color: '#64b5f6' }} /><span style={{ color: '#fff' }}>{totalViews}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FaUsers style={{ color: '#ba68c8' }} /><span style={{ color: '#fff' }}>{totalUniqueReaders}</span></div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={refreshChainValues} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '20px' }}>
            <FaHistory /> Refresh
          </button>
          <button onClick={() => setShowDetailedStats(!showDetailedStats)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '20px' }}>
            <FaCalculator /> {showDetailedStats ? 'Hide' : 'Show'} Ledger
          </button>
          <button onClick={() => setShowPrintedVersion(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '20px' }}>
            <FaPrint /> Print
          </button>
        </div>
      </div>

      {displaySegment.title && <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', fontSize: '1.8rem' }}>{displaySegment.title}</h1>}
      {error && currentLineage.length > 0 && <p className="error-message text-center card p-2 mb-3">{error}</p>}

      <ChainValueDisplay lineage={currentLineage} chainValues={chainValues} blockValues={blockValues} miningRewards={miningRewards} onBlockClick={handleSegmentClickForActionsPanel} activeBlockId={activeSegmentForActions?.id} />
      {renderBlockchainVisualization()}
      {renderBlockchainLedger()}

      <div className="concatenated-lineage-display card" style={{ padding: '20px', marginBottom: '20px', background: '#fff', lineHeight: '1.8', fontSize: '1.1rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
        {currentLineage.map((content, index) => {
          if (!content || !content.id || typeof content.text !== 'string') return null;
          return (
            <LineageSegmentDisplay
              key={content.id + '-' + content.updatedAt}
              content={content}
              color={segmentColors[index % segmentColors.length]}
              onSegmentClick={handleSegmentClickForActionsPanel}
              isActiveForActions={activeSegmentForActions?.id === content.id}
              showGemDetails={activeSegmentForActions?.id === content.id}
              index={index}
              totalSegments={currentLineage.length}
              chainValue={chainValues[content.id]}
            />
          );
        })}
        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #FFD700', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: '#666' }}>Total Chain Value:</span>
          <span style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', padding: '8px 25px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.3rem', color: '#000', boxShadow: '0 2px 10px rgba(255,215,0,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaLink /> {chainValue.toFixed(2)} Gems
          </span>
        </div>
      </div>

      <div className="lineage-metadata card-meta" style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <p style={{ margin: 0 }}>
              <strong>Current Block #{currentLineage.findIndex(s => s.id === displaySegment.id) + 1}:</strong>{' '}
              {displaySegment.author?.username ? <Link to={`/profile/${displaySegment.author.username}`} style={{ color: '#0056b3', fontWeight: '500' }}>{displaySegment.author.username}</Link> : 'Unknown'} |{' '}
              <strong>Mined:</strong> {format(new Date(displaySegment.createdAt || Date.now()), 'PPP p')} |{' '}
              <strong>Likes:</strong> <FaThumbsUp size="0.8em" /> {displaySegment.likeCount || 0}
            </p>
          </div>
          {activeSegmentForActions?.published && activeSegmentForActions?.gemsEarned > 0 && (
            <span style={{ background: '#333', color: '#FFD700', padding: '5px 15px', borderRadius: '20px', fontSize: '0.95rem', border: '1px solid #FFD700', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaLink /> Block Value: {chainValues[activeSegmentForActions.id]?.toFixed(2) || 0} gems
              {blockValues[activeSegmentForActions.id]?.appreciation > 0 && ` (+${blockValues[activeSegmentForActions.id].appreciation.toFixed(2)} from later)`}
            </span>
          )}
        </div>
        {currentLineage.length > 1 && (
          <p style={{ fontSize: '0.9em', color: '#555', margin: '10px 0 0 0' }}>
            Showing blockchain with {currentLineage.length} blocks. Each new block adds value to all previous blocks.
            Total chain value: <strong style={{ color: '#FFD700' }}>{chainValue.toFixed(2)} gems</strong>
          </p>
        )}
      </div>

      {activeSegmentForActions && !showVersionSelectorFor && (
        <div className="active-segment-actions-panel card" style={{ padding: '20px', marginBottom: '20px', background: '#fff', border: '2px solid #007bff', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
            <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              Block #{currentLineage.findIndex(s => s.id === activeSegmentForActions.id) + 1} Actions
              {activeSegmentForActions.published && activeSegmentForActions.gemsEarned > 0 && (
                <span style={{ background: '#333', color: '#FFD700', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'normal', border: '1px solid #FFD700' }}>
                  {chainValues[activeSegmentForActions.id]?.toFixed(2) || 0} gems
                </span>
              )}
            </h5>
            <button onClick={() => { setActiveSegmentForActions(null); clearActionMessages(); }} className="btn btn-sm btn-link" style={{ color: '#aaa', padding: '0 5px' }} title="Close Actions Panel"><FaTimes /></button>
          </div>
          {actionError && <p className="error-message">{actionError}</p>}
          {actionSuccess && <p className="success-message">{actionSuccess}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: isReplyingToActiveSegment || isEditingActiveSegment ? '15px' : '0' }}>
            <button onClick={handleLikeActiveSegment} className="btn btn-sm btn-outline-primary" disabled={!isAuthenticated || (actionLoading.type === 'like' && actionLoading.id === activeSegmentForActions.id)}>
              {(actionLoading.type === 'like' && actionLoading.id === activeSegmentForActions.id) ? <FaSpinner className="icon spin" /> : (activeSegmentForActions.likes?.some(l => (l.id || l) === user?.id) ? <FaThumbsUp /> : <FaRegThumbsUp />)} Like ({activeSegmentForActions.likeCount || 0})
            </button>
            <button onClick={handleToggleReportActiveSegment} className="btn btn-sm btn-outline-danger" disabled={!isAuthenticated || (actionLoading.type === 'report' && actionLoading.id === activeSegmentForActions.id)}>
              {(actionLoading.type === 'report' && actionLoading.id === activeSegmentForActions.id) ? <FaSpinner className="icon spin" /> : (currentUserReportedActiveSegment ? <FaFlag color="red" /> : <FaRegFlag />)} {currentUserReportedActiveSegment ? 'Undo Report' : 'Report'}
            </button>
            {isAuthenticated && (
              <button onClick={() => { setIsReplyingToActiveSegment(true); setIsEditingActiveSegment(false); clearActionMessages(); }} className="btn btn-sm btn-outline-secondary" disabled={isReplyingToActiveSegment}>
                <FaReply /> Mine New Block
              </button>
            )}
            {isAuthorOfActiveSegment && (
              <button onClick={() => { setIsEditingActiveSegment(true); setIsReplyingToActiveSegment(false); clearActionMessages(); }} className="btn btn-sm btn-outline-info" disabled={isEditingActiveSegment}>
                <FaEdit /> Edit Block
              </button>
            )}
            {activeSegmentForActions.parentContent && (
              <button onClick={() => { setShowVersionSelectorFor(activeSegmentForActions); setActiveSegmentForActions(null); clearActionMessages(); }} className="btn btn-sm btn-outline-success">
                <FaListUl /> Fork at this Block
              </button>
            )}
          </div>
          {isReplyingToActiveSegment && (
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
              <h6 style={{ marginTop: 0, marginBottom: '10px' }}>Mine a New Block:</h6>
              <ArticleForm parentContentId={activeSegmentForActions.id} onPostSuccess={handleReplyToActiveSegmentSuccess} onCancel={() => { setIsReplyingToActiveSegment(false); clearActionMessages(); }} />
            </div>
          )}
          {isEditingActiveSegment && isAuthorOfActiveSegment && (
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
              <h6 style={{ marginTop: 0, marginBottom: '10px' }}>Edit Block:</h6>
              <ArticleForm isEditMode={true} contentToEdit={activeSegmentForActions} onEditSuccess={handleEditActiveSegmentSuccess} onCancel={() => { setIsEditingActiveSegment(false); clearActionMessages(); }} />
            </div>
          )}
        </div>
      )}

      {isAuthenticated && currentLineage.length > 0 && !showVersionSelectorFor && (
        <div className="save-lineage-section card-meta" style={{ marginTop: '1.5rem', paddingTop: '1rem', textAlign: 'center', borderTop: '1px solid #eee' }}>
          {saveStatus.message && <p className={saveStatus.type === 'success' ? 'success-message' : 'error-message'}>{saveStatus.message}</p>}
          <button onClick={handleSaveLineage} className={`btn ${isCurrentLineageSaved ? 'btn-light text-success' : 'btn-info'}`} disabled={(actionLoading.type === 'save') || isCurrentLineageSaved} title={isCurrentLineageSaved ? "Path already saved" : "Save current lineage"}>
            {(actionLoading.type === 'save') ? <FaSpinner className="spin" /> : (isCurrentLineageSaved ? <FaBookmark /> : <FaRegBookmark />)} {isCurrentLineageSaved ? 'Chain Saved' : 'Save Chain'} ({chainValue.toFixed(2)} gems)
          </button>
        </div>
      )}

      {showVersionSelectorFor && (
        <VersionSelector
          contextSegment={showVersionSelectorFor}
          onSelectVersion={handleSelectSiblingVersionForLineage}
          onSiblingReplied={handleSelectSiblingVersionForLineage}
          onClose={() => { setShowVersionSelectorFor(null); setActiveSegmentForActions(showVersionSelectorFor); clearActionMessages(); }}
          onContextSegmentUpdate={handleSegmentDataChangeInLineage}
          onNewVariationAdded={() => refreshLineageAndSetActive(showVersionSelectorFor?.id)}
          currentGemTotal={chainValue}
          segmentGemValue={chainValues[showVersionSelectorFor.id] || 0}
          currentBlockNumber={currentLineage.findIndex(s => s.id === showVersionSelectorFor.id) + 1}
          totalBlocks={currentLineage.length}
        />
      )}

      {showPrintedVersion && <PrintedVersion lineage={currentLineage} onClose={() => setShowPrintedVersion(false)} />}
    </div>
  );
};

export default ReadPageArticleView;