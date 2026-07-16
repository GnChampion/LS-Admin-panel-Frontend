# 🔥 Deploy Admin Panel to Firebase Hosting

## Prerequisites

- ✅ Node.js installed
- ✅ Stable internet connection
- ✅ Firebase CLI installed
- ✅ Backend deployed to Railway/Render (get production URL)

---

## Step-by-Step Deployment

### 1. Install Dependencies (When Network is Stable)

```bash
cd admin-panel
npm install
```

**If you get network errors:**
- Try clearing npm cache: `npm cache clean --force`
- Try different network (mobile hotspot)
- Try: `npm install --registry=https://registry.npmmirror.com`

---

### 2. Update Production Backend URL

Edit `.env.production`:

```env
# Replace with your actual Railway/Render backend URL
VITE_BACKEND_URL=https://your-backend-url.railway.app
```

**Example URLs:**
- Railway: `https://land-scanner-backend-production.up.railway.app`
- Render: `https://land-scanner-backend.onrender.com`

---

### 3. Install Firebase CLI (if not installed)

```bash
npm install -g firebase-tools
```

**Or download:** https://firebase.google.com/docs/cli

---

### 4. Login to Firebase

```bash
firebase login
```

Browser will open - login with your Google account (the one that owns the Firebase project).

---

### 5. Verify Project Configuration

Check if Firebase project is correctly configured:

```bash
firebase projects:list
```

Should show: `land-scanner-tamil-developers`

**If not configured:**
```bash
firebase use land-scanner-tamil-developers
```

---

### 6. Build for Production

```bash
npm run build
```

This creates optimized production build in `dist/` folder.

**Expected output:**
```
vite v5.0.0 building for production...
✓ 234 modules transformed.
dist/index.html                  0.45 kB
dist/assets/index-abc123.js    156.78 kB
dist/assets/index-xyz789.css    12.34 kB
✓ built in 8.42s
```

---

### 7. Preview Build Locally (Optional)

Test the production build before deploying:

```bash
npm run preview
```

Opens at: http://localhost:4173

**Test:**
- ✅ Dashboard loads
- ✅ Can create zones
- ✅ Backend connection works
- ✅ Firebase Firestore connects
- ✅ Tasks display

---

### 8. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

**Or use npm script:**
```bash
npm run deploy
```

**Expected output:**
```
=== Deploying to 'land-scanner-tamil-developers'...

i  deploying hosting
i  hosting[land-scanner-tamil-developers]: beginning deploy...
✔  hosting[land-scanner-tamil-developers]: file upload complete
i  hosting[land-scanner-tamil-developers]: finalizing version...
✔  hosting[land-scanner-tamil-developers]: version finalized
i  hosting[land-scanner-tamil-developers]: releasing new version...
✔  hosting[land-scanner-tamil-developers]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/land-scanner-tamil-developers
Hosting URL: https://land-scanner-tamil-developers.web.app
```

---

### 9. Verify Deployment

Open your admin panel:
```
https://land-scanner-tamil-developers.web.app
```

**Test checklist:**
- [ ] Dashboard loads
- [ ] Can create zones
- [ ] Backend API responds
- [ ] Firebase connection works
- [ ] Zones list displays
- [ ] Tasks display
- [ ] Image collection works

---

### 10. Update Backend CORS (IMPORTANT!)

After deployment, update your backend's CORS allowed origins.

**In Railway/Render, add environment variable:**

```env
ALLOWED_ORIGINS=https://land-scanner-tamil-developers.web.app,https://land-scanner-tamil-developers.firebaseapp.com
```

**Then restart backend service.**

---

## Troubleshooting

### Build Fails

**Error: Cannot find module**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Firebase Deploy Fails

**Error: Not authorized**
```bash
firebase logout
firebase login
firebase deploy --only hosting
```

**Error: Project not found**
```bash
firebase use land-scanner-tamil-developers
firebase deploy --only hosting
```

### CORS Error in Production

**Error: "Access-Control-Allow-Origin"**

Backend CORS not configured. Update `ALLOWED_ORIGINS` in backend environment variables.

### Backend Connection Fails

**Error: Network request failed**

1. Check `.env.production` has correct backend URL
2. Rebuild: `npm run build`
3. Redeploy: `firebase deploy --only hosting`

---

## Continuous Deployment (Optional)

### Setup GitHub Actions

If you push admin panel to GitHub, you can auto-deploy on push:

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: land-scanner-tamil-developers
```

---

## File Structure After Build

```
admin-panel/
├── dist/                       # Production build (created by npm run build)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js    # Bundled JavaScript
│   │   └── index-[hash].css   # Bundled CSS
│   └── vite.svg
├── src/                        # Source files
├── firebase.json               # Firebase hosting config
├── .firebaserc                 # Firebase project config
├── .env                        # Development environment
├── .env.production             # Production environment
├── package.json
└── vite.config.ts
```

---

## Quick Deploy Commands

```bash
# Full deployment
cd admin-panel
npm install              # Only once, or when dependencies change
npm run build            # Build for production
firebase deploy          # Deploy to Firebase

# Quick redeploy (after code changes)
npm run build && firebase deploy --only hosting

# Use npm script
npm run deploy
```

---

## Production URLs

After deployment:

- **Admin Panel:** https://land-scanner-tamil-developers.web.app
- **Alternative:** https://land-scanner-tamil-developers.firebaseapp.com
- **Firebase Console:** https://console.firebase.google.com/project/land-scanner-tamil-developers

---

## Cost

Firebase Hosting Free Tier:
- ✅ 10 GB storage
- ✅ 360 MB/day bandwidth
- ✅ Free SSL certificate
- ✅ Global CDN

**Cost: $0/month** for admin panel! 🎉

---

## Next Steps After Deployment

1. **Test end-to-end flow:**
   - Create zone
   - Trigger collection
   - View results

2. **Monitor logs:**
   - Firebase Console → Hosting
   - Browser DevTools → Console
   - Backend logs in Railway/Render

3. **Setup custom domain (optional):**
   ```bash
   firebase hosting:channel:deploy live --domain admin.landscanner.com
   ```

4. **Add authentication:**
   - Implement Firebase Auth
   - Protect admin routes

---

## Security Checklist

Before going live:

- [ ] Backend URL in `.env.production` is HTTPS
- [ ] Firebase config uses environment variables
- [ ] CORS configured on backend
- [ ] No credentials in code
- [ ] Authentication enabled (future)
- [ ] Firebase security rules configured

---

## Support

**Common Issues:**
- Network error during npm install → Use mobile hotspot
- Build fails → Delete node_modules and reinstall
- CORS error → Update backend ALLOWED_ORIGINS
- Deploy fails → Check Firebase login

**Need help?**
- Firebase Docs: https://firebase.google.com/docs/hosting
- Vue Docs: https://vuejs.org/guide/
- Vite Docs: https://vitejs.dev/guide/

---

**Your admin panel is ready to deploy!** 🚀

Just wait for stable network → `npm install` → `npm run build` → `firebase deploy`
