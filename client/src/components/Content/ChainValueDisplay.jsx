// Rewrite/client/src/components/Content/ChainValueDisplay.jsx
import React, { useState } from 'react';
import { 
  FaLink, FaGem, FaCube, FaArrowUp, FaArrowDown, 
  FaHistory, FaChartLine, FaMeteor, FaCoins,
  FaChevronDown, FaChevronUp, FaInfoCircle
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

const ChainValueDisplay = ({ 
  lineage = [], 
  chainValues = {}, 
  blockValues = {},
  miningRewards = {},
  onBlockClick,
  activeBlockId
}) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);

  if (!lineage || lineage.length === 0) {
    return (
      <div className="chain-value-display empty-state" style={{
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#999',
        border: '1px dashed #dee2e6'
      }}>
        <FaLink style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }} />
        <p>No blocks in chain yet</p>
      </div>
    );
  }

  // Calculate total chain value
  const totalChainValue = Object.values(chainValues).reduce((sum, val) => sum + (val || 0), 0);
  
  // Calculate total mining rewards
  const totalMiningRewards = Object.values(miningRewards).reduce((sum, val) => sum + (val || 0), 0);
  
  // Calculate average appreciation per block
  const averageAppreciation = lineage.reduce((sum, segment, idx) => {
    const raw = segment.gemsEarned || 0;
    const chain = chainValues[segment.id] || 0;
    return sum + (chain - raw);
  }, 0) / lineage.length;

  // Get block color based on position and value
  const getBlockColor = (index, value) => {
    const maxValue = Math.max(...Object.values(chainValues).filter(v => v > 0), 1);
    const intensity = Math.min(0.3 + (value / maxValue) * 0.7, 1);
    
    if (index === lineage.length - 1) {
      return `rgba(76, 175, 80, ${intensity})`; // Green for latest block
    }
    if (index === 0) {
      return `rgba(255, 215, 0, ${intensity})`; // Gold for genesis block
    }
    return `rgba(33, 150, 243, ${intensity * 0.8})`; // Blue for middle blocks
  };

  const handleBlockClick = (block, index) => {
    setSelectedBlock(selectedBlock === index ? null : index);
    if (onBlockClick) {
      onBlockClick(block);
    }
  };

  return (
    <div className="chain-value-display" style={{
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e0e0e0',
      overflow: 'hidden',
      marginBottom: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div 
        className="chain-header"
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '15px 20px',
          background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
          borderBottom: expanded ? '1px solid #dee2e6' : 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: '#FFD700',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(255,215,0,0.3)'
          }}>
            <FaLink style={{ color: '#000', fontSize: '1.2rem' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>
              Blockchain Value Chain
            </h3>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#666' }}>
              {lineage.length} blocks • Total Value: <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{totalChainValue.toFixed(2)} gems</span>
            </p>
          </div>
        </div>
        <div style={{ color: '#666' }}>
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="chain-content" style={{ padding: '20px' }}>
          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '25px'
          }}>
            <div style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <FaGem style={{ color: '#FFD700', fontSize: '1.2rem', marginBottom: '5px' }} />
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Value</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FFD700' }}>
                {totalChainValue.toFixed(2)}
              </div>
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <FaCube style={{ color: '#4caf50', fontSize: '1.2rem', marginBottom: '5px' }} />
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Blocks</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4caf50' }}>
                {lineage.length}
              </div>
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <FaCoins style={{ color: '#ff9800', fontSize: '1.2rem', marginBottom: '5px' }} />
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Mining Rewards</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff9800' }}>
                {totalMiningRewards.toFixed(2)}
              </div>
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <FaChartLine style={{ color: '#2196f3', fontSize: '1.2rem', marginBottom: '5px' }} />
              <div style={{ fontSize: '0.8rem', color: '#666' }}>Avg Appreciation</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: averageAppreciation > 0 ? '#4caf50' : '#999' }}>
                {averageAppreciation > 0 ? `+${averageAppreciation.toFixed(2)}` : '0'}
              </div>
            </div>
          </div>

          {/* Block Chain Visualization */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '25px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            overflowX: 'auto'
          }}>
            {lineage.map((segment, index) => {
              const blockNumber = index + 1;
              const rawValue = segment.gemsEarned || 0;
              const chainValue = chainValues[segment.id] || 0;
              const miningReward = miningRewards[segment.id] || 0;
              const appreciation = chainValue - rawValue;
              const isActive = activeBlockId === segment.id || selectedBlock === index;
              const isGenesis = index === 0;
              const isLatest = index === lineage.length - 1;
              
              return (
                <div
                  key={segment.id}
                  onClick={() => handleBlockClick(segment, index)}
                  style={{
                    flex: '0 0 auto',
                    width: '140px',
                    padding: '12px',
                    background: getBlockColor(index, chainValue),
                    border: isActive ? '3px solid #007bff' : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 4px 12px rgba(0,123,255,0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  {/* Block number badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#333',
                    color: '#FFD700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    zIndex: 2
                  }}>
                    #{blockNumber}
                  </div>

                  {/* Block type indicator */}
                  {isGenesis && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#FFD700',
                      color: '#000',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                      border: '2px solid #fff'
                    }}>
                      🌟
                    </div>
                  )}

                  {isLatest && !isGenesis && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#4caf50',
                      color: '#fff',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                      border: '2px solid #fff'
                    }}>
                      ⛏️
                    </div>
                  )}

                  {/* Block content */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#333',
                      fontWeight: 'bold',
                      marginBottom: '5px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {segment.author?.username || 'Anonymous'}
                    </div>
                    
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#555',
                      marginBottom: '8px'
                    }}>
                      {formatDistanceToNow(new Date(segment.createdAt), { addSuffix: true })}
                    </div>

                    {/* Values */}
                    <div style={{
                      background: 'rgba(255,255,255,0.7)',
                      padding: '5px',
                      borderRadius: '4px'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '2px'
                      }}>
                        <span style={{ color: '#666' }}>Raw:</span>
                        <span>{rawValue.toFixed(1)}</span>
                      </div>
                      
                      <div style={{
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold'
                      }}>
                        <span style={{ color: '#FFD700' }}>Chain:</span>
                        <span style={{ color: '#FFD700' }}>{chainValue.toFixed(1)}</span>
                      </div>

                      {appreciation > 0 && (
                        <div style={{
                          fontSize: '0.65rem',
                          color: '#4caf50',
                          marginTop: '2px'
                        }}>
                          +{appreciation.toFixed(1)} from later
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chain link */}
                  {index < lineage.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-15px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: '#999',
                      fontSize: '0.8rem'
                    }}>
                      ↓
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detailed Block Info */}
          {selectedBlock !== null && lineage[selectedBlock] && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaInfoCircle style={{ color: '#007bff' }} />
                Block #{selectedBlock + 1} Details
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                {/* Base Stats */}
                <div>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>Base Values</h5>
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#666' }}>Raw Gems:</td>
                        <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>
                          {lineage[selectedBlock].gemsEarned?.toFixed(2) || '0'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#666' }}>Views:</td>
                        <td style={{ padding: '4px 0', textAlign: 'right' }}>{lineage[selectedBlock].views || 0}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#666' }}>Likes:</td>
                        <td style={{ padding: '4px 0', textAlign: 'right' }}>{lineage[selectedBlock].likeCount || 0}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#666' }}>Characters:</td>
                        <td style={{ padding: '4px 0', textAlign: 'right' }}>{lineage[selectedBlock].characterCount || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Chain Values */}
                <div>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>Chain Values</h5>
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#666' }}>Current Value:</td>
                        <td style={{ padding: '4px 0', textAlign: 'right', color: '#FFD700', fontWeight: 'bold' }}>
                          {chainValues[lineage[selectedBlock].id]?.toFixed(2) || '0'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#666' }}>Mining Reward:</td>
                        <td style={{ padding: '4px 0', textAlign: 'right', color: '#ff9800', fontWeight: 'bold' }}>
                          {miningRewards[lineage[selectedBlock].id]?.toFixed(2) || '0'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '4px 0', color: '#666' }}>Appreciation:</td>
                        <td style={{ 
                          padding: '4px 0', 
                          textAlign: 'right', 
                          color: (chainValues[lineage[selectedBlock].id] - lineage[selectedBlock].gemsEarned) > 0 ? '#4caf50' : '#999',
                          fontWeight: 'bold'
                        }}>
                          +{(chainValues[lineage[selectedBlock].id] - lineage[selectedBlock].gemsEarned).toFixed(2) || '0'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Contributions from later blocks */}
                <div>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>
                    Later Block Contributions
                  </h5>
                  <div style={{ fontSize: '0.8rem', maxHeight: '100px', overflowY: 'auto' }}>
                    {lineage.slice(selectedBlock + 1).map((laterBlock, idx) => {
                      const actualIndex = selectedBlock + 1 + idx;
                      const distance = actualIndex - selectedBlock;
                      const contribution = (laterBlock.gemsEarned || 0) * (1 / Math.pow(2, distance));
                      
                      return (
                        <div key={laterBlock.id} style={{
                          padding: '5px',
                          borderBottom: '1px solid #eee',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span>Block #{actualIndex + 1}:</span>
                          <span style={{ color: '#4caf50' }}>+{contribution.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    {lineage.slice(selectedBlock + 1).length === 0 && (
                      <p style={{ color: '#999', fontStyle: 'italic' }}>No later blocks yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#e3f2fd',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: '#0d47a1',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <FaHistory style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>How Chain Values Work:</strong>
              <p style={{ margin: '5px 0 0 0', lineHeight: '1.5' }}>
                Each new block adds value to all previous blocks. Block 1 gets +50% from Block 2, 
                +25% from Block 3, +12.5% from Block 4, etc. Mining rewards are 10% of block value 
                + 1% fees from all previous blocks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChainValueDisplay;