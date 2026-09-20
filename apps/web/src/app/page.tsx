import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'Trinetra Pulse — Criminal Network Intelligence & Investigation Platform',
  description:
    'Connect the dots. Preserve the evidence. Investigate with intelligence. Trinetra Pulse connects fragmented investigation data, network intelligence, evidence integrity, provenance, multimedia intelligence and grounded AI into one investigator-controlled workspace.',
};

export default function HomePage() {
  return <LandingPage />;
}
