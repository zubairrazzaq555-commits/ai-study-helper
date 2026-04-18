# StudyAI — v9 · 中文优先 AI 学习平台

> Chinese-First AI-Powered Study Platform for Grade 9 Physics

## 🌏 Language System

| Feature | Status |
|---------|--------|
| **Default language: Chinese (简体中文)** | ✅ v9 NEW |
| Language persisted to localStorage | ✅ v9 NEW |
| Toggle: 中文 ↔ English | ✅ v9 NEW |
| All 40 topics: Chinese short notes (`short_cn`) | ✅ v9 NEW |
| All 40 topics: Chinese detailed notes (`detailed_cn`) | ✅ v9 NEW |
| Quiz forced in Chinese (AI prompt control) | ✅ v9 NEW |
| Chatbot forced in Chinese (system prompt) | ✅ v9 NEW |
| No mixed-language experience | ✅ v9 NEW |

## Core Architecture (v9)

```
JSON syllabus (40 topics, EN + CN short + detailed notes)
     ↓
Static content → loaded from JSON in selected language (ZERO API calls)
     ↓
AI used only for:  Quiz (Chinese questions) + Chatbot (Chinese responses)
     ↓
API priority:  Groq (fast) → OpenRouter #1 → OpenRouter #2 (auto-fallback)
```

## All Features

| Feature | Status |
|---------|--------|
| Chinese-first platform, English optional | ✅ NEW |
| Static notes from JSON (instant, zero API) | ✅ |
| Short Note tab — loads from JSON instantly | ✅ |
| Detailed tab — loads from JSON instantly + formula parser | ✅ |
| Quiz uses Chinese JSON notes as context | ✅ |
| Chatbot uses Chinese JSON notes as system context | ✅ |
| 3/6/9 month roadmap templates (no AI needed) | ✅ |
| Customize with AI roadmap option | ✅ |
| Today's Task Card — 4 options | ✅ |
| Progress Dashboard + Analytics | ✅ |
| Groq primary + 2x OpenRouter fallback | ✅ |

## Quick Start

```bash
npm install
npm run dev
# → http://localhost:3000/learn
# Opens in Chinese by default
```

## Language Toggle

- Default: **简体中文 (Chinese)**
- Click **"English"** button in navbar to switch
- Language preference saved in browser localStorage

## Routes

| Route | Description (Chinese) |
|-------|----------------------|
| `/learn` | 年级与科目选择 |
| `/learn/grade-9/physics` | 章节列表 + 路线图 + 今日任务 |
| `/learn/topic/phy-g9-ch01-t01` | 知识点：简短笔记/深入阅读/测验/问AI |
| `/learn/progress` | 进度与分析 |

## JSON Structure (v9)

```json
{
  "topic_en": "Ohm's Law",
  "topic_cn": "欧姆定律",
  "short": "English short note...",
  "short_cn": "欧姆定律：I = U/R...",
  "detailed": "English detailed note...",
  "detailed_cn": "欧姆定律详细说明..."
}
```

## AI Language Control

All AI prompts enforce language output:

```
Quiz (zh): "所有题目和选项必须用简体中文编写"
Chat (zh): "必须始终用简体中文回答，绝对不能用英文回答"
Quiz (en): "Respond in English only"
Chat (en): "Always respond in English"
```

## Environment Variables

```env
GROQ_API_KEY=gsk_...          # Primary (fast tasks)
OPENROUTER_API_KEY=sk-or-v1-... # Secondary
OPENROUTER_API_KEY_2=sk-or-v1-... # Fallback
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
GROQ_MODEL=llama-3.1-8b-instant
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
