import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';

const CONTACT_CARDS = [
  {
    Icon: Phone,
    label: 'Phone',
    primary: '(555) 555-0123',
    secondary: 'Call or text anytime during office hours',
    href: 'tel:+15555550123',
    linkLabel: 'Call us',
  },
  {
    Icon: Mail,
    label: 'Email',
    primary: 'hello@hopeconnect.org',
    secondary: 'We respond within one business day',
    href: 'mailto:hello@hopeconnect.org',
    linkLabel: 'Send an email',
  },
  {
    Icon: MapPin,
    label: 'Office',
    primary: '123 Main Street, Suite 200',
    secondary: 'Springfield, ST 00000',
    href: '#',
    linkLabel: 'Get directions',
  },
];

const HOURS = [
  { day: 'Monday – Thursday', time: '9:00 AM – 6:00 PM' },
  { day: 'Friday',            time: '9:00 AM – 4:00 PM' },
  { day: 'Saturday',          time: '10:00 AM – 2:00 PM' },
  { day: 'Sunday',            time: 'Closed' },
];

export default function ContactPage() {
  return (
    <div className="landing">

      {/* ── Header ── */}
      <header className="landing-header">
        <Link to="/home" className="landing-brand">
          <img src="/logo.png" alt="Hope Connect" className="landing-logo" />
        </Link>
        <nav className="landing-header-nav">
          <Link to="/about" className="landing-nav-link">About us</Link>
          <Link to="/contact" className="landing-nav-link landing-nav-link--active">Contact us</Link>
          <Link to="/dashboard" className="landing-nav-link">Log in</Link>
          <a href="#" className="landing-btn-donate">Donate</a>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="contact-hero">
        <div className="contact-hero-inner">
          <span className="about-eyebrow">
            <MessageCircle size={13} aria-hidden /> Get in touch
          </span>
          <h1 className="landing-h1 about-hero-h1">Contact Us</h1>
          <p className="about-hero-lede">
            Have a question or need help getting started? Reach out — we&rsquo;re here
            for you. A real person will get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* ── Contact cards ── */}
      <section className="contact-cards-section">
        <div className="contact-cards-inner">
          {CONTACT_CARDS.map(({ Icon, label, primary, secondary, href, linkLabel }) => (
            <div key={label} className="contact-card">
              <span className="contact-card-icon">
                <Icon size={24} aria-hidden />
              </span>
              <div className="contact-card-label">{label}</div>
              <div className="contact-card-primary">{primary}</div>
              <div className="contact-card-secondary">{secondary}</div>
              <a href={href} className="about-cta-link">
                {linkLabel} &rarr;
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── Office hours ── */}
      <section className="contact-hours-section">
        <div className="contact-hours-inner">
          <div className="contact-hours-card">
            <div className="contact-hours-header">
              <Clock size={20} aria-hidden />
              <h2 className="contact-hours-title">Office Hours</h2>
            </div>
            <p className="contact-hours-note">
              Walk-ins welcome during all open hours. No appointment needed.
            </p>
            <table className="contact-hours-table">
              <tbody>
                {HOURS.map(({ day, time }) => (
                  <tr key={day} className="contact-hours-row">
                    <td className="contact-hours-day">{day}</td>
                    <td className={`contact-hours-time${time === 'Closed' ? ' contact-hours-time--closed' : ''}`}>
                      {time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="contact-hours-aside">
            <h3 className="contact-aside-heading">Need help right now?</h3>
            <p className="contact-aside-body">
              If you or someone you know is in crisis, please call or text{' '}
              <strong>988</strong> (Suicide &amp; Crisis Lifeline) or{' '}
              <strong>211</strong> for immediate local resource referrals.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <p className="landing-footer-tagline">
              Connecting community members with food, housing, healthcare, and
              the people who can help.
            </p>
          </div>
          <div className="landing-footer-col">
            <div className="landing-footer-heading">Contact</div>
            <a className="landing-footer-link" href="mailto:hello@hopeconnect.org">
              <Mail size={14} aria-hidden /> hello@hopeconnect.org
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
