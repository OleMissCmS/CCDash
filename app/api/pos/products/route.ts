import { NextResponse } from "next/server";
import { requirePosUser } from "@/lib/pos/auth";
import { createProduct, listProducts, updateProduct } from "@/lib/pos/store";
import type { ProductInput } from "@/lib/pos/types";

export async function GET(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") !== "false";
  const q = searchParams.get("q")?.trim();

  const products = await listProducts({ activeOnly, q: q || undefined });
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const { user, error } = await requirePosUser();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = (await request.json()) as ProductInput;
  if (!body.name?.trim() || !body.sku?.trim()) {
    return NextResponse.json(
      { error: "Name and SKU are required." },
      { status: 400 }
    );
  }

  try {
    const product = await createProduct(body);
    return NextResponse.json({ product }, { status: 201 });
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
  const { id, ...updates } = body as ProductInput & { id: string };

  if (!id) {
    return NextResponse.json({ error: "Product id is required." }, { status: 400 });
  }

  try {
    const product = await updateProduct(id, updates);
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
