"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

const FAQ_ITEMS = [
  {
    id: "what-is",
    question: "What is Azenion?",
    answer:
      "Azenion is a global network that connects ambitious students, developers, designers, entrepreneurs, and innovators. We provide the community, resources, and opportunities to help talented people build meaningful projects and shape the future together.",
  },
  {
    id: "how-join",
    question: "How do I join?",
    answer:
      "Joining is simple. Find a branch near you on our Branches page, or if your campus isn't listed yet, reach out to us and we'll help you start one. You can also join our Discord to connect with the community directly.",
  },
  {
    id: "is-free",
    question: "Is Azenion free?",
    answer:
      "Yes. Azenion is completely free for all members. Our mission is to remove barriers and make opportunity accessible to anyone with ambition. There are no membership fees, no hidden costs, and no applications required.",
  },
  {
    id: "outside-institutions",
    question: "Can I join if I'm not part of a listed institution?",
    answer:
      "Absolutely. While we organize around campus branches, you don't need to be at a partner institution to be part of Azenion. Our community is open to anyone who shares our values and wants to build, learn, and collaborate.",
  },
];

export function Faq() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-[800px] px-5 sm:px-8 lg:px-12">
        <Reveal>
          <h2
            id="faq-heading"
            className="text-center text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
          >
            Frequently asked questions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[1.02rem] leading-7 text-ink-400">
            Everything you need to know about Azenion.
          </p>
        </Reveal>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <Reveal key={item.id} delay={i * 60}>
              <div className="group overflow-hidden rounded-2xl card-surface shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:border-accent-400/40">
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={openId === item.id}
                  aria-controls={`faq-answer-${item.id}`}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors duration-300 sm:px-8 sm:py-6"
                >
                  <span className="text-[1rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400 sm:text-[1.05rem]">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-ink-400 transition-all duration-500 ease-premium ${
                      openId === item.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  id={`faq-answer-${item.id}`}
                  role="region"
                  className={`grid transition-all duration-500 ease-premium ${
                    openId === item.id ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-border px-6 pb-6 pt-4 sm:px-8 sm:pb-8">
                      <p className="text-[0.92rem] leading-relaxed text-ink-400">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
