import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=[]";
const settled = (text) => Array.from(text, (character) => ({ character, resolved: true }));
const scramble = (text, step = 0, elapsed = 0) => Array.from(text, (character, index) => ({
  character: elapsed >= 260 + index * 75 ? character : GLYPHS[(step * 7 + index * 11) % GLYPHS.length],
  resolved: elapsed >= 260 + index * 75,
}));

function Letters({ text, letters }) {
  return <span className="system-typeset-word" data-typeset={text.toLowerCase()} aria-hidden="true">{letters.map((letter, index) => <span className="system-typeset-letter" data-resolved={letter.resolved} key={index}>{letter.character}</span>)}</span>;
}

export default function TypesetWord({ text, onComplete }) {
  const completion = useRef(onComplete);
  completion.current = onComplete;
  const [letters, setLetters] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? settled(text)
    : scramble(text));

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    let finished = false;
    let previousStep = -1;
    const start = performance.now();
    const finish = () => {
      cancelAnimationFrame(frame);
      if (finished) return;
      finished = true;
      setLetters(settled(text));
      completion.current?.();
    };
    const onPreferenceChange = () => { if (query.matches) finish(); };
    const tick = (now) => {
      const elapsed = now - start;
      const step = Math.floor(elapsed / 42);
      if (elapsed >= 260 + (text.length - 1) * 75) {
        finish();
        return;
      }
      if (step !== previousStep) {
        setLetters(scramble(text, step, elapsed));
        previousStep = step;
      }
      frame = requestAnimationFrame(tick);
    };

    if (query.matches) finish();
    else frame = requestAnimationFrame(tick);
    query.addEventListener("change", onPreferenceChange);
    return () => { cancelAnimationFrame(frame); query.removeEventListener("change", onPreferenceChange); };
  }, [text]);

  return <Letters text={text} letters={letters} />;
}

export function RecurringTypesetWord({ text, enabled, firstDelay = 2000, interval = 5000 }) {
  const [letters, setLetters] = useState(() => settled(text));
  const lastLetter = useRef(-1);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const candidates = Array.from(text).flatMap((character, index) => /[a-z]/i.test(character) ? [index] : []);
    let timer, frame;

    const stop = () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      setLetters(settled(text));
    };
    const pulse = () => {
      const available = candidates.filter((index) => index !== lastLetter.current);
      const pool = available.length ? available : candidates;
      const selected = pool[Math.floor(Math.random() * pool.length)];
      lastLetter.current = selected;
      const start = performance.now();
      let previousStep = -1;
      const tick = (now) => {
        const elapsed = now - start;
        if (elapsed >= 620) { setLetters(settled(text)); return; }
        const step = Math.floor(elapsed / 42);
        if (step !== previousStep) {
          setLetters(Array.from(text, (character, index) => ({
            character: index === selected ? GLYPHS[(step * 7 + selected * 11) % GLYPHS.length] : character,
            resolved: index !== selected,
          })));
          previousStep = step;
        }
        frame = requestAnimationFrame(tick);
      };
      tick(start);
      timer = setTimeout(pulse, interval);
    };
    const schedule = () => {
      stop();
      if (enabled && !query.matches && candidates.length) timer = setTimeout(pulse, firstDelay);
    };
    schedule();
    query.addEventListener("change", schedule);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      query.removeEventListener("change", schedule);
    };
  }, [text, enabled, firstDelay, interval]);

  return <Letters text={text} letters={letters} />;
}
