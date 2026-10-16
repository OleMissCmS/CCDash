import { NextResponse } from "next/server";
import { requirePosUser } from "@/lib/pos/auth";
import {
  createPatient,
  listPatients,
  markLocalCardOnFile,
  updatePatient,
} from "@/lib/pos/store";
import { isLocalPos } from "@/lib/pos/config";
import type { PatientInput } from "@/lib/pos/types";

export async function GET(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const patients = await listPatients(q || undefined);
  return NextResponse.json({ patients });
}

export async function POST(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = (await request.json()) as PatientInput & {
    action?: "save_card";
    patient_id?: string;
  };

  if (body.action === "save_card" && isLocalPos()) {
    if (!body.patient_id) {
      return NextResponse.json({ error: "patient_id is required." }, { status: 400 });
    }
    try {
      const patient = await markLocalCardOnFile(body.patient_id);
      return NextResponse.json({ patient });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save card.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (!body.first_name?.trim() || !body.last_name?.trim()) {
    return NextResponse.json(
      { error: "First and last name are required." },
      { status: 400 }
    );
  }

  try {
    const patient = await createPatient(body);
    return NextResponse.json({ patient }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body as PatientInput & { id: string };

  if (!id) {
    return NextResponse.json({ error: "Patient id is required." }, { status: 400 });
  }

  try {
    const patient = await updatePatient(id, updates);
    return NextResponse.json({ patient });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
