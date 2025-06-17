
import { RevenueCatSimpleTest } from '../components/RevenueCatSimpleTest'

const RevenueCatSimpleTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">RevenueCat Simple Test</h1>
        <RevenueCatSimpleTest />
      </div>
    </div>
  )
}

export default RevenueCatSimpleTestPage
