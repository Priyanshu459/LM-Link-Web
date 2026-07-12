import React, { useState, useEffect } from 'react';
import { X, Server, RefreshCw, HelpCircle } from 'lucide-react';
import SetupGuideModal from './SetupGuideModal';
import { fetchModels } from '../api';
import { useStore } from '../store';

const SettingsModal = ({ isOpen, onClose }) => {
  const { baseUrl, selectedModel, temperature, maxTokens, systemPrompt, setSettings } = useStore();
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState('');
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);

  // Local state for edits
  const [tempUrl, setTempUrl] = useState(baseUrl);
  const [tempModel, setTempModel] = useState(selectedModel);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [tempTemp, setTempTemp] = useState(temperature);
  const [tempMaxTokens, setTempMaxTokens] = useState(maxTokens);

  const loadModels = async (urlToFetch) => {
    setLoadingModels(true);
    setError('');
    try {
      const fetchedModels = await fetchModels(urlToFetch);
      setModels(fetchedModels);
      if (fetchedModels.length > 0 && !tempModel) {
        setTempModel(fetchedModels[0].id);
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
      setTempModel(selectedModel);
      setTempSystemPrompt(systemPrompt);
      setTempTemp(temperature);
      setTempMaxTokens(maxTokens);
      loadModels(baseUrl);
    }
  }, [isOpen, baseUrl, selectedModel, systemPrompt, temperature, maxTokens]);

  const handleSave = () => {
    const cleanUrl = tempUrl.trim().replace(/\/$/, '');
    setSettings({
      baseUrl: cleanUrl,
      selectedModel: tempModel,
      systemPrompt: tempSystemPrompt,
      temperature: parseFloat(tempTemp),
      maxTokens: parseInt(tempMaxTokens, 10)
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
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
              placeholder="e.g., http://localhost:1234/v1"
            />
            <button 
              className="btn-icon glass-panel" 
              onClick={() => loadModels(tempUrl)}
              disabled={loadingModels}
            >
              <RefreshCw size={18} className={loadingModels ? "spin" : ""} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: '#ff6b6b', marginTop: '12px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <button 
          onClick={() => setIsSetupGuideOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-color)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <HelpCircle size={14} /> Need help connecting? Click here!
        </button>

        <div style={{ marginTop: '16px' }}>
          <label className="input-label">Select Model</label>
          <select 
            className="input-field"
            value={tempModel}
            onChange={(e) => setTempModel(e.target.value)}
            disabled={models.length === 0}
          >
            {models.length === 0 ? <option value="">No models available</option> : models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label className="input-label">System Prompt</label>
          <textarea 
            className="input-field" 
            rows="3" 
            value={tempSystemPrompt}
            onChange={(e) => setTempSystemPrompt(e.target.value)}
            placeholder="e.g., You are a helpful AI assistant."
          />
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label className="input-label">Temperature: {tempTemp}</label>
            <input type="range" min="0" max="2" step="0.1" value={tempTemp} onChange={(e) => setTempTemp(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="input-label">Max Tokens: {tempMaxTokens}</label>
            <input type="number" className="input-field" value={tempMaxTokens} onChange={(e) => setTempMaxTokens(e.target.value)} />
          </div>
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

      <SetupGuideModal isOpen={isSetupGuideOpen} onClose={() => setIsSetupGuideOpen(false)} />
    </div>
  );
};

export default SettingsModal;
