import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Heart,
  Users,
  Shield,
  Target,
  Award,
  BookOpen,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

const STATS = [
  { value: '12,400+', label: 'People served annually' },
  { value: '140+',    label: 'Partner organizations' },
  { value: '8 yrs',  label: 'Serving the community' },
  { value: '62',     label: 'Dedicated case managers' },
];

const VALUES = [
  {
    Icon: Heart,
    title: 'Our Mission',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.',
  },
  {
    Icon: Target,
    title: 'Our Vision',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.',
  },
  {
    Icon: Shield,
    title: 'Our Values',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.',
  },
];

const TEAM = [
  {
    name: 'Jane Doe',
    title: 'Executive Director',
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua quis nostrud exercitation.',
  },
  {
    name: 'Carlos Reyes',
    title: 'Director of Operations',
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua quis nostrud exercitation.',
  },
  {
    name: 'Maria Johnson',
    title: 'Director of Community Outreach',
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua quis nostrud exercitation.',
  },
  {
    name: 'David Pham',
    title: 'Director of Programs',
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua quis nostrud exercitation.',
  },
];

const TRUST_BADGES = ['Charity Navigator', 'GuideStar Platinum', 'Great Nonprofits', 'Top Workplace'];

const CTA_CARDS = [
  {
    Icon: Users,
    heading: 'Volunteer with us',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Give your time and skills to help neighbors access the resources they need.',
    action: 'Learn about volunteering',
    href: '#',
  },
  {
    Icon: Heart,
    heading: 'Make a donation',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Your generosity makes everything we do possible and keeps our services free.',
    action: 'Donate today',
    href: '#',
  },
  {
    Icon: BookOpen,
    heading: 'Partner with us',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Join our network of organizations working together to serve the community.',
    action: 'Become a partner',
    href: '#',
  },
];

export default function AboutPage() {
  return (
    <div className="landing">

      {/* ── Header ── */}
      <header className="landing-header">
        <Link to="/home" className="landing-brand">
          <img src="/logo.png" alt="Hope Connect" className="landing-logo" />
        </Link>
        <nav className="landing-header-nav">
          <Link to="/about" className="landing-nav-link landing-nav-link--active">About us</Link>
          <a href="#contact" className="landing-nav-link">Contact us</a>
          <Link to="/dashboard" className="landing-nav-link">Log in</Link>
          <a href="#" className="landing-btn-donate">Donate</a>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="about-hero">
        <div className="about-hero-inner">
          <span className="about-eyebrow">Who We Are</span>
          <h1 className="landing-h1 about-hero-h1">The Hope Connect Story</h1>
          <p className="about-hero-lede">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. We believe every person in our
            community deserves access to the resources they need to thrive.
          </p>
        </div>
      </section>

      {/* ── Impact stats bar ── */}
      <div className="about-stats-bar">
        <div className="about-stats-inner">
          {STATS.map(({ value, label }) => (
            <div key={label} className="about-stat">
              <span className="about-stat-value">{value}</span>
              <span className="about-stat-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Origin story ── */}
      <section className="about-story">
        <div className="about-story-inner">
          <div className="about-story-img-wrap">
            <div className="about-img-placeholder about-img-placeholder--1" aria-hidden="true">
              <Users size={60} />
            </div>
          </div>
          <div className="about-story-text">
            <span className="landing-eyebrow">Our Beginning</span>
            <h2 className="about-h2">We started with a simple belief.</h2>
            <p className="about-story-body">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure.
            </p>
            <p className="about-story-body">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
              fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
              culpa qui officia deserunt mollit anim id est laborum consectetur adipiscing.
            </p>
          </div>
        </div>
      </section>

      {/* ── Values pillars ── */}
      <section className="about-values">
        <div className="about-values-inner">
          <span className="landing-eyebrow landing-eyebrow--center">What drives us</span>
          <h2 className="about-h2 about-h2--center">Guided by purpose, grounded in community.</h2>
          <div className="about-values-grid">
            {VALUES.map(({ Icon, title, body }) => (
              <div key={title} className="landing-feature-card">
                <span className="landing-feature-icon">
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className="landing-feature-title">{title}</h3>
                <p className="landing-feature-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pull quote ── */}
      <section className="about-pullquote">
        <div className="about-pullquote-inner">
          <blockquote className="about-quote-text">
            &ldquo;Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. No one should have to navigate
            a crisis alone.&rdquo;
          </blockquote>
          <cite className="about-quote-cite">&mdash; Founder, Hope Connect</cite>
        </div>
      </section>

      {/* ── Growth section (reversed layout) ── */}
      <section className="about-story about-story--alt">
        <div className="about-story-inner">
          <div className="about-story-text">
            <span className="landing-eyebrow">Where We Are Today</span>
            <h2 className="about-h2">Growing to meet the community where it is.</h2>
            <p className="about-story-body">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p className="about-story-body">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
              fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
              culpa qui officia deserunt mollit anim id est laborum consectetur adipiscing.
            </p>
          </div>
          <div className="about-story-img-wrap">
            <div className="about-img-placeholder about-img-placeholder--2" aria-hidden="true">
              <MapPin size={60} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Leadership team ── */}
      <section className="about-team">
        <div className="about-team-inner">
          <span className="landing-eyebrow landing-eyebrow--center">Our People</span>
          <h2 className="about-h2 about-h2--center">Meet our leadership.</h2>
          <p className="about-team-lede">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam,
            quis nostrud exercitation ullamco laboris nisi aliquip commodo consequat.
          </p>
          <div className="about-team-grid">
            {TEAM.map(({ name, title, bio }) => (
              <div key={name} className="about-team-card">
                <div className="about-team-avatar" aria-hidden="true">
                  <span className="about-team-initial">{name[0]}</span>
                </div>
                <div className="about-team-info">
                  <div className="about-team-name">{name}</div>
                  <div className="about-team-role">{title}</div>
                  <p className="about-team-bio">{bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust / Recognition ── */}
      <section className="about-trust">
        <div className="about-trust-inner">
          <div className="about-trust-badges">
            {TRUST_BADGES.map((badge) => (
              <div key={badge} className="about-trust-badge">
                <Award size={16} aria-hidden />
                <span>{badge}</span>
              </div>
            ))}
          </div>
          <div className="about-trust-text">
            <h3 className="about-trust-heading">Committed to transparency.</h3>
            <p className="about-trust-body">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip.{' '}
              <a href="#" className="about-trust-link">
                View our annual report &rarr;
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA cards ── */}
      <section className="about-cta-section">
        <div className="about-cta-inner">
          <span className="landing-eyebrow landing-eyebrow--center">Join Us</span>
          <h2 className="about-h2 about-h2--center">Does this sound like your kind of work?</h2>
          <div className="about-cta-grid">
            {CTA_CARDS.map(({ Icon, heading, body, action, href }) => (
              <div key={heading} className="about-cta-card">
                <span className="about-cta-icon">
                  <Icon size={24} aria-hidden />
                </span>
                <h3 className="about-cta-heading">{heading}</h3>
                <p className="about-cta-body">{body}</p>
                <a href={href} className="about-cta-link">
                  {action} <ArrowRight size={14} aria-hidden />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
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
