import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">Welcome to TicketsBot</h1>
        <p className="mb-8 text-lg text-gray-600">
          The best Discord bot for customer support tickets
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}