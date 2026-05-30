"use server";

import connectDB from "../db";
import { Board, Column, JobApplication } from "../models";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

interface JobApplicationData {
  company: string;
  position: string;
  location?: string;
  notes?: string;
  salary?: string;
  jobUrl?: string;
  columnId: string;
  boardId: string;
  tags?: string[];
  description?: string;
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function createJobApplication(data: JobApplicationData) {
  const user = await getUser();
  if (!user) return { error: "Unauthorised Access" };

  await connectDB();

  const { company, position, location, notes, salary, jobUrl, columnId, boardId, tags, description } = data;

  if (!company || !position || !columnId || !boardId) {
    return { error: "Missing required fields" };
  }

  const board = await Board.findOne({ _id: boardId, userId: user.id });
  if (!board) return { error: "Board not found" };

  const column = await Column.findOne({ _id: columnId, boardId });
  if (!column) return { error: "Column not found" };

  const maxOrder =
    ((await JobApplication.findOne({ columnId })
      .sort({ order: -1 })
      .select("order")
      .lean()) as { order: number } | null);

  const jobApplication = await JobApplication.create({
    company, position, location, notes, salary, jobUrl,
    columnId, boardId,
    userId: user.id,
    tags: tags || [],
    description,
    status: "Applied",
    order: maxOrder ? maxOrder.order + 100 : 0,
  });

  await Column.findByIdAndUpdate(columnId, {
    $push: { jobApplications: jobApplication._id },
  });

  revalidatePath("/dashboard");
  return { data: JSON.parse(JSON.stringify(jobApplication)) };
}

export async function updateJobApplication(
  id: string,
  updates: Partial<{
    company: string;
    position: string;
    location?: string;
    notes?: string;
    salary?: string;
    jobUrl?: string;
    columnId: string;
    order?: number;
    boardId: string;
    tags?: string[];
    description?: string;
  }>
) {
  const user = await getUser();
  if (!user) return { error: "Unauthorized access" };

  await connectDB();

  const jobApplication = await JobApplication.findById(id);
  if (!jobApplication) return { error: "Job application not found" };

  if (jobApplication.userId.toString() !== user.id) {
    return { error: "Unauthorized" };
  }

  const { columnId, order, boardId, ...otherUpdates } = updates;
  const updatesToApply: Partial<{
    company: string;
    position: string;
    location: string;
    notes: string;
    salary: string;
    jobUrl: string;
    columnId: string;
    order: number;
    tags: string[];
    description: string;
  }> = otherUpdates;

  const currentColumnId = jobApplication.columnId.toString();
  const newColumnId = columnId?.toString();
  const isMovingToDifferentColumn = newColumnId && newColumnId !== currentColumnId;

  if (isMovingToDifferentColumn) {
    await Column.findByIdAndUpdate(currentColumnId, {
      $pull: { jobApplications: id },
    });

    const jobsInTargetColumn = await JobApplication.find({
      columnId: newColumnId,
      _id: { $ne: id },
    }).sort({ order: 1 }).lean();

    let newOrderValue: number;

    if (order != undefined && order !== null) {
      newOrderValue = order * 100;
      const jobsThatNeedToShift = jobsInTargetColumn.slice(order);
      for (const job of jobsThatNeedToShift) {
        await JobApplication.findByIdAndUpdate(job._id, {
          $set: { order: job.order + 100 },
        });
      }
    } else {
      if (jobsInTargetColumn.length > 0) {
        const lastJobOrder = jobsInTargetColumn[jobsInTargetColumn.length - 1].order || 0;
        newOrderValue = lastJobOrder + 100;
      } else {
        newOrderValue = 0;
      }
    }

    updatesToApply.columnId = newColumnId;
    updatesToApply.order = newOrderValue;

    await Column.findByIdAndUpdate(newColumnId, {
      $push: { jobApplications: id },
    });
  } else if (order !== undefined && order !== null) {
    const otherJobsInColumn = await JobApplication.find({
      columnId: currentColumnId,
      _id: { $ne: id },
    }).sort({ order: 1 }).lean();

    const currentJobOrder = jobApplication.order || 0;
    const currentPositionIndex = otherJobsInColumn.findIndex(
      (job: { order: number; }) => job.order > currentJobOrder
    );
    const oldPositionIndex =
      currentPositionIndex === -1 ? otherJobsInColumn.length : currentPositionIndex;

    const newOrderValue = order * 100;

    if (order < oldPositionIndex) {
      const jobsToShiftDown = otherJobsInColumn.slice(order, oldPositionIndex);
      for (const job of jobsToShiftDown) {
        await JobApplication.findByIdAndUpdate(job._id, {
          $set: { order: job.order + 100 },
        });
      }
    } else if (order > oldPositionIndex) {
      const jobsToShiftUp = otherJobsInColumn.slice(oldPositionIndex, order);
      for (const job of jobsToShiftUp) {
        await JobApplication.findByIdAndUpdate(job._id, {
          $set: { order: Math.max(0, job.order - 100) },
        });
      }
    }

    updatesToApply.order = newOrderValue;
  }

  const updated = await JobApplication.findByIdAndUpdate(id, updatesToApply, { new: true });

  revalidatePath("/dashboard");
  return { data: JSON.parse(JSON.stringify(updated)) };
}

export async function deleteJobApplication(id: string) {
  const user = await getUser();
  if (!user) return { error: "Unauthorized" };

  await connectDB();

  const jobApplication = await JobApplication.findById(id);
  if (!jobApplication) return { error: "Job application not found" };

  if (jobApplication.userId.toString() !== user.id) {
    return { error: "Unauthorized" };
  }

  await Column.findByIdAndUpdate(jobApplication.columnId, {
    $pull: { jobApplications: id },
  });

  await JobApplication.deleteOne({ _id: id });
  revalidatePath("/dashboard");
  return { success: true };
}