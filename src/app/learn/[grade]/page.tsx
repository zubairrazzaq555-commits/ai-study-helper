"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Grade page — for now Grade 9 only has Physics
// Redirects straight to /learn/grade-9/physics
// When more subjects are added, show subject selector here
export default function GradePage() {
  const params = useParams<{ grade: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/learn/${params.grade}/physics`);
  }, [params.grade, router]);

  return null;
}
