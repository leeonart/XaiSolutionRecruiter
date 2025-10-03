import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface SettingsContextType {
  currentAiAgent: string;
  currentModel: string;
  availableAiAgents: string[];
  availableModels: string[];
  isLoading: boolean;
  isLoadingModels: boolean;
  error: string | null;
  setAiAgent: (agent: string, model?: string) => Promise<boolean>;
  testAiAgent: (agent: string, model?: string) => Promise<{success: boolean, message: string}>;
  loadModels: (agent: string) => Promise<string[]>;
  refreshSettings: () => Promise<void>;
  syncWithBackend: () => Promise<{success: boolean, message: string, previousAgent?: string}>;
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
  const [isLoadingModels, setIsLoadingModels] = useState(false);
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
      
      // Set the current model from backend response
      if (agents.current_model && agents.current_model !== 'default') {
        setCurrentModel(agents.current_model);
        localStorage.setItem('ai_model', agents.current_model);
      }
      
      // Update localStorage to match backend
      localStorage.setItem('ai_agent', agents.current_agent);
      
      // Load models for current agent - will be loaded when needed
      
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
        // Models will be loaded when needed
        
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

  const getDefaultModels = (agent: string): string[] => {
    const defaultModels: { [key: string]: string[] } = {
      'openai': ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      'grok': ['grok-beta'],
      'gemini': ['gemini-pro', 'gemini-pro-vision'],
      'deepseek': ['deepseek-chat'],
      'qwen': ['qwen-turbo'],
      'zai': ['zai-large']
    };
    return defaultModels[agent] || ['default'];
  };


  const loadModels = useCallback(async (agent: string): Promise<string[]> => {
    try {
      setIsLoadingModels(true);
      setError(null);
      
      const response = await fetch(`/api/ai-models/${agent}`);
      const data = await response.json();
      
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models);
        return data.models;
      } else {
        setAvailableModels([]);
        return [];
      }
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setError(err.message || 'Failed to load models');
      setAvailableModels([]);
      return [];
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

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
      
      // Set the current model from backend response
      const currentModel = agents.current_model || 'default';
      setCurrentModel(currentModel);
      localStorage.setItem('ai_model', currentModel);
      
      // Load models for current agent - will be loaded when needed
      
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
    isLoadingModels,
    error,
    setAiAgent,
    testAiAgent,
    loadModels,
    refreshSettings,
    syncWithBackend,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
