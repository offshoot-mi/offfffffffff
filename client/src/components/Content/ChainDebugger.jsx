// Rewrite/client/src/components/Content/ChainDebugger.jsx
import React, { useState, useEffect } from 'react';

const ChainDebugger = ({ lineage, chainValues, blockValues, onRefresh }) => {
  const [showDebug, setShowDebug] = useState(false);
  
  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '5px 10px',
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999
        }}
      >
        Debug Chain
      </button>
    );
  }
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: '400px',
      maxHeight: '500px',
      overflowY: 'auto',
      background: '#fff',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '15px',
      zIndex: 9999,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h4 style={{ margin: 0 }}>Chain Debugger</h4>
        <button onClick={() => setShowDebug(false)}>×</button>
      </div>
      
      <button 
        onClick={onRefresh}
        style={{
          width: '100%',
          padding: '8px',
          background: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          marginBottom: '15px',
          cursor: 'pointer'
        }}
      >
        Refresh Values
      </button>
      
      <div style={{ fontSize: '12px' }}>
        <p><strong>Total Chain Value:</strong> {Object.values(chainValues).reduce((a,b) => a + b, 0).toFixed(2)}</p>
        <p><strong>Number of Blocks:</strong> {lineage.length}</p>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Block</th>
              <th>Raw</th>
              <th>Chain</th>
              <th>Appreciation</th>
            </tr>
          </thead>
          <tbody>
            {lineage.map((seg, idx) => {
              const raw = seg.gemsEarned || 0;
              const chain = chainValues[seg.id] || 0;
              const appreciation = chain - raw;
              return (
                <tr key={seg.id}>
                  <td>#{idx + 1}</td>
                  <td>{raw.toFixed(2)}</td>
                  <td style={{ color: '#FFD700', fontWeight: 'bold' }}>{chain.toFixed(2)}</td>
                  <td style={{ color: appreciation > 0 ? '#4caf50' : '#999' }}>
                    {appreciation > 0 ? `+${appreciation.toFixed(2)}` : '0'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChainDebugger;