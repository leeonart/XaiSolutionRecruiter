import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HelpSection from '@/components/HelpSection';

export default function Operations() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data for different operations
  const [mtbData, setMtbData] = useState({
    csv_path: 'https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8',
    category: 'ALL',
    state: 'ALL',
    client_rating: 'ALL',
    extract_ids: true
  });

  const [combineData, setCombineData] = useState({
    folder_path: '/app/data/JobDescription_YYYYMMDD',
    output_path: '/app/output/combined_text.txt',
    file_types: 'pdf,docx'
  });

  const [pipelineData, setPipelineData] = useState({
    csv_path: 'https://docs.google.com/spreadsheets/d/1AhE4-fNSU-lBE7zOj9Cc2rYfcn2DSxTD9u6Ru7iVsQ8',
    category: 'ALL',
    state: 'ALL',
    client_rating: 'ALL',
    extract_ids: true
  });

  const handleOperation = async (operation: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Simulate operation for now
      setTimeout(() => {
        setResult({
          operation,
          status: 'success',
          message: `${operation} completed successfully`,
          timestamp: new Date().toISOString()
        });
        setLoading(false);
      }, 2000);
    } catch (err) {
      setError(`Failed to execute ${operation}: ${err}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">Operations</h1>
              <p className="mt-1 text-sm text-blue-100">
                System operations and maintenance tools
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          
          {/* MTB Processing */}
          <Card>
            <CardHeader>
              <CardTitle>MTB Processing</CardTitle>
              <CardDescription>
                Process Master Tracking Board CSV files and extract job IDs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mtb-csv">CSV Path</Label>
                  <Input
                    id="mtb-csv"
                    value={mtbData.csv_path}
                    onChange={(e) => setMtbData({...mtbData, csv_path: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="mtb-category">Category</Label>
                  <Select value={mtbData.category} onValueChange={(value) => setMtbData({...mtbData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mtb-state">State</Label>
                  <Select value={mtbData.state} onValueChange={(value) => setMtbData({...mtbData, state: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All States</SelectItem>
                      <SelectItem value="CA">California</SelectItem>
                      <SelectItem value="NY">New York</SelectItem>
                      <SelectItem value="TX">Texas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mtb-rating">Client Rating</Label>
                  <Select value={mtbData.client_rating} onValueChange={(value) => setMtbData({...mtbData, client_rating: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Ratings</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={() => handleOperation('MTB Processing')}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Process MTB'}
              </Button>
            </CardContent>
          </Card>

          {/* File Combination */}
          <Card>
            <CardHeader>
              <CardTitle>File Combination</CardTitle>
              <CardDescription>
                Combine multiple job description files into a single text file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="combine-folder">Folder Path</Label>
                  <Input
                    id="combine-folder"
                    value={combineData.folder_path}
                    onChange={(e) => setCombineData({...combineData, folder_path: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="combine-output">Output Path</Label>
                  <Input
                    id="combine-output"
                    value={combineData.output_path}
                    onChange={(e) => setCombineData({...combineData, output_path: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="combine-types">File Types</Label>
                  <Input
                    id="combine-types"
                    value={combineData.file_types}
                    onChange={(e) => setCombineData({...combineData, file_types: e.target.value})}
                    placeholder="pdf,docx,txt"
                  />
                </div>
              </div>
              <Button 
                onClick={() => handleOperation('File Combination')}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Combining...' : 'Combine Files'}
              </Button>
            </CardContent>
          </Card>

          {/* Pipeline Processing */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Processing</CardTitle>
              <CardDescription>
                Run complete pipeline: MTB → Download → Process → Combine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pipeline-csv">CSV Path</Label>
                  <Input
                    id="pipeline-csv"
                    value={pipelineData.csv_path}
                    onChange={(e) => setPipelineData({...pipelineData, csv_path: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="pipeline-category">Category</Label>
                  <Select value={pipelineData.category} onValueChange={(value) => setPipelineData({...pipelineData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={() => handleOperation('Pipeline Processing')}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Running Pipeline...' : 'Run Complete Pipeline'}
              </Button>
            </CardContent>
          </Card>

          {/* System Operations */}
          <Card>
            <CardHeader>
              <CardTitle>System Operations</CardTitle>
              <CardDescription>
                Maintenance and diagnostic operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => handleOperation('Database Cleanup')}
                  disabled={loading}
                  variant="outline"
                >
                  Database Cleanup
                </Button>
                <Button 
                  onClick={() => handleOperation('Cache Clear')}
                  disabled={loading}
                  variant="outline"
                >
                  Clear Cache
                </Button>
                <Button 
                  onClick={() => handleOperation('Health Check')}
                  disabled={loading}
                  variant="outline"
                >
                  Health Check
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {(result || error) && (
            <Card>
              <CardHeader>
                <CardTitle>Operation Result</CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                ) : result && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm text-green-800">
                      <strong>{result.operation}</strong>: {result.message}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Completed at: {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Help Section */}
        <HelpSection
          title="Operations Center"
          description="The Operations Center provides comprehensive tools for system maintenance, data processing, and workflow automation."
          features={[
            "Process Master Tracking Board CSV files and extract job IDs",
            "Combine multiple job description files into unified text files",
            "Run complete processing pipelines from MTB to final output",
            "Perform system maintenance and diagnostic operations",
            "Monitor and manage data processing workflows"
          ]}
          endResults={[
            "Processed MTB data with extracted job IDs for further processing",
            "Combined job description files ready for AI analysis",
            "Complete pipeline execution from data source to final output",
            "Optimized system performance through maintenance operations",
            "Streamlined data processing workflows with automated operations"
          ]}
          workflow={[
            "Configure MTB processing parameters for your specific data source",
            "Set up file combination settings for job description processing",
            "Execute complete pipelines for end-to-end data processing",
            "Perform regular system maintenance to ensure optimal performance",
            "Monitor operation results and adjust configurations as needed"
          ]}
        />
      </main>
    </div>
  );
}