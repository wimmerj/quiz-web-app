#!/usr/bin/env python3
"""
Enhanced Quiz Server - Standalone Launch
Quick server start without GUI for testing
"""

import sys
import os

def main():
    print("🚀 Enhanced Quiz Server - Standalone Launch")
    print("=" * 50)
    print()
    
    try:
        # Import the server
        from enhanced_backend_fixed import start_server
        
        # Get port from command line or use default
        port = 5000
        if len(sys.argv) > 1:
            try:
                port = int(sys.argv[1])
            except ValueError:
                print("❌ Invalid port number")
                sys.exit(1)
        
        print(f"🌐 Starting server on port {port}")
        print("🔴 Press Ctrl+C to stop")
        print()
        
        # Start the server
        start_server(host='127.0.0.1', port=port, debug=False)
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
