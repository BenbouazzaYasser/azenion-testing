import { ChevronDown } from "lucide-react";
import { serverT } from "@/lib/translation/server";
import type { DictKey } from "@/lib/translation/types";
import { JsonLd } from "@/components/seo/json-ld";

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
  const entities = await Promise.all(
    FAQS.map(async (faq) => ({
      "@type": "Question",
      name: await serverT(faq.questionKey),
      acceptedAnswer: {
        "@type": "Answer",
        text: await serverT(faq.answerKey),
      },
    })),
  );

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: entities,
        }}
      />
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-normal text-ink-500">
            {await serverT("home.faqEyebrow")}
          </p>
          <h2
            id="faq-heading"
            className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem] lg:text-[3rem]"
          >
            {await serverT("home.faqTitle")}{await serverT("home.faqAccent")}
          </h2>
        </div>

        {/* One question per row on a hairline — readable, no card kit. */}
        <div className="mx-auto mt-12 max-w-3xl border-t border-border">
          {(await Promise.all(FAQS.map(async (faq) => (
            <details key={faq.questionKey} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
                <span className="text-[1.05rem] font-semibold text-ink-50">
                  {await serverT(faq.questionKey)}
                </span>
                <ChevronDown
                  size={16}
                  className="shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="pb-5 pr-10 text-sm leading-relaxed text-ink-400">
                {await serverT(faq.answerKey)}
              </p>
            </details>
          ))))}
        </div>
      </div>
    </section>
    </>
  );
}
