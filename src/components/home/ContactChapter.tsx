import { Link } from "react-router-dom";
import { contactPage, links, site } from "@/data";
import { ChapterPlate } from "./ChapterPlate";

/** The end of the path: a lit dock, the email address and the networks that already exist. */
export function ContactChapter() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="dock">
      <ChapterPlate name="contact" className="dock__plate" />
      <div className="article-shell dock__inner">
        <p className="chapter-eyebrow">Contact</p>
        <h2 id="contact-title" className="chapter-title dock__title">
          Building systems that earn trust — and products worth spending time with.
        </h2>
        <p className="chapter-lede">{contactPage.intro}</p>

        <a href={`mailto:${site.email}`} className="dock__email">
          {site.email}
        </a>

        <ul className="dock__links">
          {contactPage.socialRows.map((row) => (
            <li key={row.key}>
              <a
                href={links.social[row.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="chapter-link"
              >
                {row.label}
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
          <li>
            <Link to="/about" className="chapter-link">
              About me
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
