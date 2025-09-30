import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/contexts/SettingsContext';
import HelpSection from '@/components/HelpSection';

export default function Settings() {
  const { 
    currentAiAgent, 
    currentModel,
    availableAiAgents, 
    availableModels, 
    isLoading, 
    error, 
    setAiAgent, 
    testAiAgent,
    loadModels,
    syncWithBackend
  } = useSettings();
  
  const [selectedAgent, setSelectedAgent] = useState<string>(currentAiAgent);
  const [selectedModel, setSelectedModel] = useState<string>(currentModel);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [syncResult, setSyncResult] = useState<{success: boolean, message: string} | null>(null);

  // Update selected values when context changes
  useEffect(() => {
    setSelectedAgent(currentAiAgent);
    setSelectedModel(currentModel);
  }, [currentAiAgent, currentModel]);

  // Load models when agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadModels(selectedAgent);
    }
  }, [selectedAgent, loadModels]);

  // Periodic sync with backend to ensure consistency
  useEffect(() => {
    const syncInterval = setInterval(() => {
      syncWithBackend();
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [syncWithBackend]);

  const handleAgentChange = async () => {
    if (selectedAgent === currentAiAgent && selectedModel === currentModel) {
      setMessage("No Change - Selected agent and model are already current.");
      return;
    }

    try {
      const success = await setAiAgent(selectedAgent, selectedModel);
      if (success) {
        setMessage(`Successfully changed AI agent to ${selectedAgent.toUpperCase()}${selectedModel ? ` with model ${selectedModel}` : ''}`);
        setTestResult(null);
      } else {
        setMessage(`Update Failed: ${error || "Failed to update AI agent"}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || "An error occurred"}`);
    }
  };

  const handleTestAgent = async () => {
    setIsTesting(true);
    setTestResult(null);
    setMessage(`Testing ${selectedAgent.toUpperCase()}${selectedModel ? ` with model ${selectedModel}` : ''}...`);
    
    try {
      const result = await testAiAgent(selectedAgent, selectedModel);
      setTestResult(result);
      
      if (result.success) {
        setMessage(`Test Successful: ${result.message}`);
      } else {
        setMessage(`Test Failed: ${result.message}`);
      }
    } catch (err: any) {
      setMessage(`Test Error: ${err.message || "An error occurred during testing"}`);
      setTestResult({
        success: false,
        message: err.message || "An error occurred during testing"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getAgentDisplayName = (agent: string) => {
    const displayNames: { [key: string]: string } = {
      'grok': 'Grok (xAI)',
      'gemini': 'Gemini (Google)',
      'deepseek': 'DeepSeek',
      'openai': 'OpenAI GPT',
      'qwen': 'Qwen (Alibaba)',
      'zai': 'ZAI'
    };
    return displayNames[agent] || agent.toUpperCase();
  };

  const getAgentDescription = (agent: string) => {
    const descriptions: { [key: string]: string } = {
      'grok': 'Advanced reasoning and coding capabilities',
      'gemini': 'Multimodal AI with strong reasoning',
      'deepseek': 'Cost-effective with good performance',
      'openai': 'Industry standard with reliable performance',
      'qwen': 'Strong multilingual capabilities',
      'zai': 'Specialized for specific use cases'
    };
    return descriptions[agent] || 'AI agent for job processing';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure AI agents, models, and platform settings
        </p>
      </div>

      {/* AI Agent Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI Agent Configuration</CardTitle>
          <CardDescription>
            Select and test your preferred AI agent and model for job processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Agent Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Current AI Agent</h3>
                <p className="text-blue-700">{getAgentDisplayName(currentAiAgent)}</p>
                {currentModel && (
                  <p className="text-sm text-blue-600">Model: {currentModel}</p>
                )}
                <p className="text-sm text-blue-600">{getAgentDescription(currentAiAgent)}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Active
                </div>
              </div>
            </div>
          </div>

          {/* Agent Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select AI Agent
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => {
                  setSelectedAgent(e.target.value);
                  setSelectedModel(''); // Reset model when agent changes
                }}
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {availableAiAgents.map((agent) => (
                  <option key={agent} value={agent}>
                    {getAgentDisplayName(agent)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoading || availableModels.length === 0}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Default Model</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              {availableModels.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Loading models...</p>
              )}
            </div>
          </div>

          {/* Selected Agent Info */}
          {selectedAgent !== currentAiAgent && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {getAgentDisplayName(selectedAgent)}
                {selectedModel && ` - ${selectedModel}`}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {getAgentDescription(selectedAgent)}
              </p>
              <div className="text-xs text-gray-500">
                This agent and model will be used for all job processing operations
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleTestAgent}
              disabled={isLoading || isTesting}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Test Agent</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleAgentChange}
              disabled={isLoading || (selectedAgent === currentAiAgent && selectedModel === currentModel)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Apply Changes</span>
                </>
              )}
            </button>

            <button
              onClick={async () => {
                setMessage("🔄 Syncing with backend...");
                setTestResult(null); // Clear any previous test results
                setSyncResult(null); // Clear any previous sync results
                
                try {
                  const result = await syncWithBackend();
                  if (result.success) {
                    setMessage(`✅ ${result.message}`);
                    setSyncResult({
                      success: true,
                      message: result.message
                    });
                  } else {
                    setMessage(`❌ ${result.message}`);
                    setSyncResult({
                      success: false,
                      message: result.message
                    });
                  }
                } catch (error) {
                  const errorMsg = "❌ Failed to sync with backend: " + (error as Error).message;
                  setMessage(errorMsg);
                  setSyncResult({
                    success: false,
                    message: errorMsg
                  });
                }
              }}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sync frontend settings with backend"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync</span>
            </button>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div className={`border rounded-lg p-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start">
                <svg className={`w-5 h-5 mr-2 mt-0.5 ${testResult.success ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {testResult.success ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <div className="flex-1">
                  <h4 className={`font-medium ${testResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {testResult.success ? 'Test Successful' : 'Test Failed'}
                  </h4>
                  <p className={`text-sm mt-1 ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sync Result Display */}
          {syncResult && (
            <div className={`border rounded-lg p-4 ${syncResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start">
                <svg className={`w-5 h-5 mr-2 mt-0.5 ${syncResult.success ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {syncResult.success ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <div className="flex-1">
                  <h4 className={`font-medium ${syncResult.success ? 'text-green-900' : 'text-red-900'}`}>
                    {syncResult.success ? 'Sync Successful' : 'Sync Failed'}
                  </h4>
                  <p className={`text-sm mt-1 ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {syncResult.message}
                  </p>
                  {syncResult.success && (
                    <div className="mt-2 text-xs text-green-700">
                      <strong>Current Configuration:</strong><br/>
                      Agent: {currentAiAgent.toUpperCase()}<br/>
                      Model: {currentModel || 'default'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div className={`border rounded-lg p-4 ${
              message.includes('✅') 
                ? 'bg-green-50 border-green-200' 
                : message.includes('❌') 
                ? 'bg-red-50 border-red-200'
                : message.includes('🔄')
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center">
                <svg className={`w-5 h-5 mr-2 ${
                  message.includes('✅') 
                    ? 'text-green-400' 
                    : message.includes('❌') 
                    ? 'text-red-400'
                    : message.includes('🔄')
                    ? 'text-yellow-400'
                    : 'text-blue-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`${
                  message.includes('✅') 
                    ? 'text-green-800' 
                    : message.includes('❌') 
                    ? 'text-red-800'
                    : message.includes('🔄')
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                }`}>{message}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">About AI Agent & Model Selection</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• The selected AI agent and model will be used for all job processing operations</li>
              <li>• Your selections are saved and will persist across browser sessions</li>
              <li>• Use the "Test Agent" button to verify the agent and model are working correctly</li>
              <li>• Different agents and models may have different performance characteristics and costs</li>
              <li>• The test shows the actual AI response and model information</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Settings</CardTitle>
          <CardDescription>
            More configuration options will be added here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Additional settings such as API key management, processing preferences, 
            and notification settings will be implemented here.
          </p>
        </CardContent>
      </Card>

      {/* Help Section */}
      <HelpSection
        title="System Settings"
        description="Configure AI agents, models, and system preferences. This module allows you to customize the AI processing behavior and system configuration for optimal job processing performance."
        features={[
          "Select and configure AI agents (OpenAI, Grok, Gemini, DeepSeek, Qwen, Z.ai, Claude)",
          "Choose specific AI models for different tasks and optimize for performance",
          "Test AI agent connectivity and performance with real-time validation",
          "Sync settings between frontend and backend for consistency",
          "Monitor AI agent status, capabilities, and token usage"
        ]}
        endResults={[
          "Configured AI agent and model settings applied across all processing modules",
          "Validated AI connectivity ensuring reliable job processing",
          "Synchronized settings between frontend and backend systems",
          "Optimized AI performance for job description extraction and analysis",
          "Consistent AI behavior across 'AI Job Processing (JSON)' and resume matching"
        ]}
        workflow={[
          "Select your preferred AI agent from the dropdown (defaults to OpenAI)",
          "Choose the specific model for that agent based on your needs",
          "Test the AI agent to ensure connectivity and performance",
          "Use 'Sync' button to synchronize settings with backend",
          "Monitor AI performance and adjust settings as needed for optimal results"
        ]}
      />
    </div>
  );
}