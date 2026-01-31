# Ajay Construction Agent - Hyderabad

Premium engineering consultancy platform for **Hyderabad & Telangana** real estate agents.

## 🚀 Deployment Instructions (Fix 403 Error)
If you are receiving a 403 error, it is because of cached credentials. Use this specific format:

```bash
# 1. Start fresh
git init
git add .
git commit -m "Deployment Fix"
git branch -M main

# 2. Link using your Token (Replace YOUR_TOKEN)
git remote add origin https://ajayaispoc-oss:YOUR_TOKEN@github.com/ajayaispoc-oss/ajayconstructionagent.git

# 3. Push
git push -u origin main --force
```

## 🏗️ 2026 Agent Capabilities
- **Project Subtypes**: Specialized logic for "Independent Houses" (Structural) vs "Apartment Flats" (Finishing).
- **2026 Price Index**: Real-time market forecasts for Hyderabad zones (Madhapur, Gachibowli, etc.).
- **Material Specs**: Automated suggestions for brands like UltraTech, Finolex, and Goldmedal.
- **Architectural Renders**: AI-generated 3D concepts for client pitches.

## 🛠️ Technical Stack
- **Frontend**: React 19 + TypeScript (ESM)
- **Styling**: Tailwind CSS
- **Intelligence**: Google Gemini API (Jan 2026 Index)