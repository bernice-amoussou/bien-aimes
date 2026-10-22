import type { Metadata } from "next";
import { LoginView } from "@/components/forms/login-view";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginView />;
}
