import { NextRequest, NextResponse } from "next/server";
import { addReply } from "@/lib/commentsStore";

// POST /api/comments/reply — add reply to a comment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, username, message } = body;

    if (!commentId || typeof commentId !== "string") {
      return NextResponse.json({ error: "Comment ID is required." }, { status: 400 });
    }
    if (!username || typeof username !== "string" || username.trim().length < 1) {
      return NextResponse.json({ error: "Username is required." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length < 1) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    if (message.trim().length > 500) {
      return NextResponse.json({ error: "Reply must be under 500 characters." }, { status: 400 });
    }

    const reply = addReply(commentId, username, message);
    if (!reply) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: reply }, { status: 201 });
  } catch (error) {
    console.error("POST reply error:", error);
    return NextResponse.json({ error: "Failed to post reply." }, { status: 500 });
  }
}
