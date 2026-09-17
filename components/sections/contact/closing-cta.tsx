import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardButton } from "@/components/shared/dashboard-button";

export function ContactCta() {
  return (
    <section
      aria-labelledby="contact-cta-heading"
      className="relative py-24 sm:py-28 lg:py-32"
    >
      <div className="relative mx-auto max-w-[720px] px-5 text-center sm:px-8">
        
          <h2
            id="contact-cta-heading"
            className="text-balance text-[2.2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[3rem] lg:text-[3.5rem]"
          >
            The next great idea starts with a conversation.
          </h2>
        

        
          <p className="mx-auto mt-6 max-w-xl text-balance text-[1.05rem] leading-relaxed text-ink-400">
            Whether you&apos;re ready to join, curious to learn more, or have an idea
            you&apos;d like to share — we&apos;d love to meet you.
          </p>
        

        
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <DashboardButton size="lg" label="Join Azenion" />
            <Button variant="secondary" size="lg" asChild>
              <Link href="/about">Read our story</Link>
            </Button>
          </div>
        
      </div>
    </section>
  );
}
