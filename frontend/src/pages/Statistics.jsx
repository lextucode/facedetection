import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MOOD_COLORS = {
  happy: "#FFD93D",
  sad: "#6BCB77",
  angry: "#FF6B6B",
  anxious: "#A8DADC",
  neutral: "#B8B8D1"
};

const MOOD_EMOJIS = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  anxious: "😰",
  neutral: "😐"
};

export default function Statistics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/moods/stats`);
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      setLoading(false);
    }
  };

  const getBarChartData = () => {
    if (!stats) return [];
    
    return Object.entries(stats.mood_counts).map(([mood, count]) => ({
      mood: mood.charAt(0).toUpperCase() + mood.slice(1),
      count: count,
      emoji: MOOD_EMOJIS[mood],
      fill: MOOD_COLORS[mood]
    }));
  };

  const getPieChartData = () => {
    if (!stats) return [];
    
    return Object.entries(stats.mood_counts)
      .filter(([_, count]) => count > 0)
      .map(([mood, count]) => ({
        name: mood.charAt(0).toUpperCase() + mood.slice(1),
        value: count,
        color: MOOD_COLORS[mood]
      }));
  };

  const getTotalEntries = () => {
    if (!stats) return 0;
    return Object.values(stats.mood_counts).reduce((sum, count) => sum + count, 0);
  };

  const getMostCommonMood = () => {
    if (!stats) return null;
    
    const entries = Object.entries(stats.mood_counts);
    if (entries.length === 0) return null;
    
    const [mood, count] = entries.reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    );
    
    return count > 0 ? { mood, count } : null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const mostCommon = getMostCommonMood();
  const totalEntries = getTotalEntries();

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="statistics-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="rounded-full"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800">
              Statistics
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mt-2">
              Visualize your mood patterns
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading statistics...</p>
          </div>
        ) : totalEntries === 0 ? (
          <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid="no-stats-card">
            <CardContent className="text-center py-12">
              <p className="text-gray-600 mb-4">No data available yet</p>
              <Button
                onClick={() => navigate('/add')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl"
                data-testid="start-tracking-button"
              >
                Start Tracking
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid="total-entries-card">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-600">Total Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-bold text-gray-800" data-testid="total-entries-count">{totalEntries}</p>
                </CardContent>
              </Card>

              {mostCommon && (
                <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid="most-common-mood-card">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-600">Most Common Mood</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div 
                        className="text-5xl p-3 rounded-2xl"
                        style={{ backgroundColor: `${MOOD_COLORS[mostCommon.mood]}30` }}
                      >
                        {MOOD_EMOJIS[mostCommon.mood]}
                      </div>
                      <div>
                        <p className="text-3xl font-bold capitalize text-gray-800" data-testid="most-common-mood-name">
                          {mostCommon.mood}
                        </p>
                        <p className="text-gray-600">{mostCommon.count} times</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Bar Chart */}
            <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid="bar-chart-card">
              <CardHeader>
                <CardTitle className="text-2xl">Mood Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getBarChartData()}>
                    <XAxis dataKey="mood" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" radius={[10, 10, 0, 0]}>
                      {getBarChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid="pie-chart-card">
              <CardHeader>
                <CardTitle className="text-2xl">Mood Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomLabel}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}