# SEAMS Deployment Guide - Render (Single Service)

## Quick Start

Your SEAMS app is configured to deploy as a **single Web Service** on Render where the backend serves the frontend.

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Configure for Render deployment"
git push
```

### Step 2: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `seams` (or your choice)
   - **Build Command:** `npm run render-build`
   - **Start Command:** `npm start`

### Step 3: Set Environment Variables

In Render dashboard, add these environment variables:

```bash
NODE_ENV=production
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Step 4: Deploy

Click **"Create Web Service"** and wait 5-7 minutes for deployment.

## Testing

- **Health Check:** `https://your-app.onrender.com/health`
- **Frontend:** `https://your-app.onrender.com/`
- **API:** `https://your-app.onrender.com/api`

## Local Development

```bash
# Install dependencies
npm install

# Run development (both frontend and backend)
npm run dev

# Build frontend only
npm run build

# Run production mode locally
npm start
```

## Architecture

- **Frontend:** React + Vite (built to `client/dist`)
- **Backend:** Express.js (serves frontend + API)
- **Database:** MongoDB Atlas
- **Deployment:** Single Render Web Service

## Environment Variables

### Required
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV` - Set to `production` on Render

### Optional
- `EMAIL_USER` - For email notifications
- `EMAIL_PASS` - Email password
- `PORT` - Auto-set by Render (10000)

## Troubleshooting

### 502 Bad Gateway
- Check Render logs for errors
- Verify MongoDB connection string
- Ensure all environment variables are set

### Frontend Not Loading
- Check build logs for errors
- Verify `client/dist` folder exists after build
- Check server is serving static files

### API Calls Failing
- Check browser console for errors
- Verify API routes start with `/api`
- Check CORS configuration

## Support

- **Render Docs:** https://render.com/docs
- **Logs:** Dashboard → Your Service → Logs
- **Status:** https://status.render.com/
