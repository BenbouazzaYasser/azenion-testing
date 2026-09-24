# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Azenion's primary users are ambitious students and early-career builders who want to learn, find collaborators, join communities, and turn ideas into real work. Secondary participants include branch organizers, team and project owners, instructors, and platform administrators who help the network operate.

## Product Purpose

Azenion is a free global network where students and early builders move from learning and discovery into meaningful action. It connects Academy content, people, local branches, teams, projects, conversations, and public showcases so members can find where they belong and build alongside others.

Success means a new member can understand the network, discover relevant opportunities, contribute at their own pace, form or join a team or project, learn from others, and share progress without needing to move between disconnected products.

## Positioning

Azenion's distinct mechanism is a connected action ecosystem: educational content, community discovery, local belonging, collaborative work, and public recognition operate as one network. A member can learn a skill in the Academy, meet peers through the feed or chat, join a branch or team, recruit for a project, and showcase the result without leaving the platform.

## Operating Context

Members browse or search the network, follow a global or local feed, participate in direct and community conversations, join a branch, create or join teams and projects, recruit collaborators, learn through courses, roadmaps, live sessions, and labs, and publish or save work for others to discover. Branch supervisors and core team members help organize communities and govern platform spaces. Administrators verify instructors and manage roles.

The product spans a Next.js web experience and native iOS and Android clients built with Expo. Both clients use the same Supabase-backed account and community data.

## Capabilities and Constraints

- Membership is currently free. Joining, browsing, community participation, and Academy access are presented as available to network members.
- Account creation currently uses email and password. Google and GitHub sign-in are presented as future capabilities, not available authentication methods.
- Core product areas include the feed, direct chat and community servers, profiles, branches, teams, projects, recruitment, showcases, notifications, onboarding, and the Academy.
- The Academy includes courses, roadmaps, live sessions, and hands-on labs.
- Projects and teams can be public or private and support ownership, membership, roles, visibility, and lifecycle management.
- Branches organize members around institutions, regions, or focus areas and act as local hubs.
- The web product supports English, French, and Arabic, including right-to-left behavior for Arabic.
- The native client stores sessions only in SecureStore, keeps server secrets out of the mobile codebase, and must never expose service-role credentials.
- The service is not directed to children under 13.
- The current Terms of Service and Privacy Policy are explicitly placeholders and must not be represented as final or legally reviewed.
- Public launch status, monetization, and long-term commercial model are undecided.
- No verified customer list, testimonials, case studies, adoption benchmarks, or press claims are currently confirmed.

## Brand Commitments

- The product name is **Azenion**.
- **The Limitless Network** is an established product descriptor.
- **Infinite minds. Limitless impact.** is an established brand line.
- The infinity mark in `public/logo.svg` is a core identity asset and should remain recognizable across the product.
- The voice is ambitious, welcoming, action-oriented, and grounded in real participation rather than inflated claims.
- Established contact and social destinations include `Azenion@outlook.com`, `https://x.com/azenion`, `https://www.linkedin.com/company/azenion`, `https://instagram.com/Azenion8`, `https://github.com/azenion`, and `https://discord.gg/3As5ndwwh`.

## Evidence on Hand

- The implemented product, routes, workflows, and current product copy are in `app`, `components`, `data`, and `lib`.
- Product and content models are backed by Supabase schemas, validation, and server actions under `lib` and `actions`.
- The native client and its current operating constraints are documented in `mobile/README.md`.
- Brand and supporting assets exist in `public`, including `logo.svg`, `noise.svg`, and the sticker collection.
- No verified testimonial, customer logo, case study, usage benchmark, or press asset is available. Future work must not fabricate these.

## Product Principles

1. **Move members from discovery to action.** Every major surface should help someone identify a next step, not merely browse.
2. **Keep learning and building connected.** Educational content exists to support real participation, teams, and projects.
3. **Pair global reach with local belonging.** The network should feel broad enough to discover opportunity and close enough to form durable relationships.
4. **Make contribution possible at different levels.** Members can learn, join, create, recruit, mentor, and organize without requiring the same commitment from everyone.
5. **Earn trust with evidence.** Use real activity and verified proof; do not manufacture customers, outcomes, or momentum.

## Accessibility & Inclusion

Azenion is open to people aged 13 and older who want to learn, collaborate, and build. Product work must preserve keyboard access, visible focus, screen-reader labels, reduced-motion behavior, safe text zoom, and right-to-left support on the web. Native clients must retain native accessibility semantics and readable dynamic type. A formal compliance target has not yet been confirmed.
