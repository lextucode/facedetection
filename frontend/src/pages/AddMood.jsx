import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Camera, Hand } from "lucide-react";
import { toast } from "sonner";
import Webcam from "react-webcam";

const MOODS = [
  { name: "happy", emoji: "😊", color: "#FFD93D" },
  { name: "sad", emoji: "😢", color: "#6BCB77" },
  { name: "angry", emoji: "😠", color: "#FF6B6B" },
  { name: "anxious", emoji: "😰", color: "#A8DADC" },
  { name: "neutral", emoji: "😐", color: "#B8B8D1" }
];

export default function AddMood() {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [method, setMethod] = useState("manual"); // manual or camera
  const [selectedMood, setSelectedMood] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState(null);

  const handleManualSubmit = async () => {
    if (!selectedMood) {
      toast.error("Please select a mood");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/moods`, {
        mood: selectedMood,
        note: note,
        detection_method: "manual"
      });
      
      toast.success("Mood tracked successfully!");
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error("Error saving mood:", error);
      toast.error("Failed to save mood");
    } finally {
      setLoading(false);
    }
  };

  const captureAndDetect = async () => {
    if (!webcamRef.current) {
      toast.error("Camera not ready");
      return;
    }

    setLoading(true);
    try {
      // Capture image from webcam
      const imageSrc = webcamRef.current.getScreenshot();
      
      if (!imageSrc) {
        toast.error("Failed to capture image");
        setLoading(false);
        return;
      }

      // Convert base64 to blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      // Send to backend for emotion detection
      const result = await axios.post(`${API}/moods/detect`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { emotion, confidence } = result.data;
      setDetectedEmotion({ emotion, confidence });
      setSelectedMood(emotion);
      setMethod("camera");
      setShowCamera(false);
      
      toast.success(`Detected: ${emotion} (${confidence.toFixed(1)}% confidence)`);
    } catch (error) {
      console.error("Error detecting emotion:", error);
      toast.error("Failed to detect emotion. Please try again or select manually.");
    } finally {
      setLoading(false);
    }
  };

  const handleCameraSubmit = async () => {
    if (!selectedMood) {
      toast.error("Please detect emotion first");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/moods`, {
        mood: selectedMood,
        note: note,
        detection_method: "camera"
      });
      
      toast.success("Mood tracked successfully!");
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error("Error saving mood:", error);
      toast.error("Failed to save mood");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="add-mood-page">
      <div className="max-w-3xl mx-auto">
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
              Track Your Mood
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mt-2">
              Choose manual selection or use camera detection
            </p>
          </div>
        </div>

        {/* Method Selection */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Button
            onClick={() => {
              setMethod("manual");
              setShowCamera(false);
              setDetectedEmotion(null);
            }}
            className={`h-20 rounded-2xl text-lg font-semibold ${
              method === "manual"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "bg-white/80 text-gray-700 hover:bg-white"
            }`}
            data-testid="manual-method-button"
          >
            <Hand className="w-6 h-6 mr-2" />
            Manual Selection
          </Button>
          <Button
            onClick={() => {
              setMethod("camera");
              setShowCamera(true);
              setSelectedMood("");
            }}
            className={`h-20 rounded-2xl text-lg font-semibold ${
              method === "camera"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                : "bg-white/80 text-gray-700 hover:bg-white"
            }`}
            data-testid="camera-method-button"
          >
            <Camera className="w-6 h-6 mr-2" />
            Camera Detection
          </Button>
        </div>

        {/* Manual Mood Selection */}
        {method === "manual" && (
          <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl mb-6" data-testid="manual-mood-card">
            <CardHeader>
              <CardTitle className="text-2xl">How are you feeling?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 mb-6">
                {MOODS.map((mood) => (
                  <button
                    key={mood.name}
                    onClick={() => setSelectedMood(mood.name)}
                    className={`p-4 rounded-2xl text-5xl hover:scale-110 transition-transform ${
                      selectedMood === mood.name ? "ring-4 ring-purple-500" : ""
                    }`}
                    style={{ backgroundColor: `${mood.color}30` }}
                    data-testid={`mood-${mood.name}-button`}
                  >
                    {mood.emoji}
                  </button>
                ))}
              </div>
              
              {selectedMood && (
                <p className="text-center text-xl font-semibold capitalize mb-4 text-gray-800" data-testid="selected-mood-text">
                  Feeling {selectedMood}
                </p>
              )}

              <Textarea
                placeholder="Add a note (optional)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mb-4 min-h-24 rounded-xl border-gray-200"
                data-testid="mood-note-input"
              />

              <Button
                onClick={handleManualSubmit}
                disabled={loading || !selectedMood}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-lg font-semibold"
                data-testid="submit-manual-mood-button"
              >
                {loading ? "Saving..." : "Save Mood"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Camera Detection */}
        {method === "camera" && (
          <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-xl mb-6" data-testid="camera-mood-card">
            <CardHeader>
              <CardTitle className="text-2xl">Camera Emotion Detection</CardTitle>
            </CardHeader>
            <CardContent>
              {showCamera ? (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden bg-gray-900" data-testid="webcam-container">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      className="w-full"
                      videoConstraints={{
                        width: 1280,
                        height: 720,
                        facingMode: "user"
                      }}
                    />
                  </div>
                  <Button
                    onClick={captureAndDetect}
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl text-lg font-semibold"
                    data-testid="capture-emotion-button"
                  >
                    {loading ? "Detecting..." : "Capture & Detect Emotion"}
                  </Button>
                </div>
              ) : detectedEmotion ? (
                <div className="space-y-4">
                  <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: `${MOODS.find(m => m.name === selectedMood)?.color}30` }}>
                    <div className="text-7xl mb-4">
                      {MOODS.find(m => m.name === selectedMood)?.emoji}
                    </div>
                    <p className="text-2xl font-bold capitalize text-gray-800" data-testid="detected-emotion-text">
                      {detectedEmotion.emotion}
                    </p>
                    <p className="text-gray-600 mt-2">
                      Confidence: {detectedEmotion.confidence.toFixed(1)}%
                    </p>
                  </div>

                  <Textarea
                    placeholder="Add a note (optional)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-24 rounded-xl border-gray-200"
                    data-testid="camera-mood-note-input"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => {
                        setShowCamera(true);
                        setDetectedEmotion(null);
                        setSelectedMood("");
                      }}
                      variant="outline"
                      className="h-12 rounded-xl"
                      data-testid="retake-photo-button"
                    >
                      Retake Photo
                    </Button>
                    <Button
                      onClick={handleCameraSubmit}
                      disabled={loading}
                      className="h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold"
                      data-testid="submit-camera-mood-button"
                    >
                      {loading ? "Saving..." : "Save Mood"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}