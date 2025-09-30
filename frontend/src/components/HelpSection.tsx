
interface HelpSectionProps {
  title: string;
  description: string;
  features: string[];
  workflow?: string[];
  endResults?: string[];
}

export default function HelpSection({ title, description, features, workflow, endResults }: HelpSectionProps) {
  return (
    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-blue-900">Help - {title}</h3>
      </div>
      
      <div className="text-blue-800 text-sm space-y-4">
        <p className="font-medium">{description}</p>
        
        <div>
          <h4 className="font-semibold mb-2">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            {features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>
        
        {endResults && endResults.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">End Results:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              {endResults.map((result, index) => (
                <li key={index}>{result}</li>
              ))}
            </ul>
          </div>
        )}
        
        {workflow && workflow.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Typical Workflow:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              {workflow.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}



