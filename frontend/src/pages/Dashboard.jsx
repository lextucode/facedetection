import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, History, BarChart3, Calendar } from "lucide-react";
import { toast } from "sonner";

const MOOD_EMOJIS = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  anxious: "😰",
  neutral: "😐"
};

const MOOD_COLORS = {
  happy: "#FFD93D",
  sad: "#6BCB77",
  angry: "#FF6B6B",
  anxious: "#A8DADC",
  neutral: "#B8B8D1"
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [todayMood, setTodayMood] = useState(null);
  const [recentMoods, setRecentMoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayMood();
    fetchRecentMoods();
  }, []);

  const fetchTodayMood = async () => {
    try {
      const response = await axios.get(`${API}/moods`);
      const moods = response.data;
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      const todaysMoods = moods.filter(mood => {
        const moodDate = new Date(mood.timestamp).toISOString().split('T')[0];
        return moodDate === today;
      });
      
      if (todaysMoods.length > 0) {
        setTodayMood(todaysMoods[0]);
      }
    } catch (error) {
      console.error("Error fetching today's mood:", error);
    }
  };

  const fetchRecentMoods = async () => {
    try {
      const response = await axios.get(`${API}/moods`);
      setRecentMoods(response.data.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching recent moods:", error);
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="dashboard-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 mb-3" data-testid="dashboard-title">
            Mood Tracker
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Track your emotions, understand your patterns
          </p>
        </div>

        {/* Today's Mood Card */}
        <Card className="mb-6 bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid="today-mood-card">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="w-6 h-6 text-purple-500" />
              Today's Mood
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayMood ? (
              <div className="flex items-center gap-4" data-testid="today-mood-display">
                <div 
                  className="text-6xl p-4 rounded-2xl"
                  style={{ backgroundColor: `${MOOD_COLORS[todayMood.mood]}20` }}
                >
                  {MOOD_EMOJIS[todayMood.mood]}
                </div>
                <div>
                  <p className="text-2xl font-semibold capitalize text-gray-800">{todayMood.mood}</p>
                  {todayMood.note && (
                    <p className="text-gray-600 mt-2">"{todayMood.note}"</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(todayMood.timestamp)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8" data-testid="no-mood-today">
                <p className="text-gray-600 mb-4">You haven't tracked your mood today</p>
                <Button 
                  onClick={() => navigate('/add')} 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full px-8"
                  data-testid="track-mood-button"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Track Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            onClick={() => navigate('/add')}
            className="h-24 bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white rounded-2xl shadow-lg border-0"
            data-testid="add-mood-nav-button"
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="w-8 h-8" />
              <span className="text-lg font-semibold">Add Mood</span>
            </div>
          </Button>
          
          <Button
            onClick={() => navigate('/history')}
            className="h-24 bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white rounded-2xl shadow-lg border-0"
            data-testid="view-history-button"
          >
            <div className="flex flex-col items-center gap-2">
              <History className="w-8 h-8" />
              <span className="text-lg font-semibold">View History</span>
            </div>
          </Button>
          
          <Button
            onClick={() => navigate('/statistics')}
            className="h-24 bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white rounded-2xl shadow-lg border-0"
            data-testid="view-stats-button"
          >
            <div className="flex flex-col items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              <span className="text-lg font-semibold">Statistics</span>
            </div>
          </Button>
        </div>

        {/* Recent Moods */}
        {recentMoods.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid="recent-moods-card">
            <CardHeader>
              <CardTitle className="text-2xl">Recent Moods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMoods.map((mood, index) => (
                  <div 
                    key={mood.id || index}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 mood-card"
                    style={{ borderLeft: `4px solid ${MOOD_COLORS[mood.mood]}` }}
                    data-testid={`recent-mood-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{MOOD_EMOJIS[mood.mood]}</div>
                      <div>
                        <p className="font-semibold capitalize text-gray-800">{mood.mood}</p>
                        {mood.note && (
                          <p className="text-sm text-gray-600 max-w-md truncate">{mood.note}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(mood.timestamp)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}