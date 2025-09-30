import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

export interface SettingsContextType {
  currentAiAgent: string;
  currentModel: string;
  availableAiAgents: string[];
  availableModels: string[];
  isLoading: boolean;
  error: string | null;
  setAiAgent: (agent: string, model?: string) => Promise<boolean>;
  testAiAgent: (agent: string, model?: string) => Promise<{success: boolean, message: string}>;
  refreshSettings: () => Promise<void>;
  syncWithBackend: () => Promise<{success: boolean, message: string, previousAgent?: string}>;
  loadModels: (agent: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [currentAiAgent, setCurrentAiAgent] = useState<string>('openai');
  const [currentModel, setCurrentModel] = useState<string>('');
  const [availableAiAgents, setAvailableAiAgents] = useState<string[]>(['grok', 'gemini', 'deepseek', 'openai', 'qwen', 'zai']);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch from API first to get current backend status
      const agents = await apiClient.getAiAgents();
      setCurrentAiAgent(agents.current_agent);
      setAvailableAiAgents(agents.available_agents);
      
      // Update localStorage to match backend
      localStorage.setItem('ai_agent', agents.current_agent);
      
      // Load models for current agent
      await loadModels(agents.current_agent);
      
      // Set model from localStorage if available, but backend takes precedence
      const savedModel = localStorage.getItem('ai_model');
      if (savedModel && savedModel !== '') {
        setCurrentModel(savedModel);
      }
      
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError(err.message || 'Failed to load settings');
      
      // Fallback to localStorage on error
      const savedAgent = localStorage.getItem('ai_agent');
      const savedModel = localStorage.getItem('ai_model');
      if (savedAgent) {
        setCurrentAiAgent(savedAgent);
      }
      if (savedModel) {
        setCurrentModel(savedModel);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setAiAgent = async (agent: string, model?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiClient.selectAiAgent(agent, model);
      
      if (result.status === 'success') {
        // Update local state
        setCurrentAiAgent(agent);
        if (model) {
          setCurrentModel(model);
          localStorage.setItem('ai_model', model);
        } else {
          setCurrentModel(''); // Clear model if not specified
          localStorage.removeItem('ai_model');
        }
        
        // Save to localStorage for persistence
        localStorage.setItem('ai_agent', agent);
        
        // Refresh models for the new agent
        await loadModels(agent);
        
        return true;
      } else {
        setError(result.message || 'Failed to set AI agent');
        return false;
      }
    } catch (err: any) {
      console.error('Failed to set AI agent:', err);
      setError(err.message || 'Failed to set AI agent');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const testAiAgent = async (agent: string, model?: string): Promise<{success: boolean, message: string}> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiClient.testAiAgent(agent, model);
      
      return {
        success: result.success,
        message: result.message
      };
    } catch (err: any) {
      console.error('AI agent test failed:', err);
      setError(err.message || 'AI agent test failed');
      return {
        success: false,
        message: err.message || 'AI agent test failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const loadModels = async (agent: string): Promise<void> => {
    try {
      const result = await apiClient.getAiModels(agent);
      setAvailableModels(result.models);
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setAvailableModels([]);
    }
  };

  const refreshSettings = async (): Promise<void> => {
    await loadSettings();
  };

  // Add a function to sync with backend without full reload
  const syncWithBackend = async (): Promise<{success: boolean, message: string, previousAgent?: string}> => {
    try {
      const previousAgent = currentAiAgent;
      const previousModel = currentModel;
      
      // Get current backend status
      const agents = await apiClient.getAiAgents();
      setCurrentAiAgent(agents.current_agent);
      setAvailableAiAgents(agents.available_agents);
      localStorage.setItem('ai_agent', agents.current_agent);
      
      // Load models for current agent
      await loadModels(agents.current_agent);
      
      // Get the current model from backend by testing the agent
      try {
        const testResult = await apiClient.testAiAgent(agents.current_agent);
        const currentModel = testResult.model || 'default';
        setCurrentModel(currentModel);
        localStorage.setItem('ai_model', currentModel);
        
        const agentChanged = previousAgent !== agents.current_agent;
        const modelChanged = previousModel !== currentModel;
        
        let message = `Synced successfully! Current: ${agents.current_agent.toUpperCase()}`;
        if (currentModel && currentModel !== 'default') {
          message += ` (${currentModel})`;
        }
        
        if (agentChanged) {
          message += ` - Agent changed from ${previousAgent.toUpperCase()}`;
        }
        if (modelChanged) {
          message += ` - Model changed from ${previousModel || 'default'}`;
        }
        
        return {
          success: true,
          message,
          previousAgent
        };
      } catch (testErr) {
        // If test fails, still return success but with limited info
        const agentChanged = previousAgent !== agents.current_agent;
        return {
          success: true,
          message: agentChanged 
            ? `Synced successfully! Agent changed from ${previousAgent.toUpperCase()} to ${agents.current_agent.toUpperCase()}`
            : `Synced successfully! Current agent: ${agents.current_agent.toUpperCase()}`,
          previousAgent
        };
      }
    } catch (err: any) {
      console.error('Failed to sync with backend:', err);
      return {
        success: false,
        message: `Sync failed: ${err.message || 'Unknown error'}`
      };
    }
  };

  const value: SettingsContextType = {
    currentAiAgent,
    currentModel,
    availableAiAgents,
    availableModels,
    isLoading,
    error,
    setAiAgent,
    testAiAgent,
    refreshSettings,
    syncWithBackend,
    loadModels
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
