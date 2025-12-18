import { useState } from 'react';
import Preview from './Preview';

type Stage = {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
};

const STAGES: Stage[] = [
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

  const handleFileSelect = async () => {
    // In Electron, this would use dialog.showOpenDialog
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setImagePath(file.name);
      }
    };
    input.click();
  };

  const runPipeline = async () => {
    setIsRunning(true);
    // Pipeline execution would go here
    // For now, simulate progress
    for (let i = 0; i < stages.length; i++) {
      setStages(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'running' } : s
      ));
      await new Promise(r => setTimeout(r, 500));
      setStages(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'completed' } : s
      ));
    }
    setIsRunning(false);
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
