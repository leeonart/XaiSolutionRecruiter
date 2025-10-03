import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    refreshSettings,
    syncWithBackend
  } = useSettings();

  const [selectedAgent, setSelectedAgent] = useState(currentAiAgent);
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [maxWorkers, setMaxWorkers] = useState('8');
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const modelsLoadedRef = useRef<string | null>(null);

  // Update local state when context changes
  useEffect(() => {
    setSelectedAgent(currentAiAgent);
    setSelectedModel(currentModel);
  }, [currentAiAgent, currentModel]);

  // Load models when component mounts or when selected agent changes
  useEffect(() => {
    if (selectedAgent && modelsLoadedRef.current !== selectedAgent) {
      modelsLoadedRef.current = selectedAgent;
      loadModels(selectedAgent).then((models) => {
        // Set the first model when agent changes (since selectedModel is reset)
        if (models.length > 0) {
          setSelectedModel(models[0]);
          setMessage(`✅ Loaded ${models.length} models for ${getAgentDisplayName(selectedAgent)}`);
        }
      }).catch((error) => {
        console.error('Failed to load models:', error);
        setMessage('❌ Failed to load models for selected agent');
      });
    }
  }, [selectedAgent, loadModels]);

  const getAgentDisplayName = (agent: string) => {
    const displayNames: { [key: string]: string } = {
      'grok': 'Grok (xAI)',
      'gemini': 'Gemini (Google)',
      'deepseek': 'DeepSeek',
      'openai': 'OpenAI GPT',
      'qwen': 'Qwen (Alibaba)',
      'zai': 'Z.ai',
      'claude': 'Claude (Anthropic)'
    };
    return displayNames[agent] || agent.toUpperCase();
  };

  const handleAgentChange = (newAgent: string) => {
    setSelectedAgent(newAgent);
    setSelectedModel(''); // Reset model when agent changes
    setTestResult(null);
    setMessage('');
    // The useEffect will handle loading models for the new agent
  };

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
    setTestResult(null);
    setMessage('');
  };

  const handleSaveSettings = async () => {
    if (!selectedAgent || !selectedModel) {
      setMessage('❌ Please select both an AI agent and a model');
      return;
    }

    setIsSaving(true);
    setMessage('💾 Saving settings...');
    setTestResult(null);
    
    try {
      const success = await setAiAgent(selectedAgent, selectedModel);
      if (success) {
        setMessage(`✅ Settings saved successfully! AI Agent: ${getAgentDisplayName(selectedAgent)}, Model: ${selectedModel}`);
        await refreshSettings();
      } else {
        setMessage(`❌ Failed to save settings: ${error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMessage(`❌ Error saving settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedAgent || !selectedModel) {
      setMessage('❌ Please select both an AI agent and a model before testing');
      return;
    }

    setIsTesting(true);
    setMessage('🧪 Testing AI agent connection...');
    setTestResult(null);

    try {
      const result = await testAiAgent(selectedAgent, selectedModel);
      setTestResult(result);
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (err: any) {
      setMessage(`❌ Test failed: ${err.message}`);
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncWithBackend = async () => {
    setMessage('🔄 Syncing with backend...');
    try {
      const result = await syncWithBackend();
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        setSelectedAgent(currentAiAgent);
        setSelectedModel(currentModel);
      } else {
        setMessage(`❌ ${result.message}`);
      }
    } catch (err: any) {
      setMessage(`❌ Sync failed: ${err.message}`);
    }
  };

  const handleRefreshSettings = async () => {
    setMessage('🔄 Refreshing settings...');
    try {
      await refreshSettings();
      setMessage('✅ Settings refreshed successfully');
    } catch (err: any) {
      setMessage(`❌ Failed to refresh settings: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Configuration</h1>
          <p className="text-gray-600">
            Configure AI agents and models for job processing. Changes will be applied to all AI-enabled applications.
          </p>
        </div>

        {/* Current Configuration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
            <CardDescription>
              View the currently active AI configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-900">Active AI Agent:</span>
                  <p className="text-blue-800">{getAgentDisplayName(currentAiAgent)}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Active Model:</span>
                  <p className="text-blue-800">{currentModel || 'Default model'}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Status:</span>
                  <p className="text-blue-800">{isLoading ? 'Loading...' : 'Ready'}</p>
                </div>
              </div>
            </div>
            
            {/* Sync and Refresh Buttons */}
            <div className="flex gap-3 mt-4">
              <Button 
                variant="outline" 
                onClick={handleSyncWithBackend}
                disabled={isLoading}
                className="flex-1"
              >
                🔄 Sync with Backend
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRefreshSettings}
                disabled={isLoading}
                className="flex-1"
              >
                🔄 Refresh Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Agent and Model Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>AI Agent & Model Configuration</CardTitle>
            <CardDescription>
              Select and configure your AI agent and model preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI Agent Selection */}
            <div>
              <Label htmlFor="ai-agent">AI Agent</Label>
              <Select value={selectedAgent} onValueChange={handleAgentChange} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI Agent" />
                </SelectTrigger>
                <SelectContent>
                  {availableAiAgents.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {getAgentDisplayName(agent)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Select the AI provider for processing job descriptions and resume analysis
              </p>
            </div>
            
            {/* Model Selection */}
            <div>
              <Label htmlFor="model">Model</Label>
              <Select 
                key={`model-select-${selectedAgent}`}
                value={selectedModel} 
                onValueChange={handleModelChange} 
                disabled={isLoading || !selectedAgent}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedAgent ? "Select Model" : "Select AI Agent first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the specific model from the selected AI provider
              </p>
            </div>

            {/* Save and Test Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleSaveSettings}
                disabled={isLoading || isSaving || !selectedAgent || !selectedModel}
                className="flex-1"
              >
                {isSaving ? '💾 Saving...' : '💾 Save Settings'}
              </Button>
              <Button 
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !selectedAgent || !selectedModel}
                className="flex-1"
              >
                {isTesting ? '🧪 Testing...' : '🧪 Test Connection'}
              </Button>
            </div>

            {/* Test Results */}
            {testResult && (
              <div className={`border rounded-lg p-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center">
                  {testResult.success ? (
                    <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    Test Result
                  </span>
                </div>
                <p className={`text-sm mt-2 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Configure system-wide settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="max-workers">Max Workers</Label>
              <Input
                id="max-workers"
                type="number"
                value={maxWorkers}
                onChange={(e) => setMaxWorkers(e.target.value)}
                min="1"
                max="16"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of parallel workers for job processing
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Environment</Label>
                <Input value="Development" disabled />
              </div>
              <div>
                <Label>Database Status</Label>
                <Input value="Connected" disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Google Drive Authentication */}
        <Card>
          <CardHeader>
            <CardTitle>Google Drive Authentication</CardTitle>
            <CardDescription>
              Configure Google Drive integration for file operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Google Drive integration is configured and ready for use.
                </p>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800">
                ✅ Google Drive authentication is set up and operational
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Messages */}
        {message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">{message}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">Error: {error}</p>
          </div>
        )}

        {/* Help Section */}
        <HelpSection 
          title="AI Configuration Help"
          description="Configure your AI agents and models for optimal job processing performance."
          features={[
            "Select from multiple AI providers (OpenAI, Gemini, Grok, etc.)",
            "Choose specific models for different use cases",
            "Test AI connections before saving",
            "Sync settings with backend configuration",
            "Real-time status updates and error handling"
          ]}
          workflow={[
            "1. Select your preferred AI agent from the dropdown",
            "2. Choose the specific model for that agent",
            "3. Test the connection to ensure it's working",
            "4. Save your settings to apply them system-wide",
            "5. Use sync/refresh buttons to update from backend"
          ]}
          endResults={[
            "AI agent and model configured for all job processing",
            "Settings persisted across application restarts",
            "Real-time feedback on configuration status",
            "Seamless switching between different AI providers"
          ]}
        />
      </div>
    </div>
  );
}