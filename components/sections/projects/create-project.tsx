import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { serverT } from "@/lib/translation/server";

export async function CreateProject() {
  return (
    <section className="relative py-20 sm:py-24 lg:py-28" aria-labelledby="create-project-heading">
      <div className="mx-auto max-w-[960px] px-5 sm:px-8 lg:px-12">
        
          <div className="group relative overflow-hidden rounded-lg card-surface p-10 transition-colors duration-200 ease-out hover:border-accent-400/40 sm:p-14 lg:p-16">
            <div className="relative">
              <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-400/30 bg-accent/[0.08] text-accent-400">
                  <Plus size={24} strokeWidth={2} />
                </div>

                <h2
                  id="create-project-heading"
                  className="mt-6 text-balance text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]"
                >
                  {await serverT("projects.ctaTitle")}
                </h2>

                <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-ink-400">
                  {await serverT("projects.ctaSub")}
                </p>

                <div className="mt-8">
                  <Button size="lg" asChild>
                    <Link href="/projects/create">
                      {await serverT("projects.ctaButton")}
                      <Plus size={16} />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        
      </div>
    </section>
  );
}
