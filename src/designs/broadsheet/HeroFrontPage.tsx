import { SERVICES, type ServiceId } from "@/components/hero/topology";
import { DesignPlate } from "../DesignPlate";
import "../design-art.css";

type Props = {
  theme: "dark" | "light";
  hovered: ServiceId | null;
  onHover: (id: ServiceId | null) => void;
  onSelect: (id: ServiceId) => void;
};

const dateline = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Broadsheet's hero: the island plate printed as a halftone front-page photograph, with a
 * dateline and a caption whose service names open the same inspector as the island does.
 */
export function HeroFrontPage({ theme, hovered, onHover, onSelect }: Props) {
  return (
    <figure className="bs-hero" data-testid="design-hero" data-design-hero="broadsheet">
      <p className="bs-hero__dateline">
        <span>{dateline.format(new Date())}</span>
        <span>Systems edition</span>
      </p>
      <div className="bs-hero__photo">
        <DesignPlate
          src={`/hero/plate-${theme}.webp`}
          design="broadsheet"
          theme={theme}
          className="bs-hero__plate"
        />
      </div>
      <figcaption className="bs-hero__caption">
        <strong>Fig. 1</strong> The system drawn as an island.{" "}
        <span className="bs-hero__parts">
          Inspect a part:{" "}
          {SERVICES.map((service, index) => (
            <span key={service.id}>
              <button
                type="button"
                className="bs-hero__part"
                data-active={hovered === service.id ? "true" : undefined}
                onPointerEnter={() => onHover(service.id)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(service.id)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(service.id)}
              >
                {service.name}
              </button>
              {index < SERVICES.length - 1 ? ", " : "."}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
