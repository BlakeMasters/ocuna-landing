import { useEffect, useRef, useState } from "react";
import { asset } from "../assets.js";
import { PREPARED_FILM } from "../content/preparedFilm.js";
import { CHAPTERS } from "../lib/engravedTimeline.js";
import { mountPreparedPlayback } from "../lib/preparedPlayback.js";
import "./PreparedEngraving.css";

export default function PreparedEngraving({ playing }) {
  const initialPlaying = useRef(playing);
  const host = useRef(null), opening = useRef(null), loop = useRef(null), poster = useRef(null), playback = useRef(null);
  const [description, setDescription] = useState(CHAPTERS[0].description);
  const [variant, setVariant] = useState(() => window.matchMedia("(max-width: 620px)").matches ? "mobile" : "desktop");
  useEffect(() => {
    const controller = mountPreparedPlayback({ host: host.current, opening: opening.current, loop: loop.current, poster: poster.current, assets: PREPARED_FILM, sourceUrl: asset, playing, onDescription: setDescription, onVariant: setVariant });
    playback.current = controller;
    return () => { controller.dispose(); playback.current = null; };
  }, []);
  useEffect(() => { playback.current?.setPlaying(playing); }, [playing]);
  return <figure className="prepared-engraving" role="img" aria-label={description} ref={host}>
    <img ref={poster} style={{ visibility: initialPlaying.current ? "hidden" : "visible" }} src={asset(PREPARED_FILM.variants[variant].poster)} alt="" aria-hidden="true" width={PREPARED_FILM.variants[variant].width} height={PREPARED_FILM.variants[variant].height} decoding="async" />
    <video ref={opening} muted playsInline preload="none" aria-hidden="true" disablePictureInPicture />
    <video ref={loop} muted playsInline preload="none" aria-hidden="true" disablePictureInPicture />
  </figure>;
}
