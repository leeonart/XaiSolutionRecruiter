export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-600 mb-6">
              XAI Solution ("we," "our," or "us") operates the website https://xai.eastus.cloudapp.azure.com/ (the "Service"). 
              This page informs you about our policies regarding the collection, use, and disclosure of personal data when you use our Service 
              and the choices you have associated with that data.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Information Collection and Use</h2>
            <p className="text-gray-600 mb-4">
              We collect several types of information for various purposes to provide and improve our Service to you.
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Personal Data (name, email, phone numbers)</li>
              <li>Resume data and job information uploaded to our platform</li>
              <li>Usage data and analytics</li>
              <li>Authentication data for Google Drive integration</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Google Drive Integration</h2>
            <p className="text-gray-600 mb-4">
              Our Service integrates with Google Drive to facilitate file operations. When you authenticate with Google Drive:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>We store authentication tokens securely</li>
              <li>We only access files you explicitly select or upload</li>
              <li>We do not store your Google Drive files locally</li>
              <li>You can reset authentication at any time</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Storage and Security</h2>
            <p className="text-gray-600 mb-6">
              We implement appropriate security measures to protect your personal information against unauthorized access, 
              alteration, disclosure, or destruction. Your data is stored securely and is not shared with third parties 
              without your explicit consent.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Usage</h2>
            <p className="text-gray-600 mb-4">
              We use your data to:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Provide and maintain our job processing services</li>
              <li>Process resumes and match them with job requirements</li>
              <li>Provide customer support</li>
              <li>Improve our services and user experience</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Cookies and Tracking</h2>
            <p className="text-gray-600 mb-6">
              We use essential cookies to maintain your session and authenticate your access to our Service. 
              We do not use third-party tracking cookies or analytics tools that collect personal information.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
            <p className="text-gray-600 mb-6">
              You have the right to access, update, or delete your personal information. You can contact us at 
              <a href="mailto:paul@xaisolution.com" className="text-blue-600 hover:text-blue-800 underline">
                paul@xaisolution.com
              </a> to exercise these rights.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
            <p className="text-gray-600 mb-6">
              Our Service may contain links to third-party websites or services that are not owned or controlled by us. 
              We are not responsible for third-party privacy practices or the content of these sites.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-600 mb-6">
              Our Service does not address anyone under the age of 18. We do not knowingly collect personally 
              identifiable information from children under 18.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 font-medium">XAI Solution</p>
              <p className="text-gray-600">Email: <a href="mailto:paul@xaisolution.com" className="text-blue-600 hover:text-blue-800 underline">paul@xaisolution.com</a></p>
              <p className="text-gray-600">Website: <a href="https://xai.eastus.cloudapp.azure.com/" className="text-blue-600 hover:text-blue-800 underline">https://xai.eastus.cloudapp.azure.com/</a></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
