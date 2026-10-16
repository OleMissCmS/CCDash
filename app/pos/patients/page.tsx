import { PatientManager } from "@/components/pos/PatientManager";
import { listPatients } from "@/lib/pos/store";

export default async function PatientsPage() {
  const patients = await listPatients();
  return <PatientManager initialPatients={patients} />;
}
