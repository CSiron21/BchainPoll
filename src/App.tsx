import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type Chain } from 'viem'
import { useEffect, useState } from 'react'
import { useConnect, useAccount } from 'wagmi'
import PollList from './components/PollList'
import CreatePoll from './components/CreatePoll'
import HomePage from './components/HomePage'
import DisplayPoll from './components/DisplayPoll'

// Define Ganache chain
const ganacheChain = {
  id: 31337,
  name: 'Hardhat',
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
} as const satisfies Chain

// Get a project ID at https://cloud.walletconnect.com
const projectId = 'e21223acff450e46a975c725b4c93433'

const metadata = {
  name: 'Blockchain Voting',
  description: 'A decentralized voting system',
  url: 'http://localhost:5173', 
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Create wagmi config
const config = defaultWagmiConfig({
  chains: [ganacheChain],
  projectId,
  metadata,
  ssr: false
})

// Create web3modal
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  themeMode: 'light'
})

const queryClient = new QueryClient()

function ConnectWallet() {
  const { connect, connectors } = useConnect()
  const { isConnected } = useAccount()

  useEffect(() => {
    // Try to connect to MetaMask on component mount if not already connected
    if (!isConnected) {
      const injectedConnector = connectors.find(c => c.name === 'MetaMask')
      if (injectedConnector) {
        connect({ connector: injectedConnector })
      } else {
        console.log('MetaMask not found. Please install MetaMask.')
        alert('Please install MetaMask to use this application.')
      }
    }
  }, [connect, connectors, isConnected])

  return null
}

type View = 'home' | 'create' | 'poll'

function MainContent() {
  const [activeView, setActiveView] = useState<View>('home')
  const [activePollId, setActivePollId] = useState<number | null>(null)
  const [activePollCode, setActivePollCode] = useState<string | null>(null)
  const { isConnected } = useAccount()

  const handleCreatePoll = () => {
    setActiveView('create')
  }

  const handlePollCreated = (pollId: number, pollCode: string) => {
    setActivePollId(pollId)
    setActivePollCode(pollCode)
    setActiveView('poll')
  }

  const handleBackToHome = () => {
    setActiveView('home')
    setActivePollId(null)
    setActivePollCode(null)
  }

  useEffect(() => {
    console.log('Active view:', activeView)
    console.log('Active poll ID:', activePollId)
    console.log('Active poll code:', activePollCode)
  }, [activeView, activePollId, activePollCode])

  return (
    <div className="min-h-screen bg-gray-100">
      {activeView !== 'home' && (
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-800">Blockchain Voting</h1>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleBackToHome}
                  className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeView === 'home' && (
          <HomePage
            onCreatePoll={handleCreatePoll}
            onJoinPoll={handlePollCreated}
          />
        )}
        {activeView === 'create' && (
          <CreatePoll onPollCreated={handlePollCreated} />
        )}
        {activeView === 'poll' && activePollId !== null && activePollCode !== null && (
          <DisplayPoll pollId={activePollId} pollCode={activePollCode} />
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectWallet />
        <MainContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App 