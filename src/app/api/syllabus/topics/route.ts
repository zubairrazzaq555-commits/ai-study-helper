import { NextRequest, NextResponse } from "next/server";
import { syllabus, getTopicById } from "@/lib/syllabusLoader";

// GET /api/syllabus/topics
// Returns full syllabus hierarchy or a single topic
// Query params:
//   ?topicId=PHY-G9-CH01-T01  → single topic
//   ?chapterIndex=1             → topics for one chapter
//   (none)                      → full syllabus

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topicId      = searchParams.get("topicId");
  const chapterParam = searchParams.get("chapterIndex");

  // Single topic lookup
  if (topicId) {
    const topic = getTopicById(topicId);
    if (!topic) {
      return NextResponse.json({ error: `Topic '${topicId}' not found.` }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: topic });
  }

  // Single chapter
  if (chapterParam) {
    const idx = parseInt(chapterParam, 10);
    const chapter = syllabus.chapters.find((c) => c.chapterIndex === idx);
    if (!chapter) {
      return NextResponse.json({ error: `Chapter ${idx} not found.` }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: chapter });
  }

  // Full syllabus (all chapters + topics)
  return NextResponse.json({
    success: true,
    data: {
      subject:     syllabus.subject,
      subjectCode: syllabus.subjectCode,
      grade:       syllabus.grade,
      gradeCode:   syllabus.gradeCode,
      totalTopics: syllabus.totalTopics,
      chapters:    syllabus.chapters,
    },
  });
}
