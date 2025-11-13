import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <img src="/logo.svg" alt="Private Pool" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-white">Private Pool</h1>
              <p className="text-sm text-slate-400">Encrypted Governance Feedback</p>
            </div>
          </div>

          {/* Wallet Connect Button */}
          <div className="flex items-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

