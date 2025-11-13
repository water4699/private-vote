import { useState, useEffect } from 'react';
import { useReadContract, useChainId } from 'wagmi';
import { getContractAddress } from '../config/contract';
import { GOVERNANCE_FEEDBACK_ABI } from '../abi/GovernanceFeedback';

interface SessionListProps {
  refresh: number;
  onSelectSession: (sessionId: number) => void;
}

export function SessionList({ refresh, onSelectSession }: SessionListProps) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const [sessionIds, setSessionIds] = useState<number[]>([]);

  const { data: sessionCount, refetch } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GOVERNANCE_FEEDBACK_ABI,
    functionName: 'getSessionCount',
  });

  useEffect(() => {
    refetch();
  }, [refresh, refetch]);

  useEffect(() => {
    if (sessionCount !== undefined) {
      const count = Number(sessionCount);
      setSessionIds(Array.from({ length: count }, (_, i) => count - 1 - i));
    }
  }, [sessionCount]);

  if (!sessionCount || sessionCount === 0n) {
    return (
      <div className="card text-center py-12">
        <p className="text-slate-400 text-lg">No feedback sessions yet</p>
        <p className="text-slate-500 text-sm mt-2">Create the first session to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white mb-4">
        Feedback Sessions ({sessionIds.length})
      </h2>
      <div className="grid gap-4">
        {sessionIds.map((sessionId) => (
          <SessionCard key={sessionId} sessionId={sessionId} onSelect={onSelectSession} />
        ))}
      </div>
    </div>
  );
}

interface SessionCardProps {
  sessionId: number;
  onSelect: (sessionId: number) => void;
}

function SessionCard({ sessionId, onSelect }: SessionCardProps) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  
  const { data: sessionInfo } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: GOVERNANCE_FEEDBACK_ABI,
    functionName: 'getSessionInfo',
    args: [BigInt(sessionId)],
  });

  if (!sessionInfo) return null;

  const [title, description, startTime, endTime, , finalized, feedbackCount] = sessionInfo;
  
  const now = Math.floor(Date.now() / 1000);
  const isActive = Number(startTime) <= now && now <= Number(endTime);
  const isEnded = now > Number(endTime);

  const statusColor = finalized
    ? 'bg-green-900 text-green-300'
    : isActive
    ? 'bg-blue-900 text-blue-300'
    : isEnded
    ? 'bg-yellow-900 text-yellow-300'
    : 'bg-slate-700 text-slate-300';

  const statusText = finalized
    ? 'Finalized'
    : isActive
    ? 'Active'
    : isEnded
    ? 'Ended'
    : 'Pending';

  return (
    <div
      className="card hover:border-primary-500 cursor-pointer transition-all"
      onClick={() => onSelect(sessionId)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm line-clamp-2">{description}</p>
        </div>
        <span className={`${statusColor} px-3 py-1 rounded-full text-xs font-semibold ml-4`}>
          {statusText}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400 border-t border-slate-700 pt-4">
        <div>
          <span className="font-medium text-white">{feedbackCount.toString()}</span> feedback
          submissions
        </div>
        <div>
          Ends: {new Date(Number(endTime) * 1000).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

