import { Link } from 'react-router-dom';
import {
  Home,
  Heart,
  Activity,
  ArrowRight,
  MessageSquare,
  Users,
  ClipboardList,
  Phone,
  Mail,
  MapPin,
} from '../lib/icons.js';

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/home" className="landing-brand">
          <img src="/logo.png" alt="Hope Connect" className="landing-logo" />
        </Link>
        <nav className="landing-header-nav">
          <Link to="/about" className="landing-nav-link">About us</Link>
          <Link to="/contact" className="landing-nav-link">Contact us</Link>
          <Link to="/dashboard" className="landing-nav-link">Log in</Link>
          {/* TODO: replace with real donation URL */}
          <a href="#" className="landing-btn-donate">Donate</a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              <Heart size={14} aria-hidden /> Free, human-supported help
            </span>
            <h1 className="landing-h1">
              Connecting people with the help they need.
            </h1>
            <p className="landing-lede">
              We connect community members with food, housing, healthcare, and
              other local resources. A real case manager reads what you share
              and follows up with you directly &mdash; no paperwork, no cost.
            </p>
            <div className="landing-cta-row">
              <Link to="/" className="landing-btn-primary">
                Start intake
                <ArrowRight size={18} aria-hidden />
              </Link>
              <a href="#about" className="landing-btn-ghost">
                Learn more
              </a>
            </div>
            <p className="landing-hero-meta">
              Free &middot; about 5 minutes &middot; no insurance required
            </p>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-hero-blob" />
            <div className="landing-hero-card landing-hero-card--1">
              <span className="landing-hero-icon landing-hero-icon--green">
                <Home size={20} aria-hidden />
              </span>
              <div>
                <div className="landing-hero-card-title">Housing</div>
                <div className="landing-hero-card-sub">Shelter &amp; rent help</div>
              </div>
            </div>
            <div className="landing-hero-card landing-hero-card--2">
              <span className="landing-hero-icon landing-hero-icon--rose">
                <Heart size={20} aria-hidden />
              </span>
              <div>
                <div className="landing-hero-card-title">Food</div>
                <div className="landing-hero-card-sub">Pantries &amp; meals</div>
              </div>
            </div>
            <div className="landing-hero-card landing-hero-card--3">
              <span className="landing-hero-icon landing-hero-icon--blue">
                <Activity size={20} aria-hidden />
              </span>
              <div>
                <div className="landing-hero-card-title">Healthcare</div>
                <div className="landing-hero-card-sub">Clinics &amp; care</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="landing-about">
        <div className="landing-about-inner">
          <span className="landing-eyebrow landing-eyebrow--center">About us</span>
          <h2 className="landing-h2">A simpler way to ask for help.</h2>
          <p className="landing-about-lede">
            Asking for help is hard. We built Hope Connect so it doesn&rsquo;t
            have to be. Tell us what&rsquo;s going on in your own words &mdash;
            we&rsquo;ll match you with the right local programs and a real
            person who will follow up with you directly.
          </p>

          <div className="landing-about-grid">
            <div className="landing-feature-card">
              <span className="landing-feature-icon">
                <MessageSquare size={22} aria-hidden />
              </span>
              <h3 className="landing-feature-title">Share your story</h3>
              <p className="landing-feature-body">
                A short, plain-language intake. No jargon, no judgement &mdash;
                just a few questions about what you&rsquo;re facing.
              </p>
            </div>
            <div className="landing-feature-card">
              <span className="landing-feature-icon">
                <ClipboardList size={22} aria-hidden />
              </span>
              <h3 className="landing-feature-title">Get matched</h3>
              <p className="landing-feature-body">
                We line your needs up with local programs covering housing,
                food, healthcare, employment, and more.
              </p>
            </div>
            <div className="landing-feature-card">
              <span className="landing-feature-icon">
                <Users size={22} aria-hidden />
              </span>
              <h3 className="landing-feature-title">Talk to a human</h3>
              <p className="landing-feature-body">
                A case manager reaches out personally to walk you through next
                steps. You&rsquo;re not navigating this alone.
              </p>
            </div>
          </div>

          <div className="landing-about-cta">
            <Link to="/" className="landing-btn-primary">
              Start intake
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <footer id="contact" className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <p className="landing-footer-tagline">
              Connecting community members with food, housing, healthcare, and
              the people who can help.
            </p>
          </div>

          <div className="landing-footer-col">
            <div className="landing-footer-heading">Contact</div>
            <a className="landing-footer-link" href="mailto:hello@example.org">
              <Mail size={14} aria-hidden /> hello@example.org
            </a>
            <a className="landing-footer-link" href="tel:+15555550123">
              <Phone size={14} aria-hidden /> (555) 555&ndash;0123
            </a>
            <span className="landing-footer-link">
              <MapPin size={14} aria-hidden /> 123 Main St, Suite 200
            </span>
          </div>

          <div className="landing-footer-col">
            <div className="landing-footer-heading">Organization</div>
            <Link className="landing-footer-link" to="/about">About us</Link>
            <Link className="landing-footer-link" to="/dashboard">Staff log in</Link>
            {/* TODO: replace with real donation URL */}
            <a className="landing-footer-link" href="#">Donate</a>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Hope Connect</span>
          <span>
            <a className="landing-footer-link landing-footer-link--inline" href="#">Privacy</a>
            <span className="landing-footer-dot">&middot;</span>
            <a className="landing-footer-link landing-footer-link--inline" href="#">Terms</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
