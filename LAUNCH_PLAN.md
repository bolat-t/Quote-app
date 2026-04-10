# Ulbo — App Quality Assessment & Launch Plan
*Generated: 2026-03-08*

---

## 1. APP QUALITY ASSESSMENT

### Overall Rating: 8.2 / 10 — Near Production-Ready

| Area | Score | Notes |
|------|-------|-------|
| Design System | 10/10 | Flawless — YELLOW/BLACK/WHITE, consistent everywhere |
| Feature Completeness | 9/10 | All 7 screens functional; walking tracker is simulated |
| Architecture | 9/10 | Clean nav, proper context, good separation of concerns |
| Code Quality | 8/10 | Well-typed TS, some large files but no critical smells |
| Backend/AI | 9/10 | Supabase + Gemini, rate-limited, auth-secured |
| Monetization | 8/10 | RevenueCat paywall exists, pricing TBD |
| Error Handling | 6/10 | No error boundaries; silent failures could confuse users |
| Testing | 4/10 | No visible test suite — high-risk before launch |
| Onboarding | 7/10 | Exists but thin; needs stronger first-run flow |
| Performance | 8/10 | Reanimated used correctly; no obvious leaks |

### Strengths (Competitive Advantages)
- **Unique angle**: gamified journaling + AI + potato mascot — nothing quite like this in stores
- **Drawing canvas**: most journaling apps are text-only; canvas is a strong differentiator
- **XP/level system**: 5 tiers, paper unlocks — real progression feel
- **AI analysis**: Gemini on every journal entry + weekly summary
- **Design**: flat, bold, memorable — stands out in App Store screenshots

### Blockers Before Launch
1. **No real step counter** — WalkingScreen uses random simulation; must use `expo-sensors` Pedometer
2. **No error boundaries** — a single crash from bad network = user sees red screen
3. **No tests** — risky to ship without at least smoke tests on core flows
4. **AI rate limit UX** — user hits 20/day cap with no visible warning
5. **Paywall pricing not confirmed** — Annual vs. Weekly prices need to be set in RevenueCat dashboard

### Not Blockers (Post-Launch Polish)
- Vision board component size (refactor candidate, not broken)
- Paper selector locked-state UX
- Weekly summary needs 3+ entries (edge case, fine)
- Community feed empty state

---

## 2. COMPETITIVE POSITIONING

| App | Journaling | AI | Pet/Mascot | Drawing | Gamification |
|-----|-----------|-----|-----------|---------|--------------|
| **Ulbo** | ✅ | ✅ | ✅ Potato | ✅ | ✅ XP/Levels |
| Daylio | Mood only | ❌ | ❌ | ❌ | Streaks only |
| Journey | ✅ | Limited | ❌ | ❌ | ❌ |
| Finch | ✅ | ❌ | ✅ Bird | ❌ | ✅ |
| Reflectly | ✅ | Basic | ❌ | ❌ | Limited |

**Position:** "Finch meets Journey, with a bolder design and smarter AI."
**Target user:** 16–30, journaling-curious but finds plain diaries boring, responds to gamification.

---

## 3. MONETIZATION STRATEGY

### Freemium Model (current paywall supports this)

**Free tier:**
- Canvas (basic papers, no premium textures)
- Positivity Hunt (5 entries/day)
- Hub + quests
- Journal history (last 7 days)
- Basic analytics

**Ulbo Premium (paid):**
- All paper textures (levels 2–5 unlocked instantly)
- Full journal history (unlimited)
- AI journal analysis (Gemini reply + tags)
- Weekly AI insight report
- Vision board
- Community sharing
- Walking tracker
- Export data

### Pricing (Recommended)
| Plan | Price | Annual equivalent |
|------|-------|------------------|
| Weekly | $2.99/week | ~$155/yr |
| Annual | $29.99/year | $2.50/mo |
| Lifetime (launch promo) | $49.99 one-time | — |

**Revenue target (Year 1):**
- 500 free users → 50 converts (10% CVR) × $29.99 = $1,500 ARR (month 3)
- 2,000 free users → 200 converts × $29.99 = $6,000 ARR (month 6)
- 5,000 free users → 500 converts × $29.99 = $15,000 ARR (month 12)

---

## 4. LAUNCH CHECKLIST (before any public release)

### Technical
- [ ] Replace step simulation with `expo-sensors` Pedometer API
- [ ] Add global ErrorBoundary component wrapping App
- [ ] Show UI warning when AI rate limit is near (15/20 used)
- [ ] Write smoke tests for: journal save, XP award, canvas save, auth flow
- [ ] Configure RevenueCat product IDs (weekly, annual, lifetime)
- [ ] Set up Supabase row-level security policies (verify they exist)
- [ ] Configure push notification certificates (APNs for iOS, FCM for Android)
- [ ] Test deep links and cold start behavior
- [ ] Verify image uploads don't exceed Supabase storage limits

### Store Listing (App Store + Play Store)
- [ ] App icon (1024×1024) — Ulbo mascot on yellow
- [ ] Screenshots (6.7" iPhone, 12.9" iPad)
- [ ] App Store description (keywords: journal, mood tracker, gratitude, daily reflection)
- [ ] Privacy policy URL
- [ ] Support email / website
- [ ] Age rating (likely 4+)
- [ ] Choose primary category: Health & Fitness or Lifestyle

### Business
- [ ] Set up Stripe/RevenueCat for payouts
- [ ] Create TikTok/Instagram account for app
- [ ] Build simple landing page (ulboapp.com or similar)
- [ ] Set up email capture for waitlist

---

## 5. WEEKLY IMPLEMENTATION ROADMAP

### WEEK 1 (Mar 8–14) — Fix Blockers
**Goal: Make app shippable**

| Day | Task | Effort |
|-----|------|--------|
| Mon | Add ErrorBoundary component to App.tsx | 2h |
| Mon | Show user-facing error screen on crash | 1h |
| Tue | Replace WalkingScreen step simulation with expo-sensors Pedometer | 3h |
| Tue | Handle pedometer permission denied gracefully | 1h |
| Wed | Add AI rate limit warning UI (show "X/20 analyses used today") | 2h |
| Wed | Write smoke test: journal entry save → XP awarded | 2h |
| Thu | Write smoke test: canvas save flow (draw → done → saved) | 2h |
| Thu | Write smoke test: auth flow (signup → login → logout) | 2h |
| Fri | Verify Supabase RLS policies (test that users can't read others' data) | 2h |
| Fri | Configure RevenueCat products (set real pricing) | 2h |

**Deliverable:** App that won't red-screen on errors, has real step counting, and is monetization-ready.

---

### WEEK 2 (Mar 15–21) — Onboarding & Store Prep
**Goal: First impression is polished; store listing ready**

| Day | Task | Effort |
|-----|------|--------|
| Mon | Redesign onboarding flow (3 slides: What is Ulbo, daily ritual, grow together) | 4h |
| Tue | Add paywall trigger: show paywall after first canvas save (soft gate) | 2h |
| Tue | Add paywall trigger: show paywall when accessing locked paper texture | 1h |
| Wed | Create App Store screenshots (use simulator, capture each screen) | 3h |
| Wed | Write App Store description copy (primary + keywords) | 2h |
| Thu | Create app icon variations (icon, notification icon) | 3h |
| Thu | Build simple landing page (one-pager: what it is, screenshots, download button) | 3h |
| Fri | Set up privacy policy (use a generator, host on landing page) | 1h |
| Fri | Submit to TestFlight (internal review) | 1h |

**Deliverable:** App submitted to TestFlight. Store listing assets ready.

---

### WEEK 3 (Mar 22–28) — Beta Testing
**Goal: 10–20 beta testers; gather real feedback**

| Day | Task | Effort |
|-----|------|--------|
| Mon | Share TestFlight link with 10 trusted testers (friends, family, Discord) | 1h |
| Mon | Set up feedback form (Typeform or simple Google Form) | 1h |
| Tue | Monitor crash reports (Expo EAS or Sentry) | ongoing |
| Tue | Fix top 3 bugs from beta feedback | 3h |
| Wed | Watch session recordings if using PostHog (check drop-off points) | 2h |
| Wed | Improve any confusing UX based on tester confusion points | 3h |
| Thu | Add empty states where missing (Community feed empty, Analytics no data) | 2h |
| Thu | Polish loading states (skeleton screens or shimmer) | 2h |
| Fri | Second beta build — share with 10 more testers | 1h |
| Fri | Write changelog/release notes | 1h |

**Deliverable:** Stable beta. Known issues fixed. Release notes written.

---

### WEEK 4 (Mar 29–Apr 4) — Soft Launch
**Goal: App live in stores; first organic users**

| Day | Task | Effort |
|-----|------|--------|
| Mon | Submit to App Store Review (iOS) | 1h |
| Mon | Submit to Google Play (Android) | 1h |
| Tue | Create first TikTok video: "I built a journaling app with a potato mascot" | 2h |
| Tue | Post on Twitter/X, Reddit (r/journaling, r/productivity, r/indiedev) | 1h |
| Wed | App Store approved (typical 1–3 days) — go live | — |
| Wed | Announce on all channels, share landing page | 1h |
| Thu | Monitor: daily actives, retention D1/D3/D7, paywall CVR | ongoing |
| Thu | Respond to all App Store reviews | ongoing |
| Fri | Weekly retrospective: what worked, what to fix next week | 1h |

**Deliverable:** App live in both stores. First real users onboarded.

---

### WEEKS 5–8 (Apr–May) — Growth & Iteration
**Goal: Reach 500 downloads, 25+ premium subs**

**Week 5:** ASO (App Store Optimization) — update keywords based on search data
**Week 6:** Add social sharing — "Share my canvas" generates sharable image card
**Week 7:** Push notification optimization — A/B test reminder copy
**Week 8:** Analytics review — identify #1 drop-off point and fix it

---

## 6. KEY METRICS TO TRACK

| Metric | Target (Month 1) | Target (Month 3) |
|--------|-----------------|-----------------|
| Total Downloads | 100 | 500 |
| D1 Retention | >40% | >50% |
| D7 Retention | >20% | >30% |
| Daily Active Users | 30 | 150 |
| Paywall Conversion | >5% | >8% |
| Avg Session Length | >3 min | >4 min |
| Crash-free rate | >99% | >99.5% |
| App Store Rating | — | >4.2★ |

---

## 7. MARKETING CHANNELS (Zero Budget)

1. **TikTok/Reels** — "App devlog" format, show the potato mascot, build in public
2. **Reddit** — r/journaling, r/Daylio, r/ADHD (journaling angle), r/indiegaming (gamification angle)
3. **ProductHunt** — Launch day post; schedule for Tuesday
4. **Twitter/X IndieHackers** — build in public, share weekly stats
5. **App Store editorial** — pitch to Apple "Apps We Love" (long shot but free)
6. **Discord communities** — journaling, productivity, mental health spaces

---

## 8. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| App Store rejection | Medium | High | Follow HIG guidelines; no misleading screenshots |
| Supabase costs spike | Low | Medium | Set budget alerts; add free tier limits |
| Gemini API costs | Medium | Medium | Rate limit already in place (20/day) |
| Low retention | Medium | High | Strong D1 hook needed; fix onboarding |
| RevenueCat setup issues | Low | High | Test purchases in sandbox before launch |
| Step counting permission denied | High | Low | Graceful fallback (manual input or hide screen) |
