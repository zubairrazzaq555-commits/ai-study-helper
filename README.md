# StudyAI — Production-Ready AI Study Helper

Convert notes or PDFs into summaries, quizzes, and study plans using AI.

## ✨ Features

| Feature | Status |
|---------|--------|
| Text input (unlimited, ~80K chars) | ✅ |
| **PDF upload + text extraction** | ✅ NEW |
| **Large document chunk processing** | ✅ NEW |
| AI Summary generation | ✅ |
| AI Quiz generation | ✅ |
| AI Study Plan generation | ✅ |
| **Real comments + threaded replies** | ✅ NEW |
| **English ↔ Chinese language toggle** | ✅ NEW |
| Session history (localStorage) | ✅ |
| Rate limiting (10 req/min) | ✅ |
| Responsive (mobile + desktop) | ✅ |

## 🚀 Quick Start

```bash
npm install
npm run dev
# → http://localhost:3000
```

`.env.local` already has your API key configured.

## 📄 PDF Support
- Client-side extraction via pdfjs-dist (no server needed)
- Up to 50 pages per PDF
- Auto-chunks large PDFs for AI processing

## 💬 Comments System
- Stored in `data/comments.json` (auto-created)
- Threaded replies supported
- For Vercel: replace with Supabase (see README notes)

## 🌐 Languages
- English / Chinese — toggle in Navbar on every page

## 🚀 Deploy to Vercel
1. Push to GitHub
2. Import on vercel.com
3. Add env vars: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `NEXT_PUBLIC_APP_URL`
4. Deploy!

> Note: `data/comments.json` won't persist on Vercel serverless. Use Supabase for production comments.
