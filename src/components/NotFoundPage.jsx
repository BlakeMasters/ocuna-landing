import { pagePath } from "../assets.js";
import PaperShell from "./PaperShell.jsx";

export default function NotFoundPage() {
  return (
    <PaperShell
      kicker="Ocuna / missing path"
      titleLines={["This path", "is not a page"]}
      lede="The address you opened is not a published route on ocuna-ai.com. These links recover from here."
    >
      <div className="paper-page__actions">
        <a className="paper-page__button" href={pagePath("")}>
          Ocuna home
        </a>
        <a className="paper-page__button paper-page__button--ghost" href={pagePath("ocura")}>
          Ocura
        </a>
        <a className="paper-page__button paper-page__button--ghost" href={pagePath("docs")}>
          Docs
        </a>
        <a className="paper-page__button paper-page__button--ghost" href={pagePath("contact")}>
          Contact
        </a>
      </div>
    </PaperShell>
  );
}
