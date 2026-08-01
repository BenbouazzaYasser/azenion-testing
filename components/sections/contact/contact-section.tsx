"use client";

import { useState } from "react";
import { Mail, MessageCircle, Linkedin, Github, Send } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/data/contact";

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  Email: Mail,
  Discord: MessageCircle,
  LinkedIn: Linkedin,
  GitHub: Github,
};

export function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  return (
    <section aria-label="Contact us" className="relative py-24 sm:py-28 lg:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.10),transparent_70%)]" />

      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div className="flex flex-col gap-6">
            <Reveal>
              <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink-50 sm:text-[2.5rem]">
                Reach out<span className="text-accent-400">.</span>
              </h2>
              <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-ink-400">
                However you prefer to connect, we&apos;re here. Pick the channel
                that feels right and start the conversation.
              </p>
            </Reveal>

            <div className="mt-2 flex flex-col gap-3">
              {CONTACT.channels.map((channel, i) => {
                const Icon = CHANNEL_ICONS[channel.label]!;
                return (
                  <Reveal key={channel.label} delay={i * 60}>
                    <a
                      href={channel.href}
                      target={channel.href.startsWith("http") ? "_blank" : undefined}
                      rel={channel.href.startsWith("http") ? "noreferrer noopener" : undefined}
                      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium hover:-translate-y-0.5 hover:border-accent-400/40 hover:shadow-glow-sm hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] sm:p-6"
                    >
                      <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-white/[0.03] text-accent-400 transition-all duration-500 ease-premium group-hover:-translate-y-0.5 group-hover:scale-[1.05] group-hover:border-accent-400/40 group-hover:bg-accent/[0.08] group-hover:shadow-glow-sm sm:h-14 sm:w-14">
                        <div className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(40,40,255,0.15),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        <Icon size={18} strokeWidth={1.75} className="relative sm:size-[20]" />
                      </div>

                      <div className="relative min-w-0">
                        <p className="text-[0.95rem] font-semibold text-ink-50 transition-colors duration-300 group-hover:text-accent-400">
                          {channel.label}
                        </p>
                        <p className="mt-0.5 truncate text-[0.85rem] text-ink-400">
                          {channel.description}
                        </p>
                        <p className="mt-0.5 truncate text-[0.82rem] font-medium text-ink-600 transition-colors duration-300 group-hover:text-accent-400/70">
                          {channel.detail}
                        </p>
                      </div>
                    </a>
                  </Reveal>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <Reveal delay={80}>
              <div className="group relative overflow-hidden rounded-[2rem] border border-border-strong bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-card backdrop-blur-xl transition-all duration-500 ease-premium sm:p-8 lg:p-10">
                <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,255,0.06),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative">
                  <h3 className="text-[1.3rem] font-semibold text-ink-50">
                    Send us a message
                  </h3>
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-400">
                    Fill out the form below and we&apos;ll get back to you as soon
                    as possible.
                  </p>

                  <form
                    className="mt-8 flex flex-col gap-5"
                    onSubmit={(e) => e.preventDefault()}
                  >
                    <div>
                      <label htmlFor="contact-name" className="sr-only">
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="sr-only">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-subject" className="sr-only">
                        Subject
                      </label>
                      <input
                        id="contact-subject"
                        type="text"
                        placeholder="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="sr-only">
                        Message
                      </label>
                      <textarea
                        id="contact-message"
                        rows={5}
                        placeholder="Message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full resize-none rounded-xl border border-border-strong bg-white/[0.03] px-4 py-3.5 text-[0.95rem] text-ink-50 placeholder:text-ink-600 transition-all duration-300 focus:border-accent-400/50 focus:bg-accent/[0.04] focus:outline-none focus:ring-1 focus:ring-accent-400/30"
                      />
                    </div>

                    <Button type="submit">
                      Send Message
                      <Send size={15} />
                    </Button>
                  </form>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
