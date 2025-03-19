import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWatchContractEvent, useAccount, useReadContracts, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESS } from '../config'
import { abi } from '../contracts/VotingSystem'

interface DisplayPollProps {
  pollId: number
  pollCode: string
}

interface PollDetails {
  title: string
  options: readonly string[]
  exists: boolean
}

export default function DisplayPoll({ pollId, pollCode }: DisplayPollProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [pollDetails, setPollDetails] = useState<PollDetails | null>(null)
  const [voteCounts, setVoteCounts] = useState<bigint[]>([])
  const [hasVoted, setHasVoted] = useState(false)
  const { address } = useAccount()

  // Read poll details
  const { data: pollDetailsData, isError: isPollError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getPollDetails',
    args: [BigInt(pollId)],
  })

  // Read user's vote status
  const { data: hasVotedData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'hasVoted',
    args: [BigInt(pollId), address as `0x${string}`],
  })

  // Read vote counts
  const { data: voteCountsData } = useReadContracts({
    contracts: pollDetails?.options.map((_, index) => ({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'getVoteCount' as const,
      args: [BigInt(pollId), BigInt(index)] as const,
    })) || [],
  })

  // Write contract for voting
  const { 
    writeContract, 
    error: writeError,
    isPending,
    status,
    data: voteHash
  } = useWriteContract()

  const { 
    data: voteReceipt,
    isLoading: isVoteConfirming
  } = useWaitForTransactionReceipt({
    hash: voteHash,
    onSuccess: () => {
      // Force a refresh of vote counts and hasVoted status
      if (voteReceipt?.status === 'success') {
        // Refetch vote counts
        refetchVoteCounts()
        // Refetch hasVoted status
        refetchHasVoted()
      }
    }
  })

  const isConfirming = status === 'pending' || isVoteConfirming

  // Watch for vote events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi,
    eventName: 'Voted',
    onLogs: () => {
      console.log('Vote event detected')
      // Force a refresh of vote counts and hasVoted status
      refetchVoteCounts()
      refetchHasVoted()
    },
  })

  // Add refetch functions
  const { refetch: refetchVoteCounts } = useReadContracts({
    contracts: pollDetails?.options.map((_, index) => ({
      address: CONTRACT_ADDRESS,
      abi,
      functionName: 'getVoteCount' as const,
      args: [BigInt(pollId), BigInt(index)] as const,
    })) || [],
  })

  const { refetch: refetchHasVoted } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'hasVoted',
    args: [BigInt(pollId), address as `0x${string}`],
  })

  // Update poll details when data changes
  useEffect(() => {
    if (pollDetailsData) {
      setPollDetails({
        title: pollDetailsData[0],
        options: pollDetailsData[1],
        exists: pollDetailsData[2],
      })
    }
  }, [pollDetailsData])

  // Update user voted status when data changes
  useEffect(() => {
    if (hasVotedData !== undefined) {
      setHasVoted(hasVotedData)
    }
  }, [hasVotedData])

  // Update vote counts when data changes
  useEffect(() => {
    if (voteCountsData) {
      const counts = voteCountsData.map(data => 
        data.status === 'success' ? data.result as bigint : 0n
      )
      setVoteCounts(counts)
    }
  }, [voteCountsData])

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      let errorMessage = 'Failed to submit vote. '
      if (writeError.message.includes('rejected')) {
        errorMessage += 'Transaction was rejected. Please try again.'
      } else if (writeError.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds to complete the transaction.'
      } else {
        errorMessage += 'Please try again.'
      }
      setError(errorMessage)
      setIsVoting(false)
    }
  }, [writeError])

  const handleVote = async () => {
    if (selectedOption === null) {
      setError('Please select an option')
      return
    }

    try {
      setIsVoting(true)
      setError(null)
      setRetryCount(prev => prev + 1)

      await writeContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'vote',
        args: [BigInt(pollId), BigInt(selectedOption)],
      })

    } catch (error: any) {
      let errorMessage = 'Failed to submit vote. '
      if (error.message.includes('rejected')) {
        errorMessage += 'Transaction was rejected. Please try again.'
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds to complete the transaction.'
      } else {
        errorMessage += 'Please try again.'
      }
      setError(errorMessage)
      setIsVoting(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setIsVoting(false)
    setRetryCount(0)
  }

  if (isPollError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <p className="text-center text-red-600">Error loading poll details</p>
        </div>
      </div>
    )
  }

  if (!pollDetails) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <p className="text-center text-gray-600">Loading poll details...</p>
        </div>
      </div>
    )
  }

  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0n)

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{pollDetails.title}</h2>
          <p className="text-sm text-gray-500 mt-2">Poll Code: {pollCode}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
            {retryCount > 0 && (
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 text-sm text-blue-500 hover:text-blue-600"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          {pollDetails.options.map((option, index) => {
            const voteCount = voteCounts[index] || 0n
            const percentage = totalVotes > 0n
              ? Math.round(Number((voteCount * 100n) / totalVotes))
              : 0

            return (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="poll-option"
                      disabled={hasVoted}
                      checked={selectedOption === index}
                      onChange={() => setSelectedOption(index)}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="text-gray-900">{option}</span>
                  </label>
                  <span className="text-gray-500">
                    {voteCount.toString()} votes
                    {totalVotes > 0n && ` (${percentage}%)`}
                  </span>
                </div>
                {totalVotes > 0n && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 rounded-full h-2"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!hasVoted && (
          <div className="mt-6">
            <button
              onClick={handleVote}
              disabled={isVoting || isPending || isConfirming || selectedOption === null}
              className={`w-full px-6 py-2 rounded-lg text-white ${
                isVoting || isPending || isConfirming || selectedOption === null
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isVoting ? 'Submitting Vote...' :
               isPending ? 'Waiting for Approval...' :
               isConfirming ? 'Confirming Vote...' :
               'Submit Vote'}
            </button>
          </div>
        )}

        {hasVoted && (
          <div className="mt-6 text-center">
            <p className="text-green-600">Thank you for voting!</p>
          </div>
        )}

        <div className="mt-6 text-center text-gray-500">
          Total Votes: {totalVotes.toString()}
        </div>

        {/* Debug info */}
        <div className="mt-4 text-xs text-gray-500">
          <p>Poll ID: {pollId}</p>
          <p>Has voted: {String(hasVoted)}</p>
          <p>Selected option: {selectedOption !== null ? selectedOption : 'none'}</p>
          <p>Vote counts: {voteCounts.map(c => c.toString()).join(', ')}</p>
          <p>Is Voting: {String(isVoting)}</p>
          <p>Is Pending: {String(isPending)}</p>
          <p>Is Confirming: {String(isConfirming)}</p>
          {writeError && <p>Error: {writeError.message}</p>}
        </div>
      </div>
    </div>
  )
} 