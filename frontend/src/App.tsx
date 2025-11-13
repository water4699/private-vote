import { useState, useCallback } from 'react';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from './config/wagmi';
import { Header } from './components/Header';
import { CreateSession } from './components/CreateSession';
import { SessionList } from './components/SessionList';
import { SessionDetail } from './components/SessionDetail';
import { NetworkIndicator } from './components/NetworkIndicator';
import { useFhevm } from './hooks/useFhevm';

const queryClient = new QueryClient();

function AppContent() {
  const { isConnected } = useAccount();
  const { status: fhevmStatus, error: fhevmError } = useFhevm();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const handleSessionCreated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleSelectSession = useCallback((sessionId: number) => {
    setSelectedSessionId(sessionId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSessionId(null);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Show FHEVM initialization status
  const showFhevmStatus = isConnected && (fhevmStatus === "loading" || fhevmStatus === "error");

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      
      {/* FHEVM Status Banner */}
      {showFhevmStatus && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {fhevmStatus === "loading" && (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <div>
                  <p className="text-blue-300 font-medium">Initializing FHEVM...</p>
                  <p className="text-blue-400/70 text-sm">Loading encryption system from CDN</p>
                </div>
              </div>
            </div>
          )}
          {/* Temporarily hide FHEVM error - will fix later */}
          {false && fhevmStatus === "error" && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <div>
                <p className="text-red-300 font-medium">Failed to initialize FHEVM</p>
                <p className="text-red-400/70 text-sm">{fhevmError?.message || "Unknown error"}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Privacy-Preserving Governance Feedback
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Collect encrypted satisfaction scores from DAO members using Fully Homomorphic Encryption.
            Individual votes remain private while revealing aggregate results.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-white mb-2">Fully Private</h3>
            <p className="text-slate-400 text-sm">
              All satisfaction scores are encrypted using FHE technology
            </p>
          </div>
          <div className="card text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">Aggregate Results</h3>
            <p className="text-slate-400 text-sm">
              Calculate average scores without revealing individual feedback
            </p>
          </div>
          <div className="card text-center">
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="text-lg font-semibold text-white mb-2">Time-Bound</h3>
            <p className="text-slate-400 text-sm">
              Define start and end times for feedback collection periods
            </p>
          </div>
        </div>

        {/* Create Session Button */}
        <div className="flex justify-center mb-8">
          <CreateSession onSuccess={handleSessionCreated} />
        </div>

        {/* Session List */}
        <SessionList refresh={refreshTrigger} onSelectSession={handleSelectSession} />

        {/* Session Detail Modal */}
        {selectedSessionId !== null && (
          <SessionDetail sessionId={selectedSessionId} onClose={handleCloseDetail} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-400 text-sm">
            <p>Built with ❤️ using Zama's FHEVM technology</p>
            <p className="mt-2">
              <a
                href="https://docs.zama.ai/fhevm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300"
              >
                Learn more about FHEVM
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Network Indicator */}
      <NetworkIndicator />
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en-US">
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

