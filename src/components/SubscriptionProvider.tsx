// This file is deprecated - use SimpleSubscriptionProvider from ./subscription/ folder instead
export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  console.warn('⚠️ Using deprecated SubscriptionProvider - please use SimpleSubscriptionProvider instead');
  return <>{children}</>;
}; 