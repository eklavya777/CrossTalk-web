import { Link } from "react-router-dom";
import { privacyPolicySections, termsSections } from "./legalContent.js";
import "./legal.css";

const pages = {
  privacy: {
    title: "Privacy Policy",
    effectiveDate: "May 22, 2026",
    sections: privacyPolicySections
  },
  terms: {
    title: "Terms and Conditions",
    effectiveDate: "May 22, 2026",
    sections: termsSections
  }
};

function LegalPage({ type }) {
  const page = pages[type];

  return (
    <main className="legal-page">
      <article className="legal-document">
        <Link className="legal-back" to="/signup">
          Back to signup
        </Link>

        <header className="legal-header">
          <p className="legal-brand">CrossTalk</p>
          <h1>{page.title}</h1>
          <p>Effective date: {page.effectiveDate}</p>
        </header>

        <div className="legal-body">
          {page.sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>

              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}

export default LegalPage;
