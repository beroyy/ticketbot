import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/features/tickets/ui/tickets-list/ticket-card";
import { FaDiscord } from "react-icons/fa6";

export const BlurredLp = () => {
  return (
    <main className="pointer-events-none h-dvh w-full overflow-hidden pt-2 text-[#ffffff] blur-sm">
      <Header />
      <Hero />
      <div className="absolute bottom-0 z-10 h-20 w-full bg-white px-4"></div>
    </main>
  );
};

function Header() {
  return (
    <header className="z-2 sticky top-0 bg-[linear-gradient(120deg,#0e121b_0%,#052249_60%)]">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-4">
        <Link href="#" className="flex items-center gap-2">
          <Image src={"/logo.svg"} alt="Logo" width={160} height={40} />
          <span className="sr-only">Home</span>
        </Link>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-14 text-sm font-semibold text-[#99a0ae] md:flex"
        >
          <Link className="transition-colors hover:text-white" href="#">
            Features
          </Link>
          <Link className="transition-colors hover:text-white" href="#">
            Documentation
          </Link>
          <Link className="transition-colors hover:text-white" href="#">
            FAQ&apos;s
          </Link>
          <Link className="transition-colors hover:text-white" href="#">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            className="bg-light-blurple hidden rounded-lg text-white hover:bg-white/10 md:inline-flex"
            variant="ghost"
          >
            <FaDiscord className="size-5" />
            Connect Server
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="lg:-translate-y-18 relative overflow-hidden" aria-labelledby="hero-heading">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#0e121b_0%,#052249_60%)]" />
        <div className="absolute -right-32 top-0 h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,#3f40e3_0%,#7e7ee1_20%,transparent_60%)] opacity-50 blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{
            background:
              "repeating-linear-gradient(to right, rgba(225,228,234,0.18) 0px, rgba(225,228,234,0.18) 1px, transparent 1px, transparent 360px)",
          }}
          aria-hidden="true"
        />
      </div>
      <div className="relative mx-auto grid max-w-screen-2xl grid-cols-1 gap-12 px-4 py-16 md:grid-cols-2 md:py-24 lg:gap-64 lg:py-28">
        <div className="flex flex-col justify-center gap-2">
          <h1
            id="hero-heading"
            className="text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-[68px] lg:leading-[1.2]"
          >
            Supercharge Your Discord Support with AI
          </h1>
          <p className="mt-6 w-fit text-base leading-relaxed text-[#99a0ae]">
            {
              "An AI-powered support bot for Discord - search tickets, auto-reply, and sync your account in seconds"
            }
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button className="bg-light-blurple group inline-flex items-center gap-2 rounded-md px-4 py-5 text-white hover:opacity-90">
              <FaDiscord className="size-5" />
              Invite Bot to your server
            </Button>
            <Button
              variant="outline"
              className="border-white/20 bg-white/0 text-white hover:bg-white/10"
            >
              Go to dashboard
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="-rotate-25 lg:right-18 pointer-events-none absolute -right-6 -top-2 hidden md:-right-10 xl:block">
            <div className="relative">
              <div
                className="absolute inset-0 -z-10 blur-3xl"
                style={{
                  background: "radial-gradient(circle at 50% 50%, #adadff55, transparent 60%)",
                }}
              />
              <Image
                src="/ticket.svg"
                alt="Ticket icon illustration"
                width={80}
                height={80}
                className="rotate-25 -translate-x-[195px] -translate-y-16"
                priority
              />
              <Image
                src={"/big-icon.svg"}
                alt="Ticket icon illustration"
                width={380}
                height={380}
                className="-translate-x-11/12 rotate-25 -translate-y-20"
                priority
              />
            </div>
          </div>
          <div
            className="relative mx-auto grid max-w-[540px] gap-4 pt-40 md:pt-10"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, transparent, white)",
              maskImage: "linear-gradient(to top, transparent, white)",
            }}
          >
            <TicketCard
              ticket={{
                id: "#233",
                priority: "High",
                urgency: "High",
                progress: 0.5,
                type: "General Support",
                status: "In Progress",
                opener: "Rudain",
                lastMessage: "26 days ago",
                awaitingResponse: "Yes",
                createdAt: new Date().toISOString(),
                assignee: "Rudain",
                assigneeAvatar: "https://github.com/rudain.png",
              }}
            />
            <TicketCard
              ticket={{
                id: "#51",
                priority: "High",
                urgency: "High",
                progress: 0.5,
                type: "New Application",
                status: "On Hold",
                opener: "Unknown",
                lastMessage: "Last Month",
                awaitingResponse: "Yes",
                createdAt: new Date().toISOString(),
                assignee: "Unknown",
                assigneeAvatar: "https://github.com/unknown.png",
              }}
            />
            <TicketCard
              ticket={{
                id: "#723",
                priority: "High",
                urgency: "High",
                progress: 0.5,
                type: "Bugs & Error",
                status: "In Progress",
                opener: "Charlie",
                lastMessage: "Never",
                awaitingResponse: "No",
                createdAt: new Date().toISOString(),
                assignee: "Charlie",
                assigneeAvatar: "https://github.com/charlie.png",
              }}
            />
            <TicketCard
              ticket={{
                id: "#509",
                priority: "High",
                urgency: "High",
                progress: 0.5,
                type: "Bugs & Error",
                status: "On Hold",
                opener: "Zayy",
                lastMessage: "2 days ago",
                awaitingResponse: "Yes",
                createdAt: new Date().toISOString(),
                assignee: "Zayy",
                assigneeAvatar: "https://github.com/zayy.png",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
