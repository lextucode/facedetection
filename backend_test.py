import requests
import sys
import json
import io
from datetime import datetime
from PIL import Image
import numpy as np

class MoodTrackerAPITester:
    def __init__(self, base_url="https://emotion-lens-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_mood_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if files is None:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    print(f"   Response: Non-JSON response")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_create_mood_manual(self):
        """Test creating a manual mood entry"""
        mood_data = {
            "mood": "happy",
            "note": "Test mood entry from backend test",
            "detection_method": "manual"
        }
        success, response = self.run_test(
            "Create Manual Mood",
            "POST",
            "moods",
            200,
            data=mood_data
        )
        if success and 'id' in response:
            self.created_mood_ids.append(response['id'])
            return True, response['id']
        return False, None

    def test_create_mood_camera(self):
        """Test creating a camera-detected mood entry"""
        mood_data = {
            "mood": "sad",
            "note": "Test camera mood entry",
            "detection_method": "camera"
        }
        success, response = self.run_test(
            "Create Camera Mood",
            "POST",
            "moods",
            200,
            data=mood_data
        )
        if success and 'id' in response:
            self.created_mood_ids.append(response['id'])
            return True, response['id']
        return False, None

    def test_emotion_detection(self):
        """Test emotion detection endpoint with a test image"""
        try:
            # Create a simple test image (100x100 RGB)
            img_array = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
            img = Image.fromarray(img_array)
            
            # Convert to bytes
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            
            files = {'file': ('test_image.jpg', img_bytes, 'image/jpeg')}
            
            success, response = self.run_test(
                "Emotion Detection",
                "POST",
                "moods/detect",
                200,
                files=files
            )
            return success, response
        except Exception as e:
            print(f"❌ Failed to create test image: {str(e)}")
            return False, {}

    def test_get_moods(self):
        """Test getting all mood entries"""
        return self.run_test("Get All Moods", "GET", "moods", 200)

    def test_get_moods_with_date_filter(self):
        """Test getting moods with date filtering"""
        today = datetime.now().strftime('%Y-%m-%d')
        return self.run_test(
            "Get Moods with Date Filter",
            "GET",
            f"moods?start_date={today}",
            200
        )

    def test_get_mood_stats(self):
        """Test getting mood statistics"""
        return self.run_test("Get Mood Statistics", "GET", "moods/stats", 200)

    def test_export_csv(self):
        """Test exporting mood data as CSV"""
        success, _ = self.run_test("Export CSV", "GET", "moods/export?format=csv", 200)
        return success

    def test_export_json(self):
        """Test exporting mood data as JSON"""
        success, _ = self.run_test("Export JSON", "GET", "moods/export?format=json", 200)
        return success

    def test_delete_mood(self, mood_id):
        """Test deleting a mood entry"""
        if not mood_id:
            print("❌ No mood ID provided for deletion test")
            return False
        
        success, _ = self.run_test(
            f"Delete Mood {mood_id}",
            "DELETE",
            f"moods/{mood_id}",
            200
        )
        return success

    def test_delete_nonexistent_mood(self):
        """Test deleting a non-existent mood entry"""
        fake_id = "non-existent-id-12345"
        success, _ = self.run_test(
            "Delete Non-existent Mood",
            "DELETE",
            f"moods/{fake_id}",
            404
        )
        return success

def main():
    print("🚀 Starting Mood Tracker API Tests")
    print("=" * 50)
    
    tester = MoodTrackerAPITester()
    
    # Test basic connectivity
    print("\n📡 Testing Basic Connectivity...")
    if not tester.test_root_endpoint()[0]:
        print("❌ Cannot connect to API. Stopping tests.")
        return 1

    # Test mood creation
    print("\n📝 Testing Mood Creation...")
    manual_success, manual_id = tester.test_create_mood_manual()
    camera_success, camera_id = tester.test_create_mood_camera()

    # Test emotion detection (may fail if DeepFace not properly configured)
    print("\n🤖 Testing Emotion Detection...")
    emotion_success, _ = tester.test_emotion_detection()

    # Test mood retrieval
    print("\n📊 Testing Mood Retrieval...")
    tester.test_get_moods()
    tester.test_get_moods_with_date_filter()
    tester.test_get_mood_stats()

    # Test data export
    print("\n💾 Testing Data Export...")
    tester.test_export_csv()
    tester.test_export_json()

    # Test mood deletion
    print("\n🗑️ Testing Mood Deletion...")
    if manual_id:
        tester.test_delete_mood(manual_id)
    if camera_id:
        tester.test_delete_mood(camera_id)
    
    # Test error handling
    print("\n⚠️ Testing Error Handling...")
    tester.test_delete_nonexistent_mood()

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())