"use client";

import { useTheme } from "@/components/motion/Providers";

/* Day / night switch. Checked is the light ("blue") theme: the slider turns
   sky blue, the crescent fills out into a sun, the stars fade and a cloud
   drifts in. Class names are prefixed so they can't collide with the app's
   own styles. */

const CSS = `
.uv-switch{
  font-size:13px;position:relative;display:inline-block;
  width:4em;height:2.2em;border-radius:30px;
  box-shadow:0 0 10px rgba(0,0,0,.1);flex:none;
}
@media (min-width:640px){ .uv-switch{font-size:15px} }

.uv-switch input{opacity:0;width:0;height:0;position:absolute}

/* the track is only ~29px tall on phones, so stretch the hit area to a
   comfortable 45px vertically — horizontally it stays put, clear of the
   buttons sitting next to it */
.uv-switch::after{content:"";position:absolute;inset:-8px 0;cursor:pointer}

.uv-slider{
  position:absolute;cursor:pointer;inset:0;
  background-color:#2a2a2a;transition:.4s;border-radius:30px;overflow:hidden;
}
.uv-slider:before{
  position:absolute;content:"";height:1.2em;width:1.2em;border-radius:20px;
  left:.5em;bottom:.5em;transition:.4s;
  transition-timing-function:cubic-bezier(.81,-.04,.38,1.5);
  box-shadow:inset 8px -4px 0px 0px #fff;
}
.uv-switch input:checked + .uv-slider{background-color:#00a6ff}
.uv-switch input:checked + .uv-slider:before{
  transform:translateX(1.8em);
  box-shadow:inset 15px -4px 0px 15px #ffcf48;
}

.uv-star{
  background-color:#fff;border-radius:50%;position:absolute;
  width:5px;height:5px;transition:all .4s;
}
.uv-star_1{left:2.5em;top:.5em}
.uv-star_2{left:2.2em;top:1.2em}
.uv-star_3{left:3em;top:.9em}
.uv-switch input:checked ~ .uv-slider .uv-star{opacity:0}

.uv-cloud{
  width:3.5em;position:absolute;bottom:-1.4em;left:-1.1em;
  opacity:0;transition:all .4s;
}
.uv-switch input:checked ~ .uv-slider .uv-cloud{opacity:1}

/* the real checkbox is invisible, so the ring has to live on the track */
.uv-switch input:focus-visible + .uv-slider{
  outline:2px solid var(--ring, #7aa2ff);outline-offset:2px;
}

@media (prefers-reduced-motion:reduce){
  .uv-slider,.uv-slider:before,.uv-star,.uv-cloud{transition:none}
}
`;

export default function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  const light = theme === "blue";

  return (
    <>
      <style>{CSS}</style>
      <label className="uv-switch" title={light ? "Switch to dark" : "Switch to light"}>
        <input
          type="checkbox"
          role="switch"
          checked={light}
          onChange={toggle}
          aria-label={`Switch to ${light ? "dark" : "light"} theme`}
        />
        <span className="uv-slider">
          <span className="uv-star uv-star_1" />
          <span className="uv-star uv-star_2" />
          <span className="uv-star uv-star_3" />
          {/* square viewBox with the cloud up top: the element is offset below
              the track, so only this upper band peeks in past overflow:hidden */}
          <svg className="uv-cloud" viewBox="0 0 100 100" fill="#fff" aria-hidden>
            <ellipse cx="32" cy="34" rx="19" ry="14" />
            <ellipse cx="54" cy="27" rx="16" ry="16" />
            <ellipse cx="73" cy="35" rx="16" ry="13" />
            <rect x="28" y="34" width="60" height="16" rx="8" />
          </svg>
        </span>
      </label>
    </>
  );
}
