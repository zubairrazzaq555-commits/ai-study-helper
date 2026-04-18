import { NextRequest, NextResponse } from "next/server";
import { readComments, addComment } from "@/lib/commentsStore";

// GET /api/comments — fetch all comments
export async function GET() {
  try {
    const comments = readComments();
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error("GET comments error:", error);
    return NextResponse.json({ error: "Failed to load comments." }, { status: 500 });
  }
}

// POST /api/comments — add new comment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, message } = body;

    if (!username || typeof username !== "string" || username.trim().length < 1) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length < 1) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    if (message.trim().length > 1000) {
      return NextResponse.json({ error: "Message must be under 1000 characters." }, { status: 400 });
    }

    const comment = addComment(username, message);
    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    console.error("POST comment error:", error);
    return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  }
}
