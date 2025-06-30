# Climate Visualizer

A web application for visualizing and analyzing global air quality data.

## Deployment Instructions

### Frontend Deployment (GitHub Pages)

1. Install gh-pages:
```bash
cd frontend
npm install gh-pages --save-dev
```

2. The package.json has been configured with:
- Homepage URL: "https://<trainer-username>.github.io/climate-visualizer"
- Deploy scripts: "predeploy" and "deploy"

3. Deploy to GitHub Pages:
```bash
cd frontend
npm run deploy
```

### Backend Deployment (Render)

1. Create a new Web Service on Render (https://render.com)

2. Configure the following settings:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
   - Environment Variables: None required

3. The backend is already configured with CORS support.

### Integration

After deployment, update the frontend API base URL in your React components:

```javascript
const BASE_URL = "https://<your-backend-name>.onrender.com/api";
```

## Local Development

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
``` 