import type { Metadata } from "next";
import DriverApp from "@/components/clients/DriverApp";

export const metadata: Metadata = {
  title: "LakerPool Driver",
  description: "See and accept ride requests from GVSU students."
};

export default function DriverPage() {
  return <DriverApp />;
}
