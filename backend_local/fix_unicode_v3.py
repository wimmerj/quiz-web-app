#!/usr/bin/env python3
"""
Fix Unicode/Emoji issues in enhanced_backend_fixed.py
Replaces emoji characters with plain text for Windows console compatibility
"""

import re

def fix_unicode_issues():
    """Fix unicode issues in backend file"""
    file_path = "enhanced_backend_fixed.py"
    
    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Dictionary of emoji replacements
    replacements = {
        '🔐': 'AUTH',
        '❌': 'ERROR',
        '✅': 'OK',
        '⚠️': 'WARN',
        '🌐': 'WEB',
        '📤': 'OUT',
        '🆕': 'NEW',
        '🚀': 'START',
        '🔍': 'SEARCH',
        '📊': 'STATS',
        '💾': 'SAVE',
        '🔄': 'REFRESH',
        '🎯': 'TARGET',
        '📝': 'LOG',
        '🤖': 'AI',
        '🔒': 'SECURE',
        '📈': 'CHART',
        '👥': 'USERS',
        '🏗️': 'BUILD'
    }
    
    # Apply replacements
    for emoji, replacement in replacements.items():
        content = content.replace(emoji, replacement)
    
    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Fixed unicode issues in {file_path}")
    print(f"Applied {len(replacements)} emoji replacements")

if __name__ == "__main__":
    fix_unicode_issues()
