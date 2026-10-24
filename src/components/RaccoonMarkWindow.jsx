import { useEffect, useRef } from "react";
import { asset } from "../assets.js";
import { HOME_RACCOON } from "../content/homeArtwork.js";
import "./RaccoonMarkWindow.css";

export default function RaccoonMarkWindow({ animate }) {
  const hostRef = useRef(null);
  const imageRef = useRef(null);
  const controllerRef = useRef(null);
  const animateRef = useRef(animate);
  animateRef.current = animate;

  useEffect(() => {
    let disposed = false;
    const image = imageRef.current;
    // Show and decode the original before loading the optional effect runtime.
    image.decode().then(() => import("../lib/raccoonMarkWindow.js")).then(({ mountRaccoonMarkWindow }) => {
      if (disposed) return;
      controllerRef.current = mountRaccoonMarkWindow(hostRef.current, {
        image,
        artwork: HOME_RACCOON,
        animate: animateRef.current,
      });
    }).catch(() => {
      if (!disposed) hostRef.current.dataset.state = "original";
    });
    return () => { disposed = true; controllerRef.current?.dispose(); controllerRef.current = null; };
  }, []);

  useEffect(() => { controllerRef.current?.setAnimating(animate); }, [animate]);

  const { crop, width, height } = HOME_RACCOON;
  return (
    <div className="hero-raccoon" data-state="original" ref={hostRef} style={{ aspectRatio: `${crop.width} / ${crop.height}` }}>
      <img
        className="hero-raccoon__original"
        src={asset(HOME_RACCOON.smallSrc)}
        srcSet={`${asset(HOME_RACCOON.smallSrc)} 800w, ${asset(HOME_RACCOON.src)} 1600w`}
        sizes="(max-width: 620px) calc(113vw - 36px), (min-width: 1440px) 700px, 54vw"
        alt={HOME_RACCOON.alt}
        width={width}
        height={height}
        ref={imageRef}
        decoding="async"
        style={{ width: `${width / crop.width * 100}%`, height: `${height / crop.height * 100}%`, left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%`, filter: HOME_RACCOON.filter }}
      />
      <canvas className="hero-raccoon__marks hero-raccoon__marks--ascii" aria-hidden="true" />
      <canvas className="hero-raccoon__marks hero-raccoon__marks--hatch" aria-hidden="true" />
    </div>
  );
}
