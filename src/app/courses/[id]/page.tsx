import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LearnDetail from "@/components/events/LearnDetail";
import { publicApi, safe } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function findCourse(id: string) {
  const items = await safe(publicApi.courses({ limit: 200 }), []);
  return items.find((c) => c._id === id) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const course = await findCourse(id);
  if (!course) return { title: "Course" };
  return { title: course.title, description: course.description?.slice(0, 160) };
}

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await findCourse(id);
  if (!course) notFound();
  return <LearnDetail item={course} kind="course" />;
}
