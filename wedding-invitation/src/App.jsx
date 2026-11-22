import { useEffect, useMemo, useRef, useState } from "react";

const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const mapsSearch = (q) =>
  `https://www.google.com/maps/search/${encodeURIComponent(q)}`;

/* ---------- Countdown ---------- */
function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  return {
    Days: Math.floor(diff / 864e5),
    Hours: Math.floor((diff / 36e5) % 24),
    Minutes: Math.floor((diff / 6e4) % 60),
    Seconds: Math.floor((diff / 1e3) % 60),
  };
}

function Countdown({ target }) {
  const c = useCountdown(target);
  return (
    <div className="countdown">
      {Object.entries(c).map(([k, v]) => (
        <div key={k} className="cd-cell">
          <span className="cd-num">{String(v).padStart(2, "0")}</span>
          <span className="cd-label">{k}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Calendar ---------- */
const icsStamp = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");

function calendarLinks(data) {
  const start = new Date(data.wedding.dateTime);
  const end = new Date(start.getTime() + 3 * 36e5);
  const title = `${data.couple.groom} & ${data.couple.bride} Wedding`;
  const loc = `${data.venue.name}, ${data.venue.address}`;
  const google =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${icsStamp(start)}/${icsStamp(end)}` +
    `&location=${encodeURIComponent(loc)}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${loc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const icsHref = "data:text/calendar;charset=utf8," + encodeURIComponent(ics);
  return { google, icsHref };
}

/* ---------- Gallery ---------- */
function Gallery({ title, photos }) {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(null);
  const go = (direction) => {
    setCurrent((index) => (index + direction + photos.length) % photos.length);
  };
  const slideOffset = (index) => {
    const midpoint = Math.floor(photos.length / 2);
    return ((index - current + photos.length + midpoint) % photos.length) - midpoint;
  };
  useEffect(() => {
    if (!photos?.length || open !== null) return undefined;
    const timer = window.setInterval(() => go(1), 5000);
    return () => window.clearInterval(timer);
  }, [photos, open]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
      if (!open && e.key === "ArrowLeft") go(-1);
      if (!open && e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos]);
  if (!photos?.length) return null;
  return (
    <section className="section">
      <h2 className="h2">{title}</h2>
      <div className="gallery" aria-roledescription="carousel" aria-label={title}>
      {photos.map((src, i) => {
        const offset = slideOffset(i);
        const distance = Math.abs(offset);
        return (
          <button
            key={src + i}
            className="g-item"
            onClick={() => (offset === 0 ? setOpen(i) : setCurrent(i))}
            aria-label={offset === 0 ? `Open photo ${i + 1}` : `Show photo ${i + 1}`}
            aria-current={offset === 0 ? "true" : undefined}
            aria-hidden={distance > 2}
            tabIndex={distance > 2 ? -1 : 0}
            style={{
              transform: `translateX(calc(-50% + ${offset * 68}%)) rotateY(${offset * -22}deg) scale(${1 - Math.min(distance, 3) * 0.12}) translateZ(${-distance * 35}px)`,
              zIndex: photos.length - distance,
              opacity: distance > 2 ? 0 : 1 - distance * 0.18,
              pointerEvents: distance > 2 ? "none" : "auto",
            }}
          >
            <img src={src} alt={`Gallery photo ${i + 1}`} loading={distance < 2 ? "eager" : "lazy"} />
          </button>
        );
      })}
        {photos.length > 1 && (
          <>
            <button className="g-nav g-prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
            <button className="g-nav g-next" onClick={() => go(1)} aria-label="Next photo">›</button>
            <div className="g-dots" aria-label="Choose photo">
              {photos.map((src, i) => (
                <button
                  key={src}
                  className={i === current ? "g-dot active" : "g-dot"}
                  onClick={() => setCurrent(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === current ? "true" : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {open !== null && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <img src={photos[open]} alt={`Gallery photo ${open + 1}`} />
          <button className="lb-close" aria-label="Close">×</button>
        </div>
      )}
    </section>
  );
}

/* ---------- RSVP ---------- */
function Rsvp({ data }) {
  const r = data.rsvp;
  const eventNames = data.events.map((e) => e.name);
  const [form, setForm] = useState({
    name: "", phone: "", guests: "1", events: [], message: "",
  });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (n) =>
    setForm({
      ...form,
      events: form.events.includes(n) ? form.events.filter((x) => x !== n) : [...form.events, n],
    });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) return setErr("Please enter your name.");
    const body = {
      name: form.name, phone: form.phone, guests: form.guests,
      events: form.events.join(", ") || "Not specified",
      message: form.message,
    };
    if (r.mode === "formspree" && r.formspreeUrl) {
      setBusy(true);
      try {
        const res = await fetch(r.formspreeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        setDone(true);
      } catch {
        setErr("Could not send your response. Please try again.");
      } finally {
        setBusy(false);
      }
    } else {
      const text =
        `RSVP for ${data.couple.groom} & ${data.couple.bride}'s wedding\n` +
        `Name: ${body.name}\nPhone: ${body.phone}\nGuests: ${body.guests}\n` +
        `Events: ${body.events}\nMessage: ${body.message}`;
      window.open(`https://wa.me/${r.whatsappNumber}?text=${encodeURIComponent(text)}`, "_blank");
      setDone(true);
    }
  };

  if (!r.enabled) return null;
  return (
    <section className="section rsvp">
      <h2 className="h2">{r.heading}</h2>
      <p className="lead">{r.subheading}</p>
      {done ? (
        <div className="thanks">
          <h3>Thank you!</h3>
          <p>{r.thankYou}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="form">
          <label>Full name
            <input value={form.name} onChange={set("name")} required autoComplete="name" />
          </label>
          <label>Phone number
            <input value={form.phone} onChange={set("phone")} type="tel" autoComplete="tel" />
          </label>
          <label>Number of guests
            <select value={form.guests} onChange={set("guests")}>
              {Array.from({ length: 10 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
            </select>
          </label>
          <fieldset>
            <legend>Events attending</legend>
            <div className="chips">
              {eventNames.map((n) => (
                <label key={n} className={"chip" + (form.events.includes(n) ? " on" : "")}>
                  <input type="checkbox" checked={form.events.includes(n)} onChange={() => toggle(n)} />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
          <label>Message for the couple
            <textarea rows="3" value={form.message} onChange={set("message")} />
          </label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send RSVP"}</button>
        </form>
      )}
    </section>
  );
}

/* ---------- Music ---------- */
function Music({ file, youtubeId, startSeconds = 0, endSeconds }) {
  const ref = useRef(null);
  const youtubeRef = useRef(null);
  const youtubePlayer = useRef(null);
  const pendingPlay = useRef(false);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!youtubeId) return undefined;

    const createPlayer = () => {
      if (!window.YT?.Player || !youtubeRef.current) return;
      youtubePlayer.current = new window.YT.Player(youtubeRef.current, {
        height: "1",
        width: "1",
        videoId: youtubeId,
        playerVars: {
          start: startSeconds,
          end: endSeconds,
          loop: endSeconds == null ? 1 : 0,
          playlist: endSeconds == null ? youtubeId : undefined,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            setYoutubeReady(true);
            if (pendingPlay.current) {
              pendingPlay.current = false;
              event.target.seekTo(startSeconds, true);
              event.target.playVideo();
              setOn(true);
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) setOn(true);
            if (event.data === window.YT.PlayerState.PAUSED) setOn(false);
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        createPlayer();
      };
      if (!document.getElementById("youtube-iframe-api")) {
        const script = document.createElement("script");
        script.id = "youtube-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    }

    return () => {
      youtubePlayer.current?.destroy();
      youtubePlayer.current = null;
    };
  }, [youtubeId, startSeconds, endSeconds]);

  const toggle = () => {
    if (youtubeId) {
      const player = youtubePlayer.current;
      if (on) {
        player?.pauseVideo();
        setOn(false);
      } else if (youtubeReady && player) {
        player.seekTo(startSeconds, true);
        player.playVideo();
        setOn(true);
      } else {
        pendingPlay.current = true;
      }
      return;
    }

    const a = ref.current;
    if (!a) return;
    if (on) {
      a.pause();
      setOn(false);
      return;
    }
    if (a.readyState < 1) {
      pendingPlay.current = true;
      a.load();
      return;
    }
    a.currentTime = startSeconds;
    a.play().then(() => setOn(true)).catch(() => setOn(false));
  };
  const startPendingPlayback = (a) => {
    if (!pendingPlay.current) return;
    pendingPlay.current = false;
    a.currentTime = startSeconds;
    a.play().then(() => setOn(true)).catch(() => setOn(false));
  };
  const keepPlaybackInRange = (a) => {
    if (endSeconds != null && a.currentTime >= endSeconds) a.currentTime = startSeconds;
  };
  return (
    <>
      {youtubeId ? (
        <div ref={youtubeRef} className="youtube-music-player" aria-hidden="true" />
      ) : (
        <audio
          ref={ref}
          src={file}
          loop={endSeconds == null}
          preload="metadata"
          onLoadedMetadata={(event) => startPendingPlayback(event.currentTarget)}
          onTimeUpdate={(event) => keepPlaybackInRange(event.currentTarget)}
          onEnded={(event) => {
            if (endSeconds != null && on) {
              event.currentTarget.currentTime = startSeconds;
              event.currentTarget.play().catch(() => setOn(false));
            } else {
              setOn(false);
            }
          }}
        />
      )}
      <button className="music" onClick={toggle} aria-label={on ? "Pause music" : "Play music"}>
        {on ? "❚❚" : "♪"}
      </button>
    </>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    fetch(`/invitation.json?v=${Date.now()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!data) return;
    document.title = data.meta.title;
    const d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute("content", data.meta.description);
  }, [data]);

  const cal = useMemo(() => (data ? calendarLinks(data) : null), [data]);

  if (error) return <p className="status">Could not load invitation.json — check that it is valid JSON.</p>;
  if (!data) return <p className="status">Loading…</p>;

  const { couple: c, hero, wedding, events, venue, live, video } = data;
  const names = `${c.groom} & ${c.bride}`;
  const openInvitation = () => {
    setOpening(true);
    window.setTimeout(() => setOpened(true), 700);
  };

  return (
    <main>
      {!opened && (
        <section className={`invitation-cover${opening ? " is-opening" : ""}`} aria-label="Wedding invitation cover">
          <div className="cover-frame">
            <p className="cover-kicker">Together with their families</p>
            <span className="cover-flourish" aria-hidden="true">❧</span>
            <p className="cover-monogram" aria-hidden="true">{c.groom[0]} <i>&amp;</i> {c.bride[0]}</p>
            <p className="cover-label">Wedding Invitation</p>
            <h1 className="cover-names"><span>{c.groom}</span><i>&amp;</i><span>{c.bride}</span></h1>
            <p className="cover-request">Request the pleasure of your company</p>
            <p className="cover-date">{wedding.displayDate}</p>
            <button className="seal-button" onClick={openInvitation} aria-label="Open wedding invitation">
              <span className="seal-icon" aria-hidden="true">✦</span>
              <span>Open Invitation</span>
            </button>
            <p className="cover-hint">Tap the seal to begin</p>
          </div>
        </section>
      )}

      {opened && <div className="invitation-content">
      {data.music?.enabled && (
        <Music
          file={data.music.file}
          youtubeId={data.music.youtubeId}
          startSeconds={data.music.startSeconds}
          endSeconds={data.music.endSeconds}
        />
      )}

      {/* HERO */}
      <header className="hero">
        <div className="arch">
          <p className="kicker">{hero.kicker}</p>
          <p className="greet">{hero.greeting}</p>
          <p className="blessing">{hero.blessing}</p>
          <h1 className="names">
            <span>{c.groom}</span>
            <i>&amp;</i>
            <span>{c.bride}</span>
          </h1>
          <p className="tagline">{hero.tagline}</p>
          <p className="date">{wedding.displayDate}</p>
          <p className="loc">{hero.location}</p>
        </div>
        <a href="#invite" className="scroll" aria-label="Scroll down">Scroll</a>
      </header>

      {/* INVITATION TEXT + COUPLE */}
      <section id="invite" className="section">
        <p className="shloka">{data.invitationText.shloka}</p>
        <p className="lead wide">{data.invitationText.message}</p>
        <div className="couple">
          <img className="couple-photo" src={c.couplePhoto} alt={`${c.groom} and ${c.bride}`} />
          <div className="person">
            <h2>{c.groom}</h2>
            <p>Son of<br />{c.groomParents}</p>
          </div>
          <span className="amp">&amp;</span>
          <div className="person">
            <h2>{c.bride}</h2>
            <p>Daughter of<br />{c.brideParents}</p>
          </div>
        </div>
      </section>

      {/* COUNTDOWN */}
      <section className="section dark">
        <h2 className="h2">Counting Down to Our Special Day</h2>
        <Countdown target={wedding.dateTime} />
        <p className="lead">Save the date</p>
        <div className="row">
          <a className="btn ghost" href={cal.google} target="_blank" rel="noreferrer">Google Calendar</a>
          <a className="btn ghost" href={cal.icsHref} download="wedding.ics">Apple / Outlook</a>
        </div>
      </section>

      {/* EVENTS */}
      <section className="section">
        <h2 className="h2">Wedding Events</h2>
        <ol className="events">
          {events.map((e) => (
            <li key={e.name + e.date}>
              <div className="ev-date">{fmtDate(e.date)}</div>
              <h3>{e.name}</h3>
              <p className="ev-time">{e.time}</p>
              <p>{e.venue}</p>
              <a href={mapsSearch(e.mapQuery || e.venue)} target="_blank" rel="noreferrer">View on Maps</a>
            </li>
          ))}
        </ol>
      </section>

      <Gallery title={data.gallery.title} photos={data.gallery.photos} />

      {video.youtubeId && (
        <section className="section">
          <h2 className="h2">{video.title}</h2>
          <div className="video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
              title={video.title}
              allow="accelerometer; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* VENUE */}
      <section className="section">
        <h2 className="h2">{venue.title}</h2>
        <p className="venue-name">{venue.name}</p>
        <p className="lead">{venue.address}</p>
        <div className="map">
          <iframe
            title="Venue map"
            src={`https://www.google.com/maps?q=${encodeURIComponent(venue.mapQuery)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <a className="btn" href={`https://www.google.com/maps/dir//${encodeURIComponent(venue.mapQuery)}`} target="_blank" rel="noreferrer">
          Get Directions
        </a>
      </section>

      {/* LIVE */}
      {live.enabled && live.url && (
        <section className="section dark">
          <h2 className="h2">{live.title}</h2>
          <p className="lead">{live.text}</p>
          <a className="btn ghost" href={live.url} target="_blank" rel="noreferrer">Watch Live</a>
          <p className="note">{live.note}</p>
        </section>
      )}

      <Rsvp data={data} />

      <footer className="footer">
        <p className="foot-names">{names}</p>
        <p>{wedding.displayDate}</p>
        <p className="note">{data.footer.text}</p>
      </footer>
      </div>}
    </main>
  );
}
