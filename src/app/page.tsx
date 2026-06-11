"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Profile = {
  id: string;
  name: string;
  label: string;
  color: string;
};

type TripIntake = {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  childrenAges: string;
  interests: string[];
  budget: "budget" | "moderate" | "premium";
  travelStyle: "relaxed" | "balanced" | "packed";
  mustDos: string;
};

type TripStop = {
  id: string;
  time: string;
  name: string;
  category: string;
  locationQuery: string;
  description: string;
  tip: string;
  mapQuery: string;
};

type TripDay = {
  id: string;
  date: string;
  label: string;
  theme: string;
  routeNote: string;
  stops: TripStop[];
};

type TripPlan = {
  title: string;
  summary: string;
  destination: string;
  generatedAt: string;
  intake: TripIntake;
  days: TripDay[];
};

type StopState = {
  visited?: boolean;
  rating?: number;
  note?: string;
};

type Session = {
  profileId: string;
  profileName: string;
};

const profiles: Profile[] = [
  { id: "parent", name: "Parent", label: "Planning", color: "bg-emerald-600" },
  { id: "copilot", name: "Co-pilot", label: "On the road", color: "bg-sky-600" },
  { id: "family", name: "Family", label: "Viewing", color: "bg-amber-600" },
];

const interestOptions = [
  "Theme parks",
  "Beaches",
  "Seafood",
  "Nature",
  "Rainy day ideas",
  "Kid breaks",
  "Low walking",
  "Photo spots",
];

const defaultIntake: TripIntake = {
  origin: "",
  destination: "Orlando",
  startDate: "",
  endDate: "",
  adults: 2,
  children: 2,
  childrenAges: "",
  interests: ["Theme parks", "Kid breaks", "Seafood"],
  budget: "moderate",
  travelStyle: "balanced",
  mustDos: "",
};

const sessionKey = "tripai_session";
const passcodeKey = "tripai_family_passcode";
const tripKey = "tripai_trip";
const stopStateKey = "tripai_stop_state";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getDateRange(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso || startIso}T12:00:00`);
  if (Number.isNaN(start.getTime())) return [todayIso()];
  const safeEnd = Number.isNaN(end.getTime()) || end < start ? start : end;
  const days: string[] = [];
  let cursor = start;
  while (cursor <= safeEnd && days.length < 14) {
    days.push(toIso(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function destinationProfile(destination: string) {
  const normalized = destination.toLowerCase();
  if (normalized.includes("key")) {
    return {
      region: "Florida Keys",
      anchor: "Key Largo",
      beach: "Sombrero Beach",
      nature: "John Pennekamp Coral Reef State Park",
      rainy: "History of Diving Museum",
      dinner: "family seafood spot in Islamorada",
    };
  }
  if (normalized.includes("gulf") || normalized.includes("sarasota") || normalized.includes("clearwater")) {
    return {
      region: "Gulf Coast",
      anchor: "Sarasota",
      beach: "Siesta Key Beach",
      nature: "Marie Selby Botanical Gardens",
      rainy: "Mote Marine Laboratory",
      dinner: "casual seafood restaurant near the beach",
    };
  }
  if (normalized.includes("panhandle") || normalized.includes("destin") || normalized.includes("30a")) {
    return {
      region: "Panhandle",
      anchor: "Destin",
      beach: "Henderson Beach State Park",
      nature: "Grayton Beach State Park",
      rainy: "Gulfarium Marine Adventure Park",
      dinner: "harbor-side seafood restaurant",
    };
  }
  return {
    region: "Orlando",
    anchor: "Orlando",
    beach: "resort pool or splash pad break",
    nature: "Leu Gardens",
    rainy: "Crayola Experience Orlando",
    dinner: "kid-friendly dinner near Disney Springs",
  };
}

function density(style: TripIntake["travelStyle"]) {
  if (style === "relaxed") return "Keep this day loose with one main outing and longer breaks.";
  if (style === "packed") return "This day can carry a fuller schedule, but keep a backup rest window.";
  return "Balance one anchor activity with flexible family downtime.";
}

function stop(id: string, time: string, name: string, category: string, description: string, tip: string, destination: string): TripStop {
  const query = `${name} ${destination}`;
  return {
    id,
    time,
    name,
    category,
    locationQuery: query,
    description,
    tip,
    mapQuery: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
  };
}

function generateTrip(intake: TripIntake): TripPlan {
  const dates = getDateRange(intake.startDate || todayIso(), intake.endDate || intake.startDate || todayIso());
  const profile = destinationProfile(intake.destination);
  const wantsBeach = intake.interests.includes("Beaches");
  const wantsNature = intake.interests.includes("Nature");
  const wantsRain = intake.interests.includes("Rainy day ideas");
  const wantsSeafood = intake.interests.includes("Seafood");
  const wantsParks = intake.interests.includes("Theme parks");
  const wantsLowWalk = intake.interests.includes("Low walking");

  const days = dates.map((date, index) => {
    const dayNumber = index + 1;
    const isArrival = index === 0;
    const isDeparture = index === dates.length - 1 && dates.length > 1;
    const prefix = `day-${dayNumber}`;

    if (isArrival) {
      return {
        id: prefix,
        date,
        label: `Day ${dayNumber}`,
        theme: `Arrive near ${profile.anchor}`,
        routeNote: `Start from ${intake.origin || "home"} and treat drive times as a live Google Maps check, not a TripAI estimate.`,
        stops: [
          stop(`${prefix}-depart`, "Morning", "Home departure checklist", "Drive", "Pack snacks, chargers, medication, swimsuits, and one easy-access overnight bag.", "Consider leaving room in the first day for delays and kid breaks.", profile.anchor),
          stop(`${prefix}-lunch`, "Midday", "Easy lunch stop on route", "Meal", "Use Maps to pick a clean, quick stop when everyone is ready rather than locking this in now.", "Search near your current location once you are actually hungry.", profile.anchor),
          stop(`${prefix}-checkin`, "Afternoon", `${profile.anchor} check-in`, "Arrival", "Get settled, do a light grocery run, and let everyone decompress before dinner.", wantsLowWalk ? "Choose the closest parking option and skip extra errands today." : "A short walk after the drive can help everyone reset.", profile.anchor),
          stop(`${prefix}-dinner`, "Evening", wantsSeafood ? profile.dinner : "Low-stress family dinner", "Dinner", "Keep dinner simple on arrival night so the trip starts calm.", "Verify hours and join waitlists before driving over.", profile.anchor),
        ],
      };
    }

    if (isDeparture) {
      return {
        id: prefix,
        date,
        label: `Day ${dayNumber}`,
        theme: "Pack up and make the drive easier",
        routeNote: "Use live routing before loading the car and choose breaks based on traffic and energy.",
        stops: [
          stop(`${prefix}-pack`, "Morning", "Pack and room sweep", "Logistics", "Do one pass for chargers, swimsuits, toiletries, favorite stuffed items, and car snacks.", "Take photos of the room before checkout if you want a quick lost-item reference.", profile.anchor),
          stop(`${prefix}-brunch`, "Late morning", "Easy brunch before the road", "Meal", "Pick a low-wait breakfast or bakery option before the long drive.", "Avoid a long sit-down meal if checkout timing is tight.", profile.anchor),
          stop(`${prefix}-break`, "Afternoon", "Flexible road break", "Drive", "Plan one real stretch break before everyone is tired.", "Search for parks, rest areas, or clean travel plazas along the active route.", profile.anchor),
          stop(`${prefix}-home`, "Evening", "Home arrival notes", "Memory", "Capture favorite moments and anything to remember for the next trip.", "Add ratings now while the stops are still fresh.", profile.anchor),
        ],
      };
    }

    const parkDay = wantsParks && dayNumber % 2 === 0;
    const beachDay = wantsBeach && !parkDay && dayNumber % 3 === 0;
    const natureDay = wantsNature && !parkDay && !beachDay;
    const rainyFallback = wantsRain ? profile.rainy : "indoor family backup near your hotel";

    const anchorName = parkDay
      ? "Theme park anchor day"
      : beachDay
        ? profile.beach
        : natureDay
          ? profile.nature
          : `${profile.anchor} family explore day`;

    return {
      id: prefix,
      date,
      label: `Day ${dayNumber}`,
      theme: anchorName,
      routeNote: density(intake.travelStyle),
      stops: [
        stop(`${prefix}-breakfast`, "Morning", "Slow-start breakfast", "Meal", "Start with something predictable before the main outing.", "Pack water before leaving, especially for Florida heat.", profile.anchor),
        stop(`${prefix}-anchor`, "Late morning", anchorName, parkDay ? "Attraction" : beachDay ? "Beach" : "Outing", "Use this as the main memory-maker for the day.", "Verify hours, reservations, parking, and weather before committing.", profile.anchor),
        stop(`${prefix}-break`, "Afternoon", "Pool or quiet break", "Rest", "Build in a real reset so dinner does not become the first break of the day.", "If kids are fading, shorten the next stop instead of pushing through.", profile.anchor),
        stop(`${prefix}-backup`, "Late afternoon", rainyFallback, "Backup", "Keep this as the indoor or low-energy option if weather turns or the family needs a pivot.", "Only use this if it makes the day easier.", profile.anchor),
        stop(`${prefix}-dinner`, "Evening", wantsSeafood ? profile.dinner : "Family dinner near the day's route", "Dinner", "Choose dinner close to where you already are to avoid an extra cross-town drive.", "Check live wait times or reservations first.", profile.anchor),
      ],
    };
  });

  return {
    title: `${dates.length}-day ${profile.region} family road trip`,
    summary: `A local draft itinerary for ${intake.adults} adults and ${intake.children} children, tuned for a ${intake.travelStyle} pace and interests: ${intake.interests.join(", ")}.`,
    destination: profile.region,
    generatedAt: new Date().toISOString(),
    intake,
    days,
  };
}

function makeExport(plan: TripPlan, states: Record<string, StopState>) {
  return [
    plan.title,
    plan.summary,
    "Verify live hours, closures, reservations, weather, and routes before using this plan.",
    "",
    ...plan.days.flatMap((day) => [
      `${formatDate(day.date)} - ${day.theme}`,
      day.routeNote,
      ...day.stops.map((item) => {
        const state = states[item.id] || {};
        const rating = state.rating ? ` rating ${state.rating}/5` : "";
        const note = state.note ? ` note: ${state.note}` : "";
        return `- ${item.time}: ${item.name} (${item.category})${rating}${note}`;
      }),
      "",
    ]),
  ].join("\n");
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [passcode, setPasscode] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(profiles[0].id);
  const [loginError, setLoginError] = useState("");
  const [intake, setIntake] = useState<TripIntake>(() => ({
    ...defaultIntake,
    startDate: todayIso(),
    endDate: toIso(addDays(new Date(), 4)),
  }));
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [stopStates, setStopStates] = useState<Record<string, StopState>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // LocalStorage is only available after hydration; this app is intentionally browser-local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(readJson<Session | null>(sessionKey, null));
    setPlan(readJson<TripPlan | null>(tripKey, null));
    setStopStates(readJson<Record<string, StopState>>(stopStateKey, {}));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (session) writeJson(sessionKey, session);
    else window.localStorage.removeItem(sessionKey);
  }, [hydrated, session]);

  useEffect(() => {
    if (!hydrated) return;
    if (plan) writeJson(tripKey, plan);
    else window.localStorage.removeItem(tripKey);
  }, [hydrated, plan]);

  useEffect(() => {
    if (!hydrated) return;
    writeJson(stopStateKey, stopStates);
  }, [hydrated, stopStates]);

  const selected = profiles.find((profile) => profile.id === selectedProfile) || profiles[0];
  const currentDay = plan?.days[Math.min(activeDay, Math.max(plan.days.length - 1, 0))];
  const nextStop = useMemo(() => {
    if (!currentDay) return null;
    return currentDay.stops.find((item) => !stopStates[item.id]?.visited) || currentDay.stops[currentDay.stops.length - 1];
  }, [currentDay, stopStates]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = window.localStorage.getItem(passcodeKey);
    const trimmed = passcode.trim();

    if (!trimmed || trimmed.length < 4) {
      setLoginError("Use a family passcode with at least 4 characters.");
      return;
    }

    if (!saved) {
      window.localStorage.setItem(passcodeKey, trimmed);
    } else if (saved !== trimmed) {
      setLoginError("That passcode does not match this browser's family passcode.");
      return;
    }

    setSession({ profileId: selected.id, profileName: selected.name });
    setLoginError("");
    setPasscode("");
  }

  function updateStop(id: string, patch: StopState) {
    setStopStates((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        ...patch,
      },
    }));
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = generateTrip(intake);
    setPlan(next);
    setActiveDay(0);
    setStopStates({});
  }

  async function copyTrip() {
    if (!plan) return;
    await navigator.clipboard.writeText(makeExport(plan, stopStates));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function toggleInterest(interest: string) {
    setIntake((previous) => ({
      ...previous,
      interests: previous.interests.includes(interest)
        ? previous.interests.filter((item) => item !== interest)
        : [...previous.interests, interest],
    }));
  }

  if (!hydrated) {
    return <main className="min-h-screen bg-[#f7f4ee]" />;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#f7f4ee] text-stone-950">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-800">TripAI local MVP</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">
                Family trip plan, ready before the full platform is.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-stone-700">
                This vacation build keeps one family plan on this browser with a simple local login, itinerary draft,
                map handoffs, notes, and ratings.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/auth/sign-in"
                  className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
                >
                  Owner sign in
                </a>
                <a
                  href="/auth/sign-up"
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-white"
                >
                  Create owner account
                </a>
              </div>
            </div>

            <form onSubmit={handleLogin} className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Family login</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                First login sets this browser-local family passcode. This is a convenience gate, not cloud security.
              </p>

              <div className="mt-5 grid gap-3">
                {profiles.map((profile) => (
                  <label
                    key={profile.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${
                      selectedProfile === profile.id ? "border-emerald-700 bg-emerald-50" : "border-stone-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="profile"
                      value={profile.id}
                      checked={selectedProfile === profile.id}
                      onChange={() => setSelectedProfile(profile.id)}
                      className="h-4 w-4"
                    />
                    <span className={`h-3 w-3 rounded-full ${profile.color}`} />
                    <span className="flex-1">
                      <span className="block font-medium">{profile.name}</span>
                      <span className="text-sm text-stone-600">{profile.label}</span>
                    </span>
                  </label>
                ))}
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-medium">Family passcode</span>
                <input
                  type="password"
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                  className="mt-2 h-12 w-full rounded-md border border-stone-300 px-3 text-base outline-none focus:border-emerald-700"
                  minLength={4}
                />
              </label>

              {loginError ? <p className="mt-3 text-sm font-medium text-red-700">{loginError}</p> : null}

              <button className="mt-5 h-12 w-full rounded-md bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900">
                Enter trip planner
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-stone-950">
      <header className="border-b border-stone-300 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">TripAI</p>
            <h1 className="text-2xl font-semibold">Personal vacation planner</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-md border border-stone-300 bg-stone-50 px-3 py-2">Signed in as {session.profileName}</span>
            <button
              onClick={() => setSession(null)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 font-medium hover:bg-stone-100"
            >
              Switch profile
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Local draft.</strong> Stops, hours, routes, and closures are not live-verified. Check Google Maps,
            venue sites, weather, and reservations before using the plan.
          </div>

          <form onSubmit={handleGenerate} className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Trip details</h2>
              {plan ? <span className="text-xs font-medium text-stone-500">Regenerate anytime</span> : null}
            </div>

            <div className="mt-4 grid gap-4">
              <label>
                <span className="text-sm font-medium">Starting from</span>
                <input
                  value={intake.origin}
                  onChange={(event) => setIntake({ ...intake, origin: event.target.value })}
                  placeholder="Home city"
                  className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                  required
                />
              </label>

              <label>
                <span className="text-sm font-medium">Destination area</span>
                <input
                  value={intake.destination}
                  onChange={(event) => setIntake({ ...intake, destination: event.target.value })}
                  placeholder="Orlando, Gulf Coast, Keys..."
                  className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm font-medium">Start</span>
                  <input
                    type="date"
                    value={intake.startDate}
                    onChange={(event) => setIntake({ ...intake, startDate: event.target.value })}
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                    required
                  />
                </label>
                <label>
                  <span className="text-sm font-medium">End</span>
                  <input
                    type="date"
                    value={intake.endDate}
                    onChange={(event) => setIntake({ ...intake, endDate: event.target.value })}
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                    required
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm font-medium">Adults</span>
                  <input
                    type="number"
                    min={1}
                    value={intake.adults}
                    onChange={(event) => setIntake({ ...intake, adults: Number(event.target.value) })}
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                  />
                </label>
                <label>
                  <span className="text-sm font-medium">Children</span>
                  <input
                    type="number"
                    min={0}
                    value={intake.children}
                    onChange={(event) => setIntake({ ...intake, children: Number(event.target.value) })}
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                  />
                </label>
              </div>

              <label>
                <span className="text-sm font-medium">Children ages</span>
                <input
                  value={intake.childrenAges}
                  onChange={(event) => setIntake({ ...intake, childrenAges: event.target.value })}
                  placeholder="Example: 6, 9"
                  className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                />
              </label>

              <fieldset>
                <legend className="text-sm font-medium">Interests</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`min-h-10 rounded-md border px-3 text-sm font-medium ${
                        intake.interests.includes(interest)
                          ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                          : "border-stone-300 bg-white text-stone-700"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm font-medium">Budget</span>
                  <select
                    value={intake.budget}
                    onChange={(event) => setIntake({ ...intake, budget: event.target.value as TripIntake["budget"] })}
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                  >
                    <option value="budget">Budget</option>
                    <option value="moderate">Moderate</option>
                    <option value="premium">Premium</option>
                  </select>
                </label>
                <label>
                  <span className="text-sm font-medium">Pace</span>
                  <select
                    value={intake.travelStyle}
                    onChange={(event) =>
                      setIntake({ ...intake, travelStyle: event.target.value as TripIntake["travelStyle"] })
                    }
                    className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                  >
                    <option value="relaxed">Relaxed</option>
                    <option value="balanced">Balanced</option>
                    <option value="packed">Packed</option>
                  </select>
                </label>
              </div>

              <label>
                <span className="text-sm font-medium">Must-do notes</span>
                <textarea
                  value={intake.mustDos}
                  onChange={(event) => setIntake({ ...intake, mustDos: event.target.value })}
                  rows={3}
                  placeholder="Anything the family really wants or needs to avoid"
                  className="mt-1 w-full rounded-md border border-stone-300 p-3"
                />
              </label>
            </div>

            <button className="mt-5 h-12 w-full rounded-md bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900">
              {plan ? "Regenerate plan" : "Generate family plan"}
            </button>
          </form>
        </aside>

        <section className="min-w-0">
          {!plan ? (
            <div className="flex min-h-[560px] items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Ready when you are</p>
                <h2 className="mt-3 text-3xl font-semibold">Enter the basics and generate a draft plan.</h2>
                <p className="mt-4 text-stone-600">
                  The first version is local and practical: route prompts, family breaks, dinner ideas, Maps handoffs,
                  and space for notes while you travel.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
                      {plan.destination}
                    </p>
                    <h2 className="mt-1 text-3xl font-semibold">{plan.title}</h2>
                    <p className="mt-2 max-w-3xl text-stone-700">{plan.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={copyTrip}
                      className="min-h-11 rounded-md border border-stone-300 bg-white px-4 font-medium hover:bg-stone-100"
                    >
                      {copied ? "Copied" : "Copy trip"}
                    </button>
                    <button
                      onClick={() => {
                        setPlan(null);
                        setStopStates({});
                      }}
                      className="min-h-11 rounded-md border border-red-300 bg-white px-4 font-medium text-red-700 hover:bg-red-50"
                    >
                      Clear local trip
                    </button>
                  </div>
                </div>
              </div>

              {currentDay && nextStop ? (
                <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                  <div className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Active day</p>
                    <h3 className="mt-1 text-2xl font-semibold">
                      {formatDate(currentDay.date)}: {currentDay.theme}
                    </h3>
                    <p className="mt-2 text-stone-700">{currentDay.routeNote}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-900">Next stop</p>
                    <h3 className="mt-1 text-xl font-semibold">{nextStop.name}</h3>
                    <p className="mt-1 text-sm text-emerald-950">
                      {nextStop.time} - {nextStop.category}
                    </p>
                    <a
                      href={nextStop.mapQuery}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-2 overflow-x-auto pb-1">
                {plan.days.map((day, index) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveDay(index)}
                    className={`min-h-12 shrink-0 rounded-md border px-4 text-left ${
                      activeDay === index ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-300 bg-white"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{day.label}</span>
                    <span className="block text-xs">{formatDate(day.date)}</span>
                  </button>
                ))}
              </div>

              {currentDay ? (
                <div className="space-y-3">
                  {currentDay.stops.map((item) => {
                    const state = stopStates[item.id] || {};
                    return (
                      <article key={item.id} className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
                        <div className="grid gap-4 xl:grid-cols-[150px_1fr_180px]">
                          <div>
                            <p className="text-sm font-semibold text-stone-500">{item.time}</p>
                            <p className="mt-1 rounded-md bg-stone-100 px-2 py-1 text-sm font-medium">{item.category}</p>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">{item.name}</h3>
                            <p className="mt-2 leading-7 text-stone-700">{item.description}</p>
                            <p className="mt-2 text-sm leading-6 text-stone-600">{item.tip}</p>
                          </div>
                          <div className="flex flex-row gap-2 xl:flex-col">
                            <a
                              href={item.mapQuery}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-stone-900 px-3 text-center text-sm font-semibold text-white hover:bg-stone-700"
                            >
                              Maps
                            </a>
                            <button
                              onClick={() => updateStop(item.id, { visited: !state.visited })}
                              className={`min-h-11 flex-1 rounded-md border px-3 text-sm font-semibold ${
                                state.visited
                                  ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                                  : "border-stone-300 bg-white"
                              }`}
                            >
                              {state.visited ? "Visited" : "Mark visited"}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 border-t border-stone-200 pt-4 md:grid-cols-[180px_1fr]">
                          <label>
                            <span className="text-sm font-medium">Rating</span>
                            <select
                              value={state.rating || ""}
                              onChange={(event) =>
                                updateStop(item.id, { rating: event.target.value ? Number(event.target.value) : undefined })
                              }
                              className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3"
                            >
                              <option value="">Not rated</option>
                              <option value="1">1 / 5</option>
                              <option value="2">2 / 5</option>
                              <option value="3">3 / 5</option>
                              <option value="4">4 / 5</option>
                              <option value="5">5 / 5</option>
                            </select>
                          </label>
                          <label>
                            <span className="text-sm font-medium">Family note</span>
                            <textarea
                              value={state.note || ""}
                              onChange={(event) => updateStop(item.id, { note: event.target.value })}
                              rows={2}
                              placeholder="What worked, what to remember, or what to skip next time"
                              className="mt-1 w-full rounded-md border border-stone-300 p-3"
                            />
                          </label>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
