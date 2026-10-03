import { useEffect, useRef } from "react";
import { mountRaccoonWalk } from "../lib/lectpy-raccoon/raccoon_walk.js";

export default function WalkingRaccoon({ animate = false }) {
  const host = useRef(null);
  const controller = useRef(null);

  useEffect(() => {
    const animation = mountRaccoonWalk(host.current, {
      controls: false,
      autoplay: false,
      loop: true,
      actorWidthEm: 2.4,
      walkCadence: 1.5,
      baseline: 6,
      sceneHeight: 68,
      initialTime: .25,
      profile: "startle-sniff",
    });
    controller.current = animation;
    return () => { controller.current = null; animation.dispose(); };
  }, []);

  useEffect(() => {
    if (animate) controller.current?.play();
    else controller.current?.pause();
  }, [animate]);

  return <div className="system-walking-raccoon" ref={host} />;
}
