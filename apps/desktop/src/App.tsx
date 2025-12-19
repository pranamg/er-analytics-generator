import { useState, useEffect } from 'react';
import Preview from './Preview';

const API_BASE = 'http://localhost:3001/api';

type Stage = {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
};

const STAGES: Stage[] = [
  { id: 0, name: 'Archive Previous Outputs', status: 'pending' },
  { id: 1, name: 'Parse ER Diagram', status: 'pending' },
  { id: 2, name: 'Process Schema', status: 'pending' },
  { id: 3, name: 'Generate SQL', status: 'pending' },
  { id: 4, name: 'Generate Data', status: 'pending' },
  { id: 5, name: 'Generate Requirements', status: 'pending' },
  { id: 6, name: 'Generate PRD', status: 'pending' },
  { id: 7, name: 'Run Analytics', status: 'pending' },
  { id: 8, name: 'Build Dashboards', status: 'pending' },
  { id: 9, name: 'Export Power BI', status: 'pending' },
  { id: 10, name: 'Generate Deploy Scripts', status: 'pending' },
];

type AIProvider = 'claude' | 'gemini' | 'openai';
type View = 'pipeline' | 'preview';

function App() {
  const [view, setView] = useState<View>('pipeline');
  const [imagePath, setImagePath] = useState<string>('');
  const [outputDir, setOutputDir] = useState<string>('./outputs');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [stages, setStages] = useState<Stage[]>(STAGES);
  const [isRunning, setIsRunning] = useState(false);
  const [hasCachedSchema, setHasCachedSchema] = useState(false);

  useEffect(() => {
    // Check for cached schema on mount via HTTP API
    const checkSchema = async () => {
      try {
        const response = await fetch(`${API_BASE}/check-schema`);
        const result = await response.json();
        console.log('Schema check result:', result);
        setHasCachedSchema(result.hasSchema);
      } catch (error) {
        console.log('API not available - make sure server is running on port 3001');
        setHasCachedSchema(false);
      }
    };
    checkSchema();
  }, []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedFile(file);
        setImagePath(file.name);
      }
    };
    input.click();
  };

  const runPipeline = async () => {
    if (!selectedFile && !imagePath) {
      console.error('No image selected');
      return;
    }

    setIsRunning(true);
    
    // Reset all stages to pending
    setStages(prev => prev.map(s => ({ ...s, status: 'pending' })));
    
    // Mark all stages as running for visual feedback
    for (let i = 0; i <= 10; i++) {
      setStages(prev => prev.map(s => s.id === i ? { ...s, status: 'running' } : s));
    }

    try {
      let response;
      
      if (selectedFile) {
        // Upload file and run pipeline
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('provider', provider);
        
        response = await fetch(`${API_BASE}/upload-and-run`, {
          method: 'POST',
          body: formData,
        });
      } else {
        // Use existing path (for files already in inputs/ or examples/)
        response = await fetch(`${API_BASE}/run-pipeline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath, provider }),
        });
      }
      
      const result = await response.json();
      
      if (result.success || result.results) {
        console.log(result.summary || 'Pipeline completed');
        // Mark stages based on results
        if (result.results) {
          setStages(prev => prev.map(s => {
            const stageResult = result.results?.find((r: { stage: number }) => r.stage === s.id);
            if (stageResult) {
              return { ...s, status: stageResult.success ? 'completed' : 'failed' };
            }
            return { ...s, status: 'pending' };
          }));
        }
        // Check for cached schema after successful run
        setHasCachedSchema(true);
      } else {
        console.error('Pipeline failed:', result.error);
        // Mark all running stages as failed
        setStages(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'failed' } : s));
      }
    } catch (err) {
      console.error('Pipeline error:', err);
      setStages(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'failed' } : s));
    } finally {
      setIsRunning(false);
    }
  };

  const regenerateFromSchema = async () => {
    setIsRunning(true);
    // Reset stages 2-10 to pending, mark stage 0 and 1 as skipped/completed
    setStages(prev => prev.map(s => ({
      ...s,
      status: s.id === 0 ? 'completed' : s.id === 1 ? 'completed' : 'pending'
    })));

    // Mark stages 2-10 as running sequentially for visual feedback
    for (let i = 2; i <= 10; i++) {
      setStages(prev => prev.map(s => s.id === i ? { ...s, status: 'running' } : s));
    }

    try {
      const response = await fetch(`${API_BASE}/regenerate`, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        console.log(result.summary);
        // Mark stages based on results
        if (result.results) {
          setStages(prev => prev.map(s => {
            const stageResult = result.results?.find((r: { stage: number }) => r.stage === s.id);
            if (stageResult) {
              return { ...s, status: stageResult.success ? 'completed' : 'failed' };
            }
            return s;
          }));
        }
      } else {
        console.error('Regeneration failed:', result.error);
        // Mark all running stages as failed
        setStages(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'failed' } : s));
      }
    } catch (err) {
      console.error('Regeneration error:', err);
      setStages(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'failed' } : s));
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: Stage['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  if (view === 'preview') {
    return (
      <div>
        <div className="bg-white border-b px-6 py-3 flex justify-between items-center">
          <button
            onClick={() => setView('pipeline')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            ← Back to Pipeline
          </button>
          <span className="text-gray-600">Output Preview</span>
        </div>
        <Preview />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ER Analytics Generator
            </h1>
            <p className="text-gray-600">
              Transform ER diagrams into production-ready analytics platforms
            </p>
          </div>
          <button
            onClick={() => setView('preview')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Outputs →
          </button>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ER Diagram Image
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  placeholder="Select or enter image path..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={handleFileSelect}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Browse
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Directory
              </label>
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AIProvider)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="claude">Claude (Anthropic)</option>
                <option value="gemini">Gemini (Google)</option>
                <option value="openai">GPT-4 (OpenAI)</option>
              </select>
            </div>
          </div>

          <button
            onClick={runPipeline}
            disabled={!imagePath || isRunning}
            className={`mt-6 w-full py-3 rounded-lg font-medium transition-colors ${
              !imagePath || isRunning
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? 'Running Pipeline...' : 'Run Pipeline'}
          </button>

          {hasCachedSchema && (
            <button
              onClick={regenerateFromSchema}
              disabled={isRunning}
              className={`mt-3 w-full py-3 rounded-lg font-medium transition-colors ${
                isRunning
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRunning ? 'Regenerating...' : 'Regenerate from Cached Schema (Skip API)'}
            </button>
          )}

          {!hasCachedSchema && (
            <p className="mt-3 text-sm text-gray-500 text-center">
              No cached schema found. Run the full pipeline once to enable quick regeneration.
            </p>
          )}
        </div>

        {/* Pipeline Progress */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Pipeline Progress</h2>
          
          <div className="space-y-3">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(stage.status)}`} />
                <span className="text-sm font-medium text-gray-700">
                  Stage {stage.id}: {stage.name}
                </span>
                {stage.status === 'completed' && (
                  <span className="text-green-600 text-sm">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
