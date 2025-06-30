# Deploying to PythonAnywhere

This guide will help you deploy both the frontend and backend of the Climate Visualizer on PythonAnywhere.

## Backend Deployment

1. Log in to your PythonAnywhere account

2. Open a Bash console and clone your repository:
```bash
git clone https://github.com/<your-username>/climate-visualizer.git
```

3. Create a virtual environment and install dependencies:
```bash
cd climate-visualizer
python -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

4. Go to the "Web" tab in PythonAnywhere:
   - Click "Add a new web app"
   - Choose "Manual configuration"
   - Choose Python version (3.8 or higher)

5. Configure the web app:
   - Source code: /home/<your-pythonanywhere-username>/climate-visualizer/backend
   - Working directory: /home/<your-pythonanywhere-username>/climate-visualizer/backend
   - WSGI configuration file: Edit the WSGI configuration file and replace its contents with:

```python
import sys
path = '/home/<your-pythonanywhere-username>/climate-visualizer/backend'
if path not in sys.path:
    sys.path.append(path)

from wsgi import application
```

6. Set up your virtual environment:
   - Go to the "Virtualenv" section
   - Enter: /home/<your-pythonanywhere-username>/climate-visualizer/venv

7. Configure static files:
   - URL: /static/
   - Directory: /home/<your-pythonanywhere-username>/climate-visualizer/frontend/build/static

## Frontend Deployment

1. Build the frontend locally:
```bash
cd frontend
npm install
npm run build
```

2. Upload the build folder to PythonAnywhere:
   - Use the Files tab in PythonAnywhere
   - Navigate to /home/<your-pythonanywhere-username>/climate-visualizer/frontend
   - Upload the entire 'build' directory

3. Configure static files serving in your Flask app (add to backend/app.py):
```python
from flask import send_from_directory
import os

# Add this route at the end of app.py
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists("../frontend/build/" + path):
        return send_from_directory('../frontend/build', path)
    return send_from_directory('../frontend/build', 'index.html')
```

4. Update the backend API URL in your frontend code before building:
   - In your frontend API configuration, update the base URL to:
   ```javascript
   const BASE_URL = 'https://<your-pythonanywhere-username>.pythonanywhere.com/api';
   ```

## Final Steps

1. Reload your PythonAnywhere web app

2. Your application should now be accessible at:
   https://<your-pythonanywhere-username>.pythonanywhere.com

## Troubleshooting

1. Check the error logs in the PythonAnywhere web app tab
2. Ensure all paths in the WSGI configuration are correct
3. Make sure the virtual environment is properly configured
4. Check that all static files are properly served
5. Verify CORS settings in your Flask app if needed 