import type { Metadata } from "next";
import RiderApp from "@/components/clients/RiderApp";

export const metadata: Metadata = {
  title: "LakerPool Rider",
  description: "Request a ride from a GVSU student driver."
};

export default function RiderPage() {
  return <RiderApp />;
}
