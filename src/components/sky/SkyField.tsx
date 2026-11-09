import "./sky-field.css";

/** Fixed positions (percent) so the sky is the same on every visit and costs nothing to compute. */
const stars: ReadonlyArray<readonly [x: number, y: number, size: number, delay: number]> = [
  [6, 14, 2, 0],
  [17, 62, 1.5, 2.4],
  [28, 27, 1.5, 4.1],
  [39, 8, 2, 1.2],
  [47, 71, 1.5, 5.3],
  [58, 19, 2, 3.2],
  [66, 54, 1.5, 0.8],
  [74, 33, 2, 6.1],
  [83, 78, 1.5, 2.9],
  [91, 12, 2, 4.6],
  [95, 47, 1.5, 1.7],
  [12, 88, 1.5, 5.8],
];

/**
 * The sky behind every page: still stars and one slow orbit at night, drifting mist at dawn.
 * Pure CSS on a fixed layer, so it never competes with the text for attention or for the CPU.
 */
export function SkyField() {
  return (
    <div className="sky-field" aria-hidden="true">
      <span className="sky-field__dust" />
      <span className="sky-field__orbit" />
      {stars.map(([x, y, size, delay]) => (
        <span
          key={`${x}-${y}`}
          className="sky-field__star"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: size,
            height: size,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
      <span className="sky-field__mist sky-field__mist--low" />
      <span className="sky-field__mist sky-field__mist--high" />
    </div>
  );
}
