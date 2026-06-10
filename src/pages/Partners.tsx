import { useState, type FormEvent } from 'react';
import { ChevronDown, ExternalLink, Mail, MessageSquare, Users } from 'lucide-react';
import { MarketingHeader } from '@/components/MarketingHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const stats = [
  { value: '1', label: 'Active Partner' },
  { value: '5', label: 'Villages Reached' },
  { value: '3', label: 'Districts Covered' },
  { value: 'Growing', label: 'Network' },
];

const krushivikasPhotos = ['/1.png', '/graph.png', '/interactive-map.png', '/alerts.png'];

const testimonialCards = [
  {
    quote:
      'Groundwater visibility is essential for long-term water resilience. Collaborations like JalYantra help communities better understand and manage local water resources.',
    name: 'Krushi Vikas Representative',
    role: 'Program Lead, Krushi Vikas',
  },
  {
    quote:
      'The partnership created a practical bridge between field knowledge and data-driven groundwater monitoring.',
    name: 'Field Coordinator',
    role: 'Community Partnerships, Krushi Vikas',
  },
  {
    quote:
      'Working together makes it easier to identify deployment sites and keep the data useful for people on the ground.',
    name: 'Community Partner',
    role: 'Local Engagement, Rural Maharashtra',
  },
];

export default function PartnersPage() {
  const [form, setForm] = useState({
    name: '',
    organization: '',
    email: '',
    interest: '',
    message: '',
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-[32px] w-full bg-background" aria-hidden="true" />
      <MarketingHeader centerLinks={[]} showDashboardButton />

      <main className="mx-auto w-full max-w-6xl space-y-14 px-4 py-10">
        <section className="rounded-[32px] border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 px-6 py-10 shadow-sm sm:px-10 sm:py-14">
          <div className="max-w-3xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-teal-700">Partners & Collaboration</p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Partners & Collaboration</h1>
            <h2 className="text-xl font-medium text-muted-foreground sm:text-2xl">
              Building groundwater resilience through partnerships with NGOs, communities, researchers, and institutions.
            </h2>
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              JalYantra works with NGOs, rural communities, academic institutions, CSR partners, and local organisations to strengthen groundwater monitoring and improve water resilience. Together, we are building practical, data-driven solutions for communities facing growing water stress.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-full bg-teal-600 px-6 py-5 text-sm font-semibold text-white hover:bg-teal-700">
                Partner With JalYantra
              </Button>
              <Button variant="outline" className="rounded-full border-teal-200 px-6 py-5 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                <Mail className="mr-2 h-4 w-4" />
                support@jalyantra.tech
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[26px] border border-border bg-card/80 p-5 shadow-sm">
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-sm uppercase tracking-[0.22em] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </section>

        <Collapsible defaultOpen className="rounded-[32px] border border-border bg-card/90 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-700">Featured Partner</p>
              <h2 className="text-2xl font-bold text-foreground">Krushi Vikas</h2>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="rounded-full border-teal-200 text-teal-700 hover:bg-teal-50">
                Toggle section
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="px-5 py-6 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[28px] border border-border bg-muted/20 p-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-bold text-foreground">Krushivikas Foundation</h3>
                    <a
                      href="https://www.krushivikas.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
                    >
                      https://www.krushivikas.org/
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                    <p className="font-medium text-foreground">About the Organisation</p>
                    <p>
                      Krushi Vikas is a leading rural development organisation established in 1991, working across multiple states to strengthen sustainable agriculture, water security, rural livelihoods, natural resource management, and community resilience. With decades of on-ground experience, the organisation has worked extensively with farming communities, tribal populations, women, and rural entrepreneurs through programs focused on watershed development, irrigation, soil and water conservation, farmer producer organisations (FPOs), sanitation, digital literacy, and livelihood enhancement.
                    </p>
                    <p>
                      Headquartered in the Vidarbha region of Maharashtra, Krushi Vikas has expanded its operations to cover rural pockets across Maharashtra, Madhya Pradesh, and Gujarat. Backed by a team of over 200 field professionals, the NGO has positively impacted over 500,000 rural households.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-border bg-muted/20 p-5">
                <div className="overflow-hidden rounded-[24px] border border-border bg-black">
                  <div className="aspect-video bg-black">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-950 via-slate-950 to-black p-6 text-center">
                      <div className="space-y-2">
                        <p className="text-sm text-white/70">Replace with the interview video asset when it is ready.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-[28px] border border-border bg-muted/20 p-5">
                <div className="grid grid-cols-2 gap-3">
                  {krushivikasPhotos.map((src) => (
                    <div
                      key={src}
                      className="aspect-[4/3] overflow-hidden rounded-[18px] border border-border bg-white"
                    >
                      <img
                        src="/placeholder.svg"
                        alt="Placeholder visual"
                        className="h-full w-full object-cover opacity-90"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-border bg-muted/20 p-5">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-foreground">Engagement with JalYantra</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Krushi Vikas and JalYantra share a common vision of empowering communities with better tools, knowledge, and systems to strengthen groundwater resilience and support informed water management at the local level.
                  </p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li>Helped identify communities and deployment locations</li>
                    <li>Facilitated field deployment in 3 districts and 5 villages</li>
                    <li>Supported local stakeholder engagement</li>
                    <li>Enabled farmer and village-level interactions</li>
                    <li>Assisted in understanding groundwater challenges</li>
                  </ul>
                </div>
              </section>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <section className="hidden rounded-[32px] border border-border bg-card/90 p-5 shadow-sm sm:p-6" aria-hidden="true">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-700">Testimonial cards</p>
            <h2 className="text-2xl font-bold text-foreground">Voices from collaboration</h2>
          </div>
          <Carousel className="w-full">
            <CarouselContent>
              {testimonialCards.map((card) => (
                <CarouselItem key={card.name} className="md:basis-1/2 lg:basis-1/3">
                  <div className="h-full rounded-[26px] border border-border bg-muted/20 p-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">“{card.quote}”</p>
                    <div className="mt-4">
                      <p className="font-semibold text-foreground">{card.name}</p>
                      <p className="text-xs text-muted-foreground">{card.role}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-border bg-card/90 p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-700">Collaborate with JalYantra</p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">Start a partnership conversation</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              We welcome collaborations with NGOs, research institutions, CSR programs, and organisations working in water security, climate resilience, agriculture, and rural development.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                className="h-12 rounded-2xl"
              />
              <Input
                value={form.organization}
                onChange={(e) => setForm((prev) => ({ ...prev, organization: e.target.value }))}
                placeholder="Organisation (optional)"
                className="h-12 rounded-2xl"
              />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="h-12 rounded-2xl"
              />
              <Select value={form.interest} onValueChange={(value) => setForm((prev) => ({ ...prev, interest: value }))}>
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue placeholder="I am interested in…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ngo-partnership">NGO / Field Partnership</SelectItem>
                  <SelectItem value="csr-sponsorship">CSR Sponsorship</SelectItem>
                  <SelectItem value="academic-research">Academic Research</SelectItem>
                  <SelectItem value="technology-collaboration">Technology Collaboration</SelectItem>
                  <SelectItem value="policy-governance">Policy / Water Governance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Tell us more about your interest"
                className="min-h-[140px] rounded-2xl"
              />
              <Button className="h-12 rounded-full bg-teal-600 px-7 text-sm font-semibold text-white hover:bg-teal-700">
                Contact Us
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              Or write to us directly: <a className="font-semibold text-teal-700 hover:underline" href="mailto:support@jalyantra.tech">support@jalyantra.tech</a>
            </p>
          </div>

          <aside className="rounded-[32px] border border-border bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-700">Why partner</p>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                Shared field learning with communities and local institutions
              </p>
              <p className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                Practical data-driven conversations around water stress and resilience
              </p>
              <p className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                Direct coordination for pilots, research, and CSR initiatives
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
