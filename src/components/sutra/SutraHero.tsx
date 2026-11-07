import "./sutra-hero.css";
import { HomeOrbit } from "./HomeOrbit.tsx";

const dawn = `${import.meta.env.BASE_URL}projects/sutra-dawn.webp`;

/**
 * Sutra's own home hero, copied from the Sutra app (apps/web/src/pages/Home.tsx + HomeOrbit) and
 * shown in its public mode: the WebGPU light ring, with Sutra's static drawing as the fallback
 * without WebGPU or with reduced motion. Styles are scoped under .sutra-embed.
 */
export function SutraHero() {
  return (
    <div className="sutra-embed">
      <section className="home-hero" aria-label="Sutra, a thread of understanding">
        <img
          className="hero-scene"
          src={dawn}
          alt=""
          width="1536"
          height="1024"
          loading="lazy"
          decoding="async"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow">
            <span lang="sa">सूत्र</span> SUTRA · A THREAD OF UNDERSTANDING
          </p>
          <h2>
            Follow your
            <br />
            <em>thread.</em>
          </h2>
          <p className="hero-lede">
            Discover. Understand. Remember.
            <br />
            Turn what you know into what you do.
          </p>
        </div>
        <HomeOrbit />
      </section>
    </div>
  );
}
