import React, { useState } from 'react'
import { useReadContract, useWriteContract, useWatchContractEvent, useAccount } from 'wagmi'
import { CONTRACT_ADDRESS } from '../config'
import { abi } from '../contracts/VotingSystem'

interface PollDetails {
  title: string
  options: readonly string[]
  exists: boolean
}

interface VoteStatus {
  isOpen: boolean
  message: string
  type: 'loading' | 'success' | 'error'
}

interface PollListProps {
  pollId: number
}

const PollList: React.FC<PollListProps> = ({ pollId }) => {
  const { address: userAddress } = useAccount()
  const [isVoting, setIsVoting] = useState(false)
  const [voteStatus, setVoteStatus] = useState<VoteStatus>({
    isOpen: false,
    message: '',
    type: 'loading'
  })

  // Get poll details
  const { data: pollDetails } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getPollDetails',
    args: [BigInt(pollId)],
  })

  // Get vote counts
  const { data: vote0 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getVoteCount',
    args: [BigInt(pollId), 0n],
    query: {
      enabled: pollDetails !== undefined && pollDetails[2], // Check exists field
    },
  })

  const { data: vote1 } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getVoteCount',
    args: [BigInt(pollId), 1n],
    query: {
      enabled: pollDetails !== undefined && pollDetails[2], // Check exists field
    },
  })

  // Has voted check
  const { data: hasVoted } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'hasVoted',
    args: [BigInt(pollId), userAddress || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: pollDetails !== undefined && pollDetails[2] && !!userAddress, // Check exists field
    },
  })

  // Setup voting function
  const { writeContract } = useWriteContract()

  // Watch for vote events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi,
    eventName: 'Voted',
    onLogs: () => {
      setIsVoting(false)
      setVoteStatus({
        isOpen: true,
        message: 'Vote submitted successfully!',
        type: 'success'
      })
      setTimeout(() => {
        setVoteStatus(prev => ({ ...prev, isOpen: false }))
      }, 3000)
    },
  })

  const handleVote = async (optionIndex: number) => {
    if (!userAddress) {
      setVoteStatus({
        isOpen: true,
        message: 'Please connect your wallet first.',
        type: 'error'
      });
      setTimeout(() => {
        setVoteStatus(prev => ({ ...prev, isOpen: false }))
      }, 3000);
      return;
    }

    if (hasVoted) {
      setVoteStatus({
        isOpen: true,
        message: 'You have already voted in this poll.',
        type: 'error'
      });
      setTimeout(() => {
        setVoteStatus(prev => ({ ...prev, isOpen: false }))
      }, 3000);
      return;
    }

    try {
      setIsVoting(true)
      setVoteStatus({
        isOpen: true,
        message: 'Submitting vote...',
        type: 'loading'
      })
      
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'vote',
        args: [BigInt(pollId), BigInt(optionIndex)],
      })
      
    } catch (error: any) {
      console.error('Error voting:', error)
      let errorMessage = 'Failed to submit vote.'
      
      if (error?.message?.includes('User rejected') || error?.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction cancelled by user.'
      }
      
      setVoteStatus({
        isOpen: true,
        message: errorMessage,
        type: 'error'
      })
      setTimeout(() => {
        setVoteStatus(prev => ({ ...prev, isOpen: false }))
      }, 3000)
      setIsVoting(false)
    }
  }

  if (!pollDetails) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading Poll...</h2>
        <p className="text-gray-500">Please wait while we fetch the poll details.</p>
      </div>
    )
  }

  if (!pollDetails[2]) { // Check exists field
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Poll Not Found</h2>
        <p className="text-gray-500">The poll you're looking for doesn't exist.</p>
      </div>
    )
  }

  const [title, options] = pollDetails
  const voteCounts = [Number(vote0 || 0n), Number(vote1 || 0n)]
  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0)

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Status Modal */}
      {voteStatus.isOpen && (
        <div className="fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white animate-fade-in-down z-50"
             style={{
               backgroundColor: voteStatus.type === 'success' ? '#10B981' 
                            : voteStatus.type === 'error' ? '#EF4444'
                            : '#3B82F6'
             }}>
          <div className="flex items-center">
            {voteStatus.type === 'loading' && (
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>{voteStatus.message}</span>
          </div>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="space-y-4">
          {options.map((option, index) => {
            const voteCount = voteCounts[index] || 0
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
            
            return (
              <div key={index} className="relative">
                <button
                  onClick={() => handleVote(index)}
                  disabled={isVoting || hasVoted}
                  className={`w-full text-left px-4 py-3 border rounded-lg ${
                    isVoting || hasVoted
                      ? 'bg-gray-100 cursor-not-allowed'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{option}</span>
                    <span className="text-sm text-gray-500">
                      {voteCount} votes ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </button>
                {/* Progress bar */}
                <div 
                  className="absolute left-0 bottom-0 h-1 bg-blue-500 rounded-b-md transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-6 flex justify-between items-center text-sm text-gray-500">
          <span>Total votes: {totalVotes}</span>
          {hasVoted && (
            <span className="text-green-500">✓ You have voted in this poll</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default PollList 