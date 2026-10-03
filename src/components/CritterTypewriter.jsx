import { useEffect, useMemo, useState } from "react";

function typingPlan(text) {
  let elapsed = 0;
  return Array.from(text, (letter, index) => {
    elapsed += /\s/u.test(letter) ? 24 : /[,.!?]/u.test(letter) ? 180 : 34 + (index * 7 % 5) * 5;
    return elapsed;
  });
}

export function quoteTypingDuration(text) {
  return typingPlan(text).at(-1) || 0;
}

export default function CritterTypewriter({ text, delay = 700 }) {
  const letters = useMemo(() => Array.from(text), [text]);
  const words = useMemo(() => {
    let start = 0;
    return (text.match(/\S+|\s+/gu) || []).map((word) => {
      const token = { text: word, letters: Array.from(word), start, space: /^\s+$/u.test(word) };
      start += token.letters.length;
      return token;
    });
  }, [text]);
  const [count, setCount] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? letters.length : 0);
  const [state, setState] = useState("waiting");

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const plan = typingPlan(text);
    let active = true;
    let complete = false;
    let frame;
    let count = 0;

    function finish() {
      complete = true;
      cancelAnimationFrame(frame);
      if (active) {
        setCount(plan.length);
        setState("complete");
      }
    }

    function preferenceChanged() {
      if (motion.matches) finish();
    }

    function visibilityChanged() {
      if (document.hidden) finish();
    }

    async function start() {
      try {
        if (motion.matches || document.hidden) return finish();
        await document.fonts.ready;
        if (!active || complete) return;
        if (motion.matches || document.hidden) return finish();
        const began = performance.now();
        function type(now) {
          if (!active || complete) return;
          const elapsed = now - began - delay;
          let next = count;
          while (next < plan.length && plan[next] <= elapsed) next++;
          if (next !== count) {
            count = next;
            setCount(next);
            setState("typing");
          }
          if (count === plan.length) finish();
          else frame = requestAnimationFrame(type);
        }
        frame = requestAnimationFrame(type);
      } catch {
        finish();
      }
    }

    setCount(0);
    setState("waiting");
    motion.addEventListener("change", preferenceChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    start();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [text, delay]);

  return (
    <span className="critter-typewriter" data-typewriter-state={state}>
      <span className="critter-typewriter__accessible">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => word.space ? word.text : (
          <span className="critter-typewriter__word" key={index}>
            <span className="critter-typewriter__reserve">{word.text}</span>
            <span className="critter-typewriter__ink">{word.letters.slice(0, Math.max(0, count - word.start)).join("")}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
