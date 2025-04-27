
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useScanLimits } from "@/hooks/useScanLimits";

export const ScanLimitStatus = () => {
  const { dailyScansRemaining, loading } = useScanLimits();

  if (loading || dailyScansRemaining === null) return null;

  if (dailyScansRemaining <= 0) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Daily Limit Reached</AlertTitle>
        <AlertDescription>
          You've reached your daily limit of 3 style scans. Please try again tomorrow!
        </AlertDescription>
      </Alert>
    );
  }

  if (dailyScansRemaining <= 1) {
    return (
      <Alert className="mb-4 border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-500">Almost at Limit</AlertTitle>
        <AlertDescription className="text-yellow-500/90">
          You have {dailyScansRemaining} scan{dailyScansRemaining !== 1 ? 's' : ''} remaining today.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mb-4 text-sm text-gray-400 text-center">
      {dailyScansRemaining} scans remaining today
    </div>
  );
};
