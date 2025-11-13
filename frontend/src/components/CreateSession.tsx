import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { getContractAddress } from '../config/contract';
import { GOVERNANCE_FEEDBACK_ABI } from '../abi/GovernanceFeedback';

interface CreateSessionProps {
  onSuccess: () => void;
}

export function CreateSession({ onSuccess }: CreateSessionProps) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  
  const [isOpen, setIsOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationHours, setDurationHours] = useState(24);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = Math.floor(Date.now() / 1000);
    const startTime = now;
    const endTime = now + durationHours * 3600;

    try {
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: GOVERNANCE_FEEDBACK_ABI,
        functionName: 'createSession',
        args: [proposalTitle, description, BigInt(startTime), BigInt(endTime)],
        gas: BigInt(500000), // Explicit gas limit
      });
    } catch (error) {
      console.error('[CreateSession] Error creating session:', error);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      setIsOpen(false);
      setProposalTitle('');
      setDescription('');
      setDurationHours(24);
      onSuccess();
    }
  }, [isSuccess, onSuccess]); // onSuccess is stable due to useCallback in parent

  return (
    <div>
      <button onClick={() => setIsOpen(true)} className="btn-primary">
        + Create Feedback Session
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Create Feedback Session</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Proposal Title</label>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="input"
                  placeholder="Enter proposal title"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Describe the feedback context"
                  required
                />
              </div>

              <div>
                <label className="label">Duration (hours)</label>
                <input
                  type="number"
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="input"
                  min="1"
                  max="168"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Session will be active for {durationHours} hour(s)
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isPending || isConfirming}
                  className="btn-primary flex-1"
                >
                  {isPending || isConfirming ? 'Creating...' : 'Create Session'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

