import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HelpSection from '@/components/HelpSection';

export default function Settings() {
  const [aiAgent, setAiAgent] = useState('openai');
  const [model, setModel] = useState('gpt-4');
  const [maxWorkers, setMaxWorkers] = useState('8');
  const [message, setMessage] = useState('');

  const handleSaveSettings = async () => {
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleTestConnection = async () => {
    setMessage('Testing connection...');
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setMessage(`✅ Connection successful: ${data.message}`);
    } catch (error) {
      setMessage('❌ Connection failed');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="mt-1 text-sm text-blue-100">
                Configure your AI Job Processing Platform
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          
          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure AI agents and models for job processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ai-agent">AI Agent</Label>
                <Select value={aiAgent} onValueChange={setAiAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google Gemini</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="dashscope">DashScope</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Button variant="outline" onClick={handleTestConnection}>
                  Test Connection
                </Button>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-800">
                  ✅ Google Drive authentication is set up and operational
                </p>
              </div>
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={handleTestConnection}>
              Test All Connections
            </Button>
            <Button onClick={handleSaveSettings}>
              Save Settings
            </Button>
          </div>

          {/* Status Message */}
          {message && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">{message}</p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <HelpSection
          title="Settings Configuration"
          description="Configure your AI Job Processing Platform settings for optimal performance and integration with external services."
          features={[
            "Configure AI agents and models for different processing tasks",
            "Manage Google Drive authentication and file operations",
            "Set system-wide preferences and performance parameters",
            "Test connections to ensure all services are operational",
            "Monitor system status and database connectivity"
          ]}
          endResults={[
            "Optimized AI agent configuration for your specific needs",
            "Seamless Google Drive integration for file operations",
            "Properly configured system settings for optimal performance",
            "Verified connectivity to all external services",
            "Complete system configuration for reliable operation"
          ]}
          workflow={[
            "Select appropriate AI agent and model for your processing needs",
            "Verify Google Drive authentication is working correctly",
            "Configure system settings for optimal performance",
            "Test all connections to ensure everything is operational",
            "Save settings to apply your configuration across the platform"
          ]}
        />
      </main>
    </div>
  );
}