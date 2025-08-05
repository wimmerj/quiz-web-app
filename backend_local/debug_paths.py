import os
print("Current working directory:", os.getcwd())
print("GUI file directory:", os.path.dirname(os.path.abspath(__file__)))
print("Database path 'enhanced_quiz.db' exists:", os.path.exists("enhanced_quiz.db"))

# Check in backend_local directory
backend_path = r"c:\Users\honza\Documents\13_Programming\Python\03_PyToHTML\02_Quiz\HTML_v5\backend_local\enhanced_quiz.db"
print(f"Backend database exists: {os.path.exists(backend_path)}")
