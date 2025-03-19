import React, { useState } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS } from '../config'
import { abi } from '../contracts/VotingSystem'

interface HomePageProps {
  onCreatePoll: () => void
  onJoinPoll: (pollId: number, pollCode: string) => void
}

const HomePage: React.FC<HomePageProps> = ({ onCreatePoll, onJoinPoll }) => {
  const { isConnected } = useAccount()
  const [pollCode, setPollCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Check if poll exists
  const { data: pollExists } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getPollDetails',
    args: [BigInt(parseInt(pollCode, 36) || 0)],
    query: {
      enabled: pollCode.length === 6,
    },
  })

  const handleJoinPoll = () => {
    if (pollCode.length !== 6) {
      setError('Please enter a valid 6-character poll code')
      return
    }

    const pollId = parseInt(pollCode, 36)
    console.log('Attempting to join poll:', {
      pollCode,
      pollId,
      pollDetailsResult: pollExists,
      exists: pollExists?.[2]
    })

    if (isNaN(pollId)) {
      setError('Invalid poll code format')
      return
    }

    if (!pollExists?.[2]) {
      setError('Poll not found')
      return
    }

    onJoinPoll(pollId, pollCode)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Welcome to Blockchain Voting</h1>
          <p className="text-gray-600 mb-8">Please connect your MetaMask wallet to continue.</p>
          <div className="flex flex-col items-center space-y-4">
            <img src="/metamask-fox.svg" alt="MetaMask" className="w-24 h-24" />
            <p className="text-sm text-gray-500">Make sure you have MetaMask installed and are connected to Ganache.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Blockchain Voting</h1>
        
        <div className="space-y-6">
          <button
            onClick={onCreatePoll}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create New Poll
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={pollCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase()
                if (value.length <= 6 && /^[A-Z0-9]*$/.test(value)) {
                  setPollCode(value)
                  setError(null)
                }
              }}
              placeholder="Enter 6-character poll code"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={6}
            />
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              onClick={handleJoinPoll}
              disabled={pollCode.length !== 6}
              className={`w-full py-3 px-4 rounded-lg transition-colors ${
                pollCode.length === 6
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Join Poll
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage 