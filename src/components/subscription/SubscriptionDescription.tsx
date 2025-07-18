import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown, Users, Shield } from 'lucide-react';

interface SubscriptionTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
  savings?: string;
}

export const SubscriptionDescription: React.FC = () => {
  const subscriptionTiers: SubscriptionTier[] = [
    {
      name: 'StyleAI Pro Monthly',
      price: '$9.99',
      period: 'per month',
      features: [
        'Unlimited AI style analysis',
        'Advanced style recommendations',
        'Personalized color analysis',
        'Body type insights',
        'Style evolution tracking',
        'Priority customer support',
        'Ad-free experience',
        'Export style reports'
      ]
    },
    {
      name: 'StyleAI Pro Annual',
      price: '$59.99',
      period: 'per year',
      savings: 'Save 50%',
      popular: true,
      features: [
        'Everything in Monthly plan',
        'Exclusive premium features',
        'Advanced AI algorithms',
        'Detailed style breakdowns',
        'Professional styling tips',
        'Seasonal recommendations',
        'Wardrobe optimization',
        'Style consultation access'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-white mb-4">
          Choose Your StyleAI Plan
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Unlock unlimited AI-powered style analysis and personalized recommendations to transform your fashion journey.
        </p>
      </motion.div>

      {/* Subscription Tiers */}
      <div className="grid md:grid-cols-2 gap-6">
        {subscriptionTiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative bg-gradient-to-br from-gray-800 to-gray-900 border rounded-2xl p-6 ${
              tier.popular ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-gray-700'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Most Popular
                </div>
              </div>
            )}

            {tier.savings && (
              <div className="absolute -top-2 -right-2">
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {tier.savings}
                </div>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                <span className="text-gray-400">{tier.period}</span>
              </div>
            </div>

            <div className="space-y-3">
              {tier.features.map((feature, featureIndex) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (index * 0.1) + (featureIndex * 0.05) }}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                </motion.div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full mt-6 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                tier.popular
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              {tier.popular ? 'Get Started' : 'Choose Plan'}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Additional Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4 text-center">
          What You Get with StyleAI Pro
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h4 className="font-semibold text-white mb-2">Unlimited Analysis</h4>
            <p className="text-gray-400 text-sm">
              Get unlimited AI-powered style analysis with detailed insights and recommendations.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="font-semibold text-white mb-2">Premium Features</h4>
            <p className="text-gray-400 text-sm">
              Access advanced AI algorithms, detailed breakdowns, and professional styling tips.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="font-semibold text-white mb-2">Privacy & Security</h4>
            <p className="text-gray-400 text-sm">
              Your data is protected with enterprise-grade security and privacy controls.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Terms and Conditions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-gray-500 text-sm space-y-2"
      >
        <p>
          • Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period
        </p>
        <p>
          • You can manage and turn off auto-renewal in your Account Settings at any time after purchase
        </p>
        <p>
          • Payment will be charged to your Apple ID account at confirmation of purchase
        </p>
        <p>
          • Any unused portion of a free trial period will be forfeited when purchasing a subscription
        </p>
      </motion.div>
    </div>
  );
};