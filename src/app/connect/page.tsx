import { redirect } from "next/navigation";

/** Connect tab dihapus — koneksi sekarang full via card home. Redirect /connect → / */
export default function ConnectPage() {
  redirect("/");
}
