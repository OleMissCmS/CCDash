import type { Campus } from "@/lib/types";

export type ChmsAssignmentStatus = "open" | "in_progress" | "done";

export type ChmsPerson = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  campus_id: string | null;
  family_id: string | null;
  is_first_time_guest: boolean;
  source: string;
  created_at: string;
  campus?: Campus | null;
};

export type ChmsProcess = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_hidden: boolean;
  sort_order: number;
};

export type ChmsQueue = {
  id: string;
  process_id: string;
  slug: string;
  name: string;
  description: string | null;
  instructions: string | null;
  sort_order: number;
  default_due_days: number;
  process?: ChmsProcess;
};

export type ChmsAssignment = {
  id: string;
  person_id: string;
  queue_id: string;
  status: ChmsAssignmentStatus;
  ministry_area: string | null;
  campus_id: string | null;
  assigned_to: string | null;
  due_at: string | null;
  entered_at: string;
  started_at: string | null;
  completed_at: string | null;
  person?: ChmsPerson;
  queue?: ChmsQueue;
  campus?: Campus | null;
  assignee?: { id: string; display_name: string | null } | null;
};

export type ChmsAssignmentNote = {
  id: string;
  assignment_id: string;
  author_id: string | null;
  body: string;
  contact_type: string | null;
  created_at: string;
  author?: { display_name: string | null } | null;
};

export type ChmsQueueTransition = {
  id: string;
  from_queue_id: string;
  to_queue_id: string;
  label: string | null;
  is_default: boolean;
  to_queue?: ChmsQueue;
};

export type ChmsQueueWithCounts = ChmsQueue & {
  open_count: number;
  unassigned_count: number;
};

export type ChmsProcessWithQueues = ChmsProcess & {
  queues: ChmsQueueWithCounts[];
};
