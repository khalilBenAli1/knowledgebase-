# Email Configuration Troubleshooting Guide

## Error: "missing credentials for PLAIN"

This error occurs when the email credentials are not properly loaded from the environment variables.

## Step-by-Step Fix

### 1. **Verify .env File Exists**
```bash
# In the project root directory (assurances-biat-ai-assistant/)
ls .env
```
If the file doesn't exist, create it by copying from .env.example:
```bash
cp .env.example .env
```

### 2. **Check Email Configuration in .env**

Open the `.env` file and verify these lines exist and are properly set:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=khalil.ben.ali16121@gmail.com
EMAIL_PASSWORD=mgmi fvgf ofkp abzp
APP_URL=http://localhost:5173
```

⚠️ **IMPORTANT NOTES:**
- Do NOT use quotes around the values (e.g., `EMAIL_USER="email"` is WRONG)
- Do NOT have trailing spaces after the values
- The EMAIL_PASSWORD is a Gmail App Password (4 groups of 4 characters with spaces)
- Make sure there are NO extra quotes or special characters

### 3. **Common Mistakes to Avoid**

❌ **WRONG:**
```env
EMAIL_USER="khalil.ben.ali16121@gmail.com"
EMAIL_PASSWORD="mgmi fvgf ofkp abzp"
```

✅ **CORRECT:**
```env
EMAIL_USER=khalil.ben.ali16121@gmail.com
EMAIL_PASSWORD=mgmi fvgf ofkp abzp
```

### 4. **Verify File Encoding**

The .env file must be in **UTF-8** encoding without BOM. If you're on Windows:
- Open .env in Notepad++
- Check encoding: Should be "UTF-8" or "UTF-8 without BOM"
- If not, convert: Encoding → Convert to UTF-8

### 5. **Check for Hidden Characters**

Sometimes copy-pasting can introduce hidden characters:
```bash
# On Windows (PowerShell)
cat .env | Select-String "EMAIL"

# On Linux/Mac
cat .env | grep EMAIL
```

Look for any weird characters or extra spaces.

### 6. **Restart the Server Completely**

After modifying .env, you MUST restart the server:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run start:dev
```

### 7. **Check Server Logs**

When the server starts, look for these logs:

✅ **SUCCESS - You should see:**
```
=== EMAIL CONFIGURATION DEBUG ===
EMAIL_HOST: smtp.gmail.com
EMAIL_PORT: 587
EMAIL_SECURE: false
EMAIL_USER: Set (khalil.ben.ali16121@gmail.com)
EMAIL_PASSWORD: Set (length: 19)
================================
✓ Email credentials loaded successfully
```

❌ **FAILURE - If you see:**
```
EMAIL_USER: NOT SET
EMAIL_PASSWORD: NOT SET
⚠️  EMAIL CONFIGURATION ERROR: Missing required environment variables
```

This means the .env file is not being read properly.

### 8. **Verify .env is Not in .gitignore**

Actually, .env SHOULD be in .gitignore for security, but make sure you have a copy locally:
```bash
# Check if .env exists
ls -la | grep .env

# You should see both:
# .env         (your local configuration - not committed to git)
# .env.example (example template - committed to git)
```

### 9. **Test Email Sending**

Once the server shows successful configuration, test by:
1. Creating a new user account (triggers verification email)
2. Check server logs for email sending status
3. Check your email inbox/spam folder

### 10. **Alternative: Use Environment Variables Directly**

If .env still doesn't work, set environment variables directly:

**Windows (PowerShell):**
```powershell
$env:EMAIL_USER="khalil.ben.ali16121@gmail.com"
$env:EMAIL_PASSWORD="mgmi fvgf ofkp abzp"
$env:EMAIL_HOST="smtp.gmail.com"
$env:EMAIL_PORT="587"
npm run start:dev
```

**Linux/Mac:**
```bash
export EMAIL_USER=khalil.ben.ali16121@gmail.com
export EMAIL_PASSWORD="mgmi fvgf ofkp abzp"
export EMAIL_HOST=smtp.gmail.com
export EMAIL_PORT=587
npm run start:dev
```

## Still Not Working?

### Check Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Generate a new 16-character app password
3. Use this password (with spaces) in EMAIL_PASSWORD

### Firewall/Antivirus

Some firewalls block SMTP connections:
- Temporarily disable antivirus/firewall
- Check if port 587 is blocked
- Try using port 465 with `EMAIL_SECURE=true`

### Check Node.js Version

```bash
node --version
# Should be >= 18.x
```

## Need More Help?

Run the server and copy the EMAIL CONFIGURATION DEBUG section from the logs, along with:
1. Operating System
2. Node.js version
3. Whether .env file exists
4. Content of .env file (hide the actual password)
