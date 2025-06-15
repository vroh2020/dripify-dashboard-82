
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileStatsProps {
  stats: {
    totalScans: number;
    averageScore: number;
    bestCategory: string;
    lastScan: string;
    improvedCategories: number;
    streak: number;
  };
}

export const ProfileStats = ({ stats }: ProfileStatsProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
      <Card className="bg-black/20 backdrop-blur-lg border-white/10">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-white/90">Style Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-white/60">Total Scans:</p>
              <p className="text-white font-medium">{stats.totalScans || 0}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-white/60">Average Score:</p>
              <p className="text-white font-medium">{stats.averageScore || 0}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-white/60">Best Category:</p>
              <p className="text-white font-medium">{stats.bestCategory || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/20 backdrop-blur-lg border-white/10">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-white/90">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-white/60">Last Scan:</p>
              <p className="text-white font-medium">{stats.lastScan || 'No scans yet'}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-white/60">Improved Categories:</p>
              <p className="text-white font-medium">{stats.improvedCategories || 0}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-white/60">Style Streak:</p>
              <p className="text-white font-medium">{stats.streak || 0} days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
