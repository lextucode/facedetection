import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Download } from "lucide-react";
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

export default function History() {
  const navigate = useNavigate();
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedMoods, setGroupedMoods] = useState({});

  useEffect(() => {
    fetchMoods();
  }, []);

  const fetchMoods = async () => {
    try {
      const response = await axios.get(`${API}/moods`);
      const moodData = response.data;
      setMoods(moodData);
      groupMoodsByDate(moodData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching moods:", error);
      setLoading(false);
    }
  };

  const groupMoodsByDate = (moodData) => {
    const grouped = moodData.reduce((acc, mood) => {
      const date = new Date(mood.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(mood);
      return acc;
    }, {});
    
    setGroupedMoods(grouped);
  };

  const handleDelete = async (moodId) => {
    if (!window.confirm("Are you sure you want to delete this mood entry?")) {
      return;
    }

    try {
      await axios.delete(`${API}/moods/${moodId}`);
      toast.success("Mood entry deleted");
      fetchMoods();
    } catch (error) {
      console.error("Error deleting mood:", error);
      toast.error("Failed to delete mood entry");
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API}/moods/export?format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mood_export_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="history-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
                Mood History
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mt-2">
                {moods.length} total entries
              </p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => handleExport('csv')}
            className="bg-green-500 hover:bg-green-600 text-white rounded-xl"
            data-testid="export-csv-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('json')}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
            data-testid="export-json-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>

        {/* Mood History */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading history...</p>
          </div>
        ) : moods.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid="no-history-card">
            <CardContent className="text-center py-12">
              <p className="text-gray-600 mb-4">No mood entries yet</p>
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
            {Object.entries(groupedMoods).map(([date, dayMoods]) => (
              <Card key={date} className="bg-white/80 backdrop-blur-lg border-0 shadow-xl" data-testid={`mood-date-group-${date}`}>
                <CardHeader>
                  <CardTitle className="text-xl text-gray-700">{date}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dayMoods.map((mood, index) => (
                      <div
                        key={mood.id || index}
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100"
                        style={{ borderLeft: `4px solid ${MOOD_COLORS[mood.mood]}` }}
                        data-testid={`mood-entry-${mood.id}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-4xl">{MOOD_EMOJIS[mood.mood]}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-semibold capitalize text-gray-800">{mood.mood}</p>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                                {mood.detection_method}
                              </span>
                            </div>
                            {mood.note && (
                              <p className="text-sm text-gray-600">{mood.note}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">{formatTime(mood.timestamp)}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDelete(mood.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          data-testid={`delete-mood-${mood.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}