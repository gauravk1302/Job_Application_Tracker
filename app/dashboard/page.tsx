import KanbanBoard from "@/components/kanban-board";
import { createClient } from "@/lib/supabase/server";
import connectDB from "@/lib/db";
import { Board } from "@/lib/models";
import { initializeUserBoard } from "@/lib/init-user-board";
import { redirect } from "next/navigation";
import React, { Suspense } from "react";

async function getBoard(userId: string) {
  

  await connectDB();

  const boardDoc = await Board.findOne({
    userId,
    name: "Job Hunt",
  }).populate({
    path: "columns",
    populate: {
      path: "jobApplications",
      model: "JobApplication",
    },
  });

  if (!boardDoc) return null;

  return JSON.parse(JSON.stringify(boardDoc));
}

async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const userId = user.id;

  let board = await getBoard(userId);
  if (!board) {
    await initializeUserBoard(userId);
    board = await getBoard(userId);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        <div className="flex justify-center">
          <div className="w-full max-w-7xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-black">Job Hunt</h1>
              <p className="text-gray-600">Track your job applications</p>
            </div>
            <div className="overflow-x-auto">
              <KanbanBoard board={board} userId={userId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <DashboardPage />
    </Suspense>
  );
}