import { redirect } from "next/navigation";

export default function LeaveRedirectPage() {
  redirect("/attendance?tab=leave");
}
