# Ajay Construction Agent - Hyderabad

Premium engineering consultancy platform for **Hyderabad & Telangana**.

## 🔴 CRITICAL FIX: "403 Forbidden / Permission Denied"
If you see the 403 error when pushing, it means your token doesn't have the **`repo`** permission.

1. **New Token**: Go to [GitHub Settings](https://github.com/settings/tokens) and generate a new token.
2. **Scopes**: You **MUST** check the box for **`repo`** and **`workflow`**.
3. **Reset Git**:
```bash
# Replace NEW_TOKEN with your actual ghp_... code
git remote set-url origin https://ajayaispoc-oss:NEW_TOKEN@github.com/ajayaispoc-oss/ayayconstructionagent.git
git push -u origin main --force
```

---

## 🏗️ 2026 Agent Features

- **House vs Flat Context**: Intelligent estimation for ground-up construction vs. apartment shell finishing.
- **Quality Grade Selection**: Different rates for Budget, Standard, Premium, and Luxury finishes.
- **WhatsApp Direct Share**: Send professional quote summaries directly to clients.
- **Market Monitoring**: Automated calculation for **Finolex** wiring and **Goldmedal** modular fits.
- **Architectural Renders**: AI-powered visualization (Gemini 2.5 Flash) for client presentations.

## 🛠️ Technical
- **Framework**: React 19 (ESM)
- **Styling**: Tailwind CSS
- **AI Engine**: Google Gemini (Jan 2026 Forecast)
