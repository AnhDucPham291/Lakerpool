import TripPlanner from "@/components/TripPlanner";
import SiteQrCode from "@/components/SiteQrCode";
import RideMarketplace from "@/components/RideMarketplace";
import { ArrowUpRight, ShieldCheck, Route, Wallet, Users, MapPin, Clock3, Sparkles } from "lucide-react";

const features = [
  { icon: Route, title: "Smarter ride matching", text: "Find drivers heading in your direction with matching departure times." },
  { icon: ShieldCheck, title: "Student-first trust", text: "Student profile verification and clear driver and vehicle information." },
  { icon: Wallet, title: "Know the cost upfront", text: "Compare estimated per-passenger prices before requesting a seat." }
];

export default function Home() {
  return <main className="site-shell">
    <nav className="nav">
      <a className="brand" href="#"><span className="brand-mark">LP</span><span>LAKER<span className="brand-light">POOL</span></span></a>
      <div className="nav-links"><a href="#how">HOW IT WORKS</a><a href="#features">WHY LAKERPOOL</a><a href="#rides">FIND A RIDE</a></div>
      <div className="nav-actions"><SiteQrCode /><a className="nav-cta" href="#rides">Explore rides <ArrowUpRight size={16}/></a></div>
    </nav>

    <section className="hero">
      <div className="hero-grid"></div>
      <div className="orb orb-one"></div><div className="orb orb-two"></div>
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse"></span> GVSU STUDENT RIDE SHARING</div>
        <h1>Go further.<br/><em>Share the ride.</em></h1>
        <p className="hero-text">A simpler way for students to find affordable rides, meet trusted travel companions, and get where they need to go.</p>
        <div className="hero-actions"><a className="button button-primary" href="#rides">Find your ride <ArrowUpRight size={17}/></a><a className="text-link" href="#how">See how it works <span>↗</span></a></div>
        <div className="hero-stats"><div><strong>01</strong><span>Search a route</span></div><div><strong>02</strong><span>Compare your options</span></div><div><strong>03</strong><span>Share the journey</span></div></div>
      </div>
      <div className="hero-art" aria-label="Abstract route visualization">
        <div className="art-ring ring-a"></div><div className="art-ring ring-b"></div>
        <div className="route-card">
          <div className="route-top"><span className="live-dot"></span> ROUTE MATCH PREVIEW <span className="match">98% MATCH</span></div>
          <div className="route-points"><div className="point-column"><span className="point start"></span><span className="route-line"></span><span className="point end"></span></div><div className="point-labels"><div><small>FROM</small><b>Allendale, MI</b></div><div><small>TO</small><b>Grand Rapids, MI</b></div></div></div>
          <div className="route-bottom"><span><Clock3 size={14}/> 35 min</span><span><Users size={14}/> 2 seats open</span><strong>$8.50 <small>/ person</small></strong></div>
        </div>
        <div className="floating-tag tag-top"><Sparkles size={14}/> AI-assisted matching</div>
        <div className="floating-tag tag-bottom"><ShieldCheck size={15}/> Student-first community</div>
        <div className="big-pin"><MapPin size={38}/></div>
      </div>
      <div className="hero-foot"><span>DESIGNED FOR THE JOURNEY</span><span>LAKERPOOL / 2026</span></div>
    </section>

    <section className="feature-section" id="features">
      <div className="section-heading"><div><div className="eyebrow dark">A BETTER WAY TO GET THERE</div><h2>Travel made <em>easier.</em></h2></div><p>Less uncertainty. More options. A community that moves in the same direction.</p></div>
      <div className="feature-grid">{features.map(({icon: Icon,title,text},i)=><article className="feature-card" key={title}><span className="feature-number">0{i+1}</span><div className="feature-icon"><Icon size={22}/></div><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <section className="how-section" id="how"><div className="eyebrow">THREE SIMPLE STEPS</div><h2>Your next trip starts <em>here.</em></h2><div className="steps"><div><b>01</b><h3>Search</h3><p>Enter where you're going and when you want to leave.</p></div><div><b>02</b><h3>Compare</h3><p>Review routes, pickup points, driver details, and estimated prices.</p></div><div><b>03</b><h3>Connect</h3><p>Request a seat, wait for the driver to accept, and follow your trip.</p></div></div></section>
    <section className="rides-section" id="rides"><div className="rides-intro"><div className="eyebrow dark">OPEN MAP DATA · OPENROUTESERVICE</div><h2>Plan your route.<br/><em>Find your people.</em></h2><p>Enter your pickup and destination to see driving distance, estimated travel time, and route alternatives. This is the mapping foundation for LakerPool ride matching.</p></div><TripPlanner /><RideMarketplace /></section>
    <footer><a className="brand" href="#"><span className="brand-mark">LP</span><span>LAKER<span className="brand-light">POOL</span></span></a><span>Shared journeys. Stronger community.</span><span>© 2026 LakerPool</span></footer>
  </main>;
}
