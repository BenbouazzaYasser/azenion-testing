import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "What is Azenion?",
    answer:
      "Azenion is a network for students, builders and creators. It brings together branches, teams, projects, learning and live sessions so ambitious people can find each other and build together.",
  },
  {
    question: "Who can join?",
    answer:
      "Anyone who wants to learn, collaborate and build. Create a free account, pick a branch or team that fits you, and start contributing at your own pace.",
  },
  {
    question: "Is Azenion free?",
    answer:
      "Yes. Joining, browsing teams and projects, and taking part in the community is free. Academy sessions are open to members of the network.",
  },
  {
    question: "Can I create a team or project?",
    answer:
      "Absolutely. Once you're in, you can start your own team, spin up a project, list open roles and start recruiting the right people.",
  },
  {
    question: "How do branches work?",
    answer:
      "Branches are local communities within Azenion. They gather members around a region or a focus area and act as the hub for events, announcements and collaborations.",
  },
  {
    question: "What can I build with Azenion?",
    answer:
      "Almost anything — a study group, an open-source tool, a startup, a creative project or a research team. If you can describe it, you can start it.",
  },
];

export function Faq() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              FAQ
            </span>
            <h2
              id="faq-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[3rem]"
            >
              Questions, <span className="text-accent-400">answered.</span>
            </h2>
          </div>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-2">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.question} delay={i * 60}>
              <details
                className="group rounded-[1.5rem] border border-border-strong card-surface-soft shadow-card backdrop-blur-xl transition-all duration-500 ease-premium open:border-accent-400/40 open:shadow-glow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
                  <span className="text-[1.05rem] font-semibold text-ink-50">
                    {faq.question}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-ink-300 transition-transform duration-500 ease-premium group-open:rotate-180">
                    <ChevronDown size={16} />
                  </span>
                </summary>
                <p className="px-6 pb-6 text-sm leading-relaxed text-ink-400">
                  {faq.answer}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
