import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { type Log, type TransactionReceipt, decodeEventLog } from 'viem'
import { CONTRACT_ADDRESS } from '../config'
import { abi } from '../contracts/VotingSystem'

interface CreatePollProps {
  onPollCreated: (pollId: number, pollCode: string) => void
}

export default function CreatePoll({ onPollCreated }: CreatePollProps) {
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const { writeContract, data: hash, isPending, status, error: writeError } = useWriteContract()
  const { 
    data: receipt, 
    isLoading: isConfirming,
    error: receiptError 
  } = useWaitForTransactionReceipt({ 
    hash,
    timeout: 30_000 // 30 seconds timeout
  })
  const publicClient = usePublicClient()

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      let errorMessage = 'Failed to create poll. '
      if (writeError.message.includes('rejected')) {
        errorMessage += 'Transaction was rejected. Please try again.'
      } else if (writeError.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds to complete the transaction.'
      } else {
        errorMessage += 'Please try again.'
      }
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }, [writeError])

  useEffect(() => {
    if (receiptError) {
      let errorMessage = 'Transaction failed. '
      if (receiptError.message.includes('timeout')) {
        errorMessage += 'Transaction took too long to confirm. Please check your transaction in MetaMask.'
      } else {
        errorMessage += 'Please try again.'
      }
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }, [receiptError])

  // Handle transaction confirmation
  useEffect(() => {
    if (!receipt) {
      return
    }

    if (!receipt.status) {
      setError('Transaction failed. Please try again.')
      setIsSubmitting(false)
      return
    }

    try {
      // Find the PollCreated event in the logs
      const pollCreatedEvent = receipt.logs.find(log => {
        try {
          const decoded = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          })
          return decoded.eventName === 'PollCreated'
        } catch (e) {
          return false
        }
      })

      if (!pollCreatedEvent) {
        setError('Poll creation succeeded but event was not found. Please check your recent polls.')
        setIsSubmitting(false)
        return
      }

      const decodedEvent = decodeEventLog({
        abi,
        data: pollCreatedEvent.data,
        topics: pollCreatedEvent.topics,
      })

      const pollId = Number(decodedEvent.args.pollId)
      if (isNaN(pollId)) {
        setError('Failed to get poll ID from event. Please check your recent polls.')
        setIsSubmitting(false)
        return
      }

      const pollCode = pollId.toString(36).toUpperCase().padStart(6, '0')
      onPollCreated(pollId, pollCode)
    } catch (err) {
      console.error('Error processing receipt:', err)
      setError('Error processing transaction receipt. Please check your recent polls.')
      setIsSubmitting(false)
    }
  }, [receipt, onPollCreated])

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const filteredOptions = options.filter(option => option.trim() !== '')
    
    if (filteredOptions.length < 2) {
      setError('Please add at least two options')
      return
    }

    try {
      setIsSubmitting(true)
      setRetryCount(prev => prev + 1)

      await writeContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'createPoll',
        args: [title, filteredOptions],
      })

    } catch (error: any) {
      let errorMessage = 'Failed to create poll. '
      if (error.message.includes('rejected')) {
        errorMessage += 'Transaction was rejected. Please try again.'
      } else if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds to complete the transaction.'
      } else {
        errorMessage += 'Please try again.'
      }
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setIsSubmitting(false)
    setRetryCount(0)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create a New Poll</h2>
        
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

        <div className="mb-6">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Poll Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter poll title"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options
          </label>
          {options.map((option, index) => (
            <div key={index} className="mb-2">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Option ${index + 1}`}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddOption}
            className="mt-2 text-sm text-blue-500 hover:text-blue-600"
          >
            + Add Another Option
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isPending || isConfirming}
            className={`px-6 py-2 rounded-lg text-white ${
              isSubmitting || isPending || isConfirming
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? 'Creating Poll...' : 
             isPending ? 'Waiting for Approval...' :
             isConfirming ? 'Confirming Transaction...' : 
             'Create Poll'}
          </button>
        </div>

        {/* Debug info */}
        <div className="mt-4 text-xs text-gray-500">
          <p>Status: {status}</p>
          <p>Hash: {hash}</p>
          <p>Is Pending: {String(isPending)}</p>
          <p>Is Confirming: {String(isConfirming)}</p>
          <p>Receipt: {receipt ? 'Yes' : 'No'}</p>
          {writeError && <p>Write Error: {writeError.message}</p>}
          {receiptError && <p>Receipt Error: {receiptError.message}</p>}
        </div>
      </form>
    </div>
  )
} 