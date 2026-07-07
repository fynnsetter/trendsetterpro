# TRENDSETTER PRO - BUILD SUMMARY (Save Point)

## Project Goal
A luxury, AI-powered investment research platform. Users can track portfolios, get AI analysis (Monte Carlo + Claude), and upgrade to a Pro tier.

## Tech Stack
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Components: shadcn/ui (Radix, Custom preset)
- Backend: FastAPI (future)
- Database: Supabase (PostgreSQL) - (future)
- Payments: Stripe - (future)
- Design: Dark navy (#1a2332) + Gold (#d8bb6b) with "quiet luxury" aesthetic

## Current Status (Login Page Complete)
✅ Next.js project created and running on localhost:3000
✅ Luxury dark theme with ambient golden glow
✅ Playfair Display font for "TRENDSETTER" logo
✅ Custom shadcn/ui components installed (button, card, input, label)
✅ Interactive form fields with hover/focus effects
✅ Tagline: "Invest Smarter with AI"

## File Structure
trendsetter/
├── app/
│   ├── page.tsx          # Login page (complete)
│   ├── layout.tsx        # Root layout with fonts
│   └── globals.css       # Tailwind styles
├── components/
│   └── ui/               # shadcn components
├── lib/
│   └── utils.ts          # cn() helper
├── public/
│   └── images/           # (Future logo location)
└── package.json

## Login Page (app/page.tsx)
- Full-screen dark navy background with distributed ambient glow
- TREND (gold) SETTER (white) using Playfair Display
- Email and password inputs with scale and golden ring on hover/focus
- Gold "Access Private Dashboard" button with hover effects

## Font Setup (app/layout.tsx)
- Playfair Display loaded from Google Fonts for the logo
- Inter, Geist, and Geist_Mono for body text
- Metadata updated: title "TrendSetter", description "Invest Smarter with AI"

## Next Steps (To Build)
1. Set up Supabase (free tier) for authentication and database
2. Create a signup page (users need to register)
3. Build the protected dashboard (after login)
4. Connect login form to Supabase Auth
5. Add portfolio tracking (users add stocks, shares, purchase price)
6. Build the AI analysis (Monte Carlo + Claude API)
7. Implement Stripe payments for Pro tier

## Commands to Start the App
cd ~/trendsetter
npm run dev
Open http://localhost:3000

## Visual Design Choices
- Background: #1a2332 (deep navy)
- Accent: #d8bb6b (gold)
- Text: White with varying opacity for hierarchy
- Inputs: Semi-transparent background with white borders
- Glow: Distributed ambient golden glow across the entire page
- Fonts: Playfair Display (logo), Inter/Geist (body)
