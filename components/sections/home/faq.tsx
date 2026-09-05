import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";

interface FaqItem {
  questionKey: DictKey;
  answerKey: DictKey;
}

const FAQS: FaqItem[] = [
  {
    questionKey: "home.faqWhatIs",
    answerKey: "home.faqWhatIsA",
  },
  {
    questionKey: "home.faqWhoCanJoin",
    answerKey: "home.faqWhoCanJoinA",
  },
  {
    questionKey: "home.faqFree",
    answerKey: "home.faqFreeA",
  },
  {
    questionKey: "home.faqCreate",
    answerKey: "home.faqCreateA",
  },
  {
    questionKey: "home.faqBranches",
    answerKey: "home.faqBranchesA",
  },
  {
    questionKey: "home.faqBuild",
    answerKey: "home.faqBuildA",
  },
];

export async function Faq() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.18em] text-accent-300">
              {await serverT("home.faqEyebrow")}
            </span>
            <h2
              id="faq-heading"
              className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[3rem]"
            >
              {await serverT("home.faqTitle")}<span className="text-accent-400">{await serverT("home.faqAccent")}</span>
            </h2>
          </div>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-2">
          {await Promise.all(FAQS.map(async (faq, i) => (
            <Reveal key={faq.questionKey} delay={i * 60}>
              <details
                className="group rounded-[1.5rem] card-surface-soft shadow-card backdrop-blur-xl transition-all duration-500 ease-premium open:border-accent-400/40 open:shadow-glow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
                  <span className="text-[1.05rem] font-semibold text-ink-50">
                    {await serverT(faq.questionKey)}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-300 transition-transform duration-500 ease-premium group-open:rotate-180">
                    <ChevronDown size={16} />
                  </span>
                </summary>
                <p className="px-6 pb-6 text-sm leading-relaxed text-ink-400">
                  {await serverT(faq.answerKey)}
                </p>
              </details>
            </Reveal>
          )))}
        </div>
      </div>
    </section>
  );
}
