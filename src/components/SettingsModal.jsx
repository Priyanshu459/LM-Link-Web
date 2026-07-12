import React, { useState, useEffect } from 'react';
import { X, Server, RefreshCw } from 'lucide-react';
import { fetchModels } from '../api';

const SettingsModal = ({ isOpen, onClose, baseUrl, setBaseUrl, selectedModel, setSelectedModel }) => {
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [tempUrl, setTempUrl] = useState(baseUrl);
  const [error, setError] = useState('');

  const loadModels = async (urlToFetch) => {
    setLoadingModels(true);
    setError('');
    try {
      const fetchedModels = await fetchModels(urlToFetch);
      setModels(fetchedModels);
      if (fetchedModels.length > 0 && !selectedModel) {
        setSelectedModel(fetchedModels[0].id);
      }
    } catch (err) {
      setError('Could not connect to LM Studio. Check your URL and make sure the server is running.');
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTempUrl(baseUrl);
      loadModels(baseUrl);
    }
  }, [isOpen, baseUrl]);

  const handleSave = () => {
    // Basic validation to remove trailing slash if any
    const cleanUrl = tempUrl.trim().replace(/\/$/, '');
    setBaseUrl(cleanUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <div className="modal-title">
          <span><Server size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> LM Studio Settings</span>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div>
          <label className="input-label">LM Studio Server URL (or LM Link)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="input-field" 
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              placeholder="e.g., http://localhost:1234/v1 or https://xyz.lmlink.network/v1"
            />
            <button 
              className="btn-icon glass-panel" 
              onClick={() => loadModels(tempUrl)}
              disabled={loadingModels}
              title="Test Connection & Fetch Models"
            >
              <RefreshCw size={18} className={loadingModels ? "spin" : ""} />
            </button>
          </div>
          <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px', fontSize: '0.75rem' }}>
            Ensure your local server is running in LM Studio.
          </small>
        </div>

        {error && <div style={{ color: '#ff6b6b', marginTop: '12px', fontSize: '0.85rem', background: 'rgba(255, 0, 0, 0.1)', padding: '8px', borderRadius: '4px' }}>{error}</div>}

        <div style={{ marginTop: '16px' }}>
          <label className="input-label">Select Model</label>
          <select 
            className="input-field"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={models.length === 0}
          >
            {models.length === 0 ? (
              <option value="">No models available</option>
            ) : (
              models.map(model => (
                <option key={model.id} value={model.id}>{model.id}</option>
              ))
            )}
          </select>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 20px' }} onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default SettingsModal;
