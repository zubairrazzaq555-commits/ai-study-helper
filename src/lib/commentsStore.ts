// Simple file-based comment store using a JSON file
// For production, swap this with SQLite or Supabase
// This works perfectly for a testing/feedback system

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const COMMENTS_FILE = join(DATA_DIR, "comments.json");

export interface Reply {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  replies: Reply[];
}

function ensureFile() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(COMMENTS_FILE)) {
    writeFileSync(COMMENTS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function readComments(): Comment[] {
  try {
    ensureFile();
    const raw = readFileSync(COMMENTS_FILE, "utf-8");
    return JSON.parse(raw) as Comment[];
  } catch {
    return [];
  }
}

export function writeComments(comments: Comment[]): void {
  ensureFile();
  writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), "utf-8");
}

export function addComment(username: string, message: string): Comment {
  const comments = readComments();
  const newComment: Comment = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    username: username.trim().slice(0, 50),
    message: message.trim().slice(0, 1000),
    timestamp: new Date().toISOString(),
    replies: [],
  };
  comments.unshift(newComment); // newest first
  writeComments(comments);
  return newComment;
}

export function addReply(commentId: string, username: string, message: string): Reply | null {
  const comments = readComments();
  const comment = comments.find((c) => c.id === commentId);
  if (!comment) return null;

  const reply: Reply = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    username: username.trim().slice(0, 50),
    message: message.trim().slice(0, 500),
    timestamp: new Date().toISOString(),
  };

  comment.replies.push(reply);
  writeComments(comments);
  return reply;
}

export function deleteComment(commentId: string): boolean {
  const comments = readComments();
  const idx = comments.findIndex((c) => c.id === commentId);
  if (idx === -1) return false;
  comments.splice(idx, 1);
  writeComments(comments);
  return true;
}

export function sanitize(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .trim();
}
