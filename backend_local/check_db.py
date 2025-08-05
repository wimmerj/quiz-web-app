import sqlite3

conn = sqlite3.connect('enhanced_quiz.db')
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('Tables in database:', [t[0] for t in tables])

# Check users table specifically
try:
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    print(f'Users table found with {count} records')
except sqlite3.OperationalError as e:
    print(f'Users table error: {e}')

conn.close()
