#!/usr/bin/env python3
"""
Enhanced Quiz Server - Debug Mode
Runs the server with maximum debug output
"""

import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set debug environment
os.environ['FLASK_ENV'] = 'development'
os.environ['FLASK_DEBUG'] = '1'

# Import and start the server
try:
    print("🐛 Starting Enhanced Quiz Server in DEBUG mode...")
    print("📝 Maximum logging enabled")
    print("🔍 Error details will be shown")
    print()
    
    from enhanced_backend_fixed import start_server
    
    # Start with debug=True
    start_server(host='127.0.0.1', port=5000, debug=True)
    
except Exception as e:
    print(f"❌ CRITICAL ERROR: {e}")
    import traceback
    traceback.print_exc()
    input("\nPress Enter to exit...")
    sys.exit(1)
