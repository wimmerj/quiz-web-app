#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for the modular quiz app backend
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"  # Change to your deployed URL
API_BASE = f"{BASE_URL}/api"

class QuizAppTester:
    def __init__(self, base_url=API_BASE):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        
    def test_health_check(self):
        """Test health check endpoint"""
        print("🔍 Testing health check...")
        try:
            response = requests.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data['status']}")
                print(f"   Database: {data['database']}")
                print(f"   Monica AI: {data['monica_ai']}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {str(e)}")
            return False
    
    def test_registration(self, username="test_user", email="test@quiz.app", password="test123"):
        """Test user registration"""
        print("🔍 Testing user registration...")
        try:
            data = {
                "username": username,
                "email": email,
                "password": password,
                "avatar": "🧪"
            }
            
            response = requests.post(f"{self.base_url}/auth/register", json=data)
            
            if response.status_code == 201:
                result = response.json()
                self.token = result['token']
                self.user_id = result['user']['id']
                print(f"✅ Registration successful: {result['user']['username']}")
                return True
            elif response.status_code == 409:
                print("⚠️  User already exists, trying login...")
                return self.test_login(username, password)
            else:
                print(f"❌ Registration failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Registration error: {str(e)}")
            return False
    
    def test_login(self, username="test_user", password="test123"):
        """Test user login"""
        print("🔍 Testing user login...")
        try:
            data = {
                "username": username,
                "password": password
            }
            
            response = requests.post(f"{self.base_url}/auth/login", json=data)
            
            if response.status_code == 200:
                result = response.json()
                self.token = result['token']
                self.user_id = result['user']['id']
                print(f"✅ Login successful: {result['user']['username']}")
                print(f"   Role: {result['user']['role']}")
                print(f"   Battle Rating: {result['user']['battle_rating']}")
                return True
            else:
                print(f"❌ Login failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_profile(self):
        """Test getting user profile"""
        if not self.token:
            print("❌ No token available for profile test")
            return False
            
        print("🔍 Testing user profile...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.base_url}/auth/profile", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                user = result['user']
                print(f"✅ Profile retrieved: {user['username']}")
                print(f"   Email: {user['email']}")
                print(f"   Created: {user['created_at']}")
                print(f"   Battle Stats: {user['battle_wins']}W / {user['battle_losses']}L")
                return True
            else:
                print(f"❌ Profile test failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Profile error: {str(e)}")
            return False
    
    def test_quiz_tables(self):
        """Test getting quiz tables"""
        if not self.token:
            print("❌ No token available for quiz tables test")
            return False
            
        print("🔍 Testing quiz tables...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.base_url}/quiz/tables", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                tables = result['tables']
                print(f"✅ Found {len(tables)} quiz tables:")
                for table in tables:
                    print(f"   - {table['display_name']}: {table['question_count']} questions")
                return len(tables) > 0
            else:
                print(f"❌ Quiz tables test failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Quiz tables error: {str(e)}")
            return False
    
    def test_quiz_questions(self, table_name="matematika_zaklad"):
        """Test getting quiz questions"""
        if not self.token:
            print("❌ No token available for quiz questions test")
            return False
            
        print(f"🔍 Testing quiz questions for {table_name}...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.base_url}/quiz/questions/{table_name}?limit=3", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                questions = result['questions']
                print(f"✅ Found {len(questions)} questions:")
                for i, q in enumerate(questions[:2]):  # Show first 2
                    print(f"   {i+1}. {q['text'][:50]}...")
                    print(f"      Difficulty: {q['difficulty']}, Category: {q['category']}")
                return len(questions) > 0
            else:
                print(f"❌ Quiz questions test failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Quiz questions error: {str(e)}")
            return False
    
    def test_submit_answer(self, question_id=1, answer=1):
        """Test submitting quiz answer"""
        if not self.token:
            print("❌ No token available for submit answer test")
            return False
            
        print("🔍 Testing answer submission...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            data = {
                "question_id": question_id,
                "selected_answer": answer,
                "response_time": 5.2,
                "session_id": f"test_session_{int(time.time())}"
            }
            
            response = requests.post(f"{self.base_url}/quiz/submit-answer", json=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Answer submitted: {'Correct' if result['correct'] else 'Incorrect'}")
                print(f"   Correct answer: {['A', 'B', 'C'][result['correct_answer']]}")
                if result.get('explanation'):
                    print(f"   Explanation: {result['explanation'][:100]}...")
                return True
            else:
                print(f"❌ Submit answer test failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Submit answer error: {str(e)}")
            return False
    
    def test_battle_quick_match(self):
        """Test quick battle match"""
        if not self.token:
            print("❌ No token available for battle test")
            return False
            
        print("🔍 Testing quick battle match...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(f"{self.base_url}/battle/quick-match", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Battle match created: {result['battle_id']}")
                print(f"   Mode: {result['mode']}")
                print(f"   Opponent: {result['opponent']['username']}")
                print(f"   Questions: {result['questions']}")
                return True
            else:
                print(f"❌ Battle test failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Battle error: {str(e)}")
            return False
    
    def test_oral_exam(self):
        """Test oral exam system"""
        if not self.token:
            print("❌ No token available for oral exam test")
            return False
            
        print("🔍 Testing oral exam...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # Start oral exam
            data = {"table_name": "matematika_zaklad"}
            response = requests.post(f"{self.base_url}/oral-exam/start", json=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                exam_id = result['exam_id']
                question = result['question']
                print(f"✅ Oral exam started: {exam_id}")
                print(f"   Question: {question['text'][:50]}...")
                
                # Submit mock audio transcript
                audio_data = {
                    "question_id": question['id'],
                    "transcript": "Myslím si, že správná odpověď je osmička.",
                    "exam_id": exam_id
                }
                
                audio_response = requests.post(f"{self.base_url}/oral-exam/submit-audio", json=audio_data, headers=headers)
                
                if audio_response.status_code == 200:
                    audio_result = audio_response.json()
                    evaluation = audio_result['evaluation']
                    print(f"✅ Audio evaluated: Score {evaluation.get('score', 'N/A')}/100")
                    print(f"   Feedback: {evaluation.get('feedback', 'No feedback')[:100]}...")
                    return True
                else:
                    print(f"❌ Audio submission failed: {audio_response.json()}")
                    return False
            else:
                print(f"❌ Oral exam test failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Oral exam error: {str(e)}")
            return False
    
    def test_settings(self):
        """Test user settings"""
        if not self.token:
            print("❌ No token available for settings test")
            return False
            
        print("🔍 Testing user settings...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            
            # Get current settings
            response = requests.get(f"{self.base_url}/settings", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                current_settings = result['settings']
                print(f"✅ Current settings retrieved: {len(current_settings)} categories")
                
                # Update settings
                new_settings = {
                    "settings": {
                        "general": {
                            "language": "cs",
                            "timezone": "Europe/Prague",
                            "notifications": True
                        },
                        "quiz": {
                            "mode": "random",
                            "autoNext": False,
                            "showHints": True
                        },
                        "appearance": {
                            "theme": "dark",
                            "animations": True,
                            "glassmorphism": True
                        }
                    },
                    "avatar": "🧪"
                }
                
                update_response = requests.put(f"{self.base_url}/settings", json=new_settings, headers=headers)
                
                if update_response.status_code == 200:
                    update_result = update_response.json()
                    print("✅ Settings updated successfully")
                    print(f"   Categories: {list(update_result['settings'].keys())}")
                    return True
                else:
                    print(f"❌ Settings update failed: {update_response.json()}")
                    return False
            else:
                print(f"❌ Settings test failed: {response.json()}")
                return False
                
        except Exception as e:
            print(f"❌ Settings error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Modular Quiz App Backend Tests")
        print("=" * 50)
        
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", lambda: self.test_registration(f"test_{int(time.time())}", f"test_{int(time.time())}@quiz.app")),
            ("User Profile", self.test_profile),
            ("Quiz Tables", self.test_quiz_tables),
            ("Quiz Questions", self.test_quiz_questions),
            ("Submit Answer", self.test_submit_answer),
            ("Battle System", self.test_battle_quick_match),
            ("Oral Exam", self.test_oral_exam),
            ("User Settings", self.test_settings)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n📋 {test_name}")
            print("-" * 30)
            try:
                if test_func():
                    passed += 1
                    print(f"✅ {test_name} PASSED")
                else:
                    print(f"❌ {test_name} FAILED")
            except Exception as e:
                print(f"💥 {test_name} CRASHED: {str(e)}")
        
        print("\n" + "=" * 50)
        print(f"🏁 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
        elif passed > total * 0.7:
            print("⚠️  Most tests passed. Some issues need attention.")
        else:
            print("❌ Many tests failed. Backend needs debugging.")
        
        return passed == total

def main():
    """Main test function"""
    import sys
    
    # Check if custom URL provided
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
        if not base_url.startswith('http'):
            base_url = f"https://{base_url}"
        api_base = f"{base_url}/api"
        print(f"Testing custom URL: {api_base}")
    else:
        api_base = API_BASE
        print(f"Testing local URL: {api_base}")
    
    tester = QuizAppTester(api_base)
    success = tester.run_all_tests()
    
    if success:
        print(f"\n🌟 Backend is ready for production!")
        print(f"   API URL: {api_base}")
        print(f"   Health: {api_base}/health")
        print(f"   Docs: {api_base}/info")
    
    return 0 if success else 1

if __name__ == '__main__':
    exit(main())
