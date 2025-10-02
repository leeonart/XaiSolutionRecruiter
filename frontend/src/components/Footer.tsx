import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">XAI Solution</h3>
            <p className="text-gray-300 mb-4">
              AI-powered job processing platform for streamlined recruitment and resume management.
            </p>
            <div className="space-y-2">
              <p className="text-gray-300">
                Website: <a 
                  href="https://xai.eastus.cloudapp.azure.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-100 underline"
                >
                  https://xai.eastus.cloudapp.azure.com/
                </a>
              </p>
              <p className="text-gray-300">
                Email: <a 
                  href="mailto:paul@xaisolution.com"
                  className="text-blue-300 hover:text-blue-100 underline"
                >
                  paul@xaisolution.com
                </a>
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/privacy" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to="/settings" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Settings
                </Link>
              </li>
              <li>
                <Link 
                  to="/operations" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Operations
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-gray-300">
              <li>AI Job Processing</li>
              <li>Resume Management</li>
              <li>Google Drive Integration</li>
              <li>Intelligent Matching</li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-300">
            © {new Date().getFullYear()} XAI Solution. All rights reserved.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Powered by artificial intelligence for modern recruitment workflows.
          </p>
        </div>
      </div>
    </footer>
  );
}
