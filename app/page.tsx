"use client";

import {
  CSSProperties,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  LookupResponse,
  Submission,
  registrationResponse as RegistrationResponse,
} from "./lib/definitions";

const NON_MEMBER = "I'm not a Rotarian / Non-member";

type AttendanceSubmission = Submission & {
  baseRotaryClub: string;
  buddyGroup: string;
  invitedBy: string;
  customClub: boolean;
};

const ROTARY_BLUE_PATH =
  "M172.73 137.43l.42 8a2.42 2.42 0 0 1-1.94 2.48 73.18 73.18 0 0 1-10.88 1.37c-14.56 0-19-5.57-19-23.82V97.52h-5.59a2.41 2.41 0 0 1-2.4-2.41v-8.25a2.4 2.4 0 0 1 2.4-2.39h5.59v-9.81a2.4 2.4 0 0 1 1.82-2.33l9.66-2.35a2.39 2.39 0 0 1 3 2.33v12.16h14.72a2.4 2.4 0 0 1 2.39 2.39v8.25a2.41 2.41 0 0 1-2.39 2.41h-14.76v25.85c0 8.94.32 12 6.59 12 2.31 0 5.94-.15 7.88-.26a2.4 2.4 0 0 1 2.49 2.32zm-45.59-21.66c0 23-8.75 33.31-28.36 33.31s-28.51-10.31-28.51-33.31c0-22.7 8.79-32.82 28.51-32.82 19.35 0 28.36 10.42 28.36 32.82zm-14.69 0c0-14.14-3.84-19.64-13.67-19.64-10.2 0-13.78 5.13-13.78 19.64 0 13.16 2.2 20.27 13.82 20.27 11.39 0 13.63-7.43 13.63-20.27zM342.8 85.4a2.34 2.34 0 0 0-1.88-.93h-9.38a2.39 2.39 0 0 0-2.31 1.78l-12.56 47.38h-1l-12.55-47.38a2.39 2.39 0 0 0-2.32-1.78h-9.36a2.39 2.39 0 0 0-2.33 3l13.83 53.14c.7 2.63 3.13 7.09 7.95 7.09h2.68c-.23.89-.47 1.84-.73 2.65l-.13.41c-.75 2.45-1.88 6.15-8.72 6.15l-12-.73a2.34 2.34 0 0 0-1.83.67 2.4 2.4 0 0 0-.72 1.83l.3 6.26a2.36 2.36 0 0 0 1.82 2.22 90.6 90.6 0 0 0 15.81 2.1h.76c9 0 15.15-5.84 18.24-17.34 3.58-13.48 8.07-30.8 11.35-43.46l3.67-14.11 1.8-6.89a2.33 2.33 0 0 0-.39-2.06zM61.47 144.34a2.49 2.49 0 0 1-.18 2.28 2.46 2.46 0 0 1-2 1.08H48.06a2.36 2.36 0 0 1-2.19-1.43l-14.36-32.3c-7.14 0-13.34-.43-16.69-.67v32a2.39 2.39 0 0 1-2.39 2.4h-10A2.41 2.41 0 0 1 0 145.3v-81a2.39 2.39 0 0 1 2.14-2.38 248.23 248.23 0 0 1 27-1.61h2C55.8 60.31 61 74.88 61 87.08c0 10.19-4.86 17.56-14.87 22.53zM31.08 74.21h-5.29a59.24 59.24 0 0 0-11 .78v25c2.82.2 8.26.48 15.55.4 9.42-.09 15.28-5.09 15.28-13 .03-6.4-3.8-13.18-14.54-13.18zm200.6 30.15v41.92a2.41 2.41 0 0 1-2.68 2.39 18 18 0 0 1-9.57-4c-.1.05-10.94 4.42-20.65 4.42-11.67 0-18.37-7.37-18.37-20.25 0-12.58 6.14-18.15 21.17-19.28l15.71-1.25v-3.82c0-4.82-2.88-7.59-7.87-7.59-6.88 0-16.7.8-21.92 1.27a2.38 2.38 0 0 1-1.82-.58 2.46 2.46 0 0 1-.82-1.7l-.3-8a2.38 2.38 0 0 1 2-2.47c4.68-.74 16.35-2.44 23.63-2.44 14.65-.03 21.49 6.79 21.49 21.38zm-28.39 16c-5.67.54-8.35 3.13-8.35 8.12 0 3.08.83 8.26 6.45 8.26 6.68 0 15.74-2.53 15.85-2.55v-14.62zm75.27-36.32c-6.37.38-12.66 4-16.57 6.81v-3.99a2.39 2.39 0 0 0-2.41-2.39h-9.64a2.4 2.4 0 0 0-2.42 2.39v58.44a2.4 2.4 0 0 0 2.42 2.4h9.64a2.4 2.4 0 0 0 2.41-2.4v-40.39c2.17-1.82 8.91-6.87 16.94-7.57a2.41 2.41 0 0 0 2.18-2.4v-8.56a2.41 2.41 0 0 0-2.55-2.39z";

const ROTARY_WHEEL_OUTER_PATH =
  "M593 107.97v-.31l-.24-.14a35 35 0 0 0-17-4.61c-.12-.8-.88-6.48-1-7.29A34.8 34.8 0 0 0 590 86.77l.21-.19-.06-.31a32.87 32.87 0 0 0-1.86-7l-.12-.28-.29-.07a34.88 34.88 0 0 0-17.58 0c-.28-.75-2.44-6-2.75-6.72a35.85 35.85 0 0 0 12.38-12.43l.14-.23-.07-.27a36.05 36.05 0 0 0-3.6-6.25l-.17-.24h-.32a35.44 35.44 0 0 0-17 4.47c-.48-.66-4-5.23-4.47-5.87a35.22 35.22 0 0 0 8.8-15.22l.08-.3-.21-.23a32.61 32.61 0 0 0-5.11-5.16l-.22-.17h-.31a35.44 35.44 0 0 0-15.22 8.78c-.66-.51-5.22-4.08-5.88-4.62A34.45 34.45 0 0 0 541 17.97v-.74l-.23-.18a29.77 29.77 0 0 0-6.29-3.63l-.26-.1-.25.13a35 35 0 0 0-12.46 12.32c-.78-.3-6.33-2.63-7.06-3a36.66 36.66 0 0 0 1.19-8.89 29.91 29.91 0 0 0-1.19-8.66l-.07-.28-.29-.11a31.53 31.53 0 0 0-6.93-1.9l-.33-.05-.19.2a35.16 35.16 0 0 0-8.81 15.22c-.82-.14-6.56-.85-7.43-.94a34.77 34.77 0 0 0-4.56-17l-.14-.15h-.3a32.46 32.46 0 0 0-7.24 0h-.32l-.14.27a35 35 0 0 0-4.55 16.94c-.83.11-6.66.82-7.5 1a35.07 35.07 0 0 0-8.81-15.25l-.22-.22h-.32a34.06 34.06 0 0 0-6.95 1.86l-.28.12-.11.28a33.27 33.27 0 0 0-1.15 8.76 38.33 38.33 0 0 0 1.19 8.8c-.73.31-6.33 2.72-7.08 3a35.63 35.63 0 0 0-12.41-12.42l-.26-.16-.31.11a36.21 36.21 0 0 0-6.24 3.64l-.26.16v.8A35 35 0 0 0 427 34.5c-.63.52-4.84 3.82-5.48 4.33a35.37 35.37 0 0 0-15.23-8.82l-.28-.06-.21.2a31.11 31.11 0 0 0-5.17 5.09l-.19.24.07.29a35.54 35.54 0 0 0 8.77 15.25c-.46.64-4.13 5.42-4.64 6.08a34.78 34.78 0 0 0-17-4.59h-.28l-.18.25a34.11 34.11 0 0 0-3.63 6.27l-.12.26.15.28A35.64 35.64 0 0 0 396 72.04c-.28.74-2.41 5.92-2.73 6.67a34.64 34.64 0 0 0-17.61 0l-.29.07-.1.26a32.31 32.31 0 0 0-1.9 7v.3l.21.24a34.61 34.61 0 0 0 15.23 8.73c-.12.82-.87 6.56-1 7.34a35.19 35.19 0 0 0-17 4.56l-.27.15v.3a33 33 0 0 0 0 7.25v.29l.27.14a34.8 34.8 0 0 0 17 4.55c.12.83.93 6.72 1 7.53a35.59 35.59 0 0 0-15.2 8.86l-.21.25v.27a35 35 0 0 0 1.89 7l.12.26.27.1a35.15 35.15 0 0 0 17.62 0c.3.74 2.58 6 2.9 6.71a35.34 35.34 0 0 0-12.42 12.39l-.13.27.1.28a34.49 34.49 0 0 0 3.64 6.26l.18.24h.28a35.11 35.11 0 0 0 17-4.5c.5.62 4.09 5.3 4.56 5.94a34.86 34.86 0 0 0-8.8 15.2l-.07.28.18.24a37.53 37.53 0 0 0 5.1 5.14l.24.21.29-.1a35.12 35.12 0 0 0 15.24-8.75c.66.52 5.31 4.09 6 4.6a36 36 0 0 0-4.53 16.7v.61l.27.21a36.92 36.92 0 0 0 6.23 3.62l.27.1.29-.14a35.25 35.25 0 0 0 12.46-12.47l6.58 2.67a35.85 35.85 0 0 0-1.16 8.8 31.43 31.43 0 0 0 1.19 8.76l.06.29.3.11a34 34 0 0 0 7 1.93h.32l.21-.24a34.17 34.17 0 0 0 8.72-15.2c.84.14 6.72 1 7.54 1.06a34.83 34.83 0 0 0 4.59 16.93l.12.26h.33a32.37 32.37 0 0 0 7.23 0h.29l.15-.26a35.68 35.68 0 0 0 4.6-17c.82-.11 6.32-.88 7.14-1a34.5 34.5 0 0 0 8.79 15.24l.22.2h.27a37.08 37.08 0 0 0 7-1.87l.26-.13.09-.27a32 32 0 0 0 1.14-8.76 37.3 37.3 0 0 0-1.14-8.89c.76-.29 6.09-2.6 6.84-2.93a35.8 35.8 0 0 0 12.42 12.44l.24.12.29-.11a31.5 31.5 0 0 0 6.29-3.65l.23-.14v-.81a36.19 36.19 0 0 0-4.5-16.53c.64-.5 5-3.92 5.67-4.43a36.06 36.06 0 0 0 15.27 8.79l.28.08.22-.2a37.06 37.06 0 0 0 5.15-5.1l.2-.26-.1-.26a35.15 35.15 0 0 0-8.73-15.25c.49-.65 4-5.32 4.52-6a34.8 34.8 0 0 0 17 4.49h.3l.18-.22a28.82 28.82 0 0 0 3.63-6.3l.12-.25-.14-.27a36.44 36.44 0 0 0-12.3-12.48c.3-.74 2.41-5.89 2.72-6.63a34 34 0 0 0 17.55 0l.26-.09.12-.26a34.36 34.36 0 0 0 1.91-7v-.3l-.22-.23a34.64 34.64 0 0 0-15.15-8.78c.13-.8.91-6.32 1-7.13a35 35 0 0 0 17-4.58l.24-.16v-.31a28.06 28.06 0 0 0 .2-3.62 27.68 27.68 0 0 0-.13-3.5zm-111.21 86.3a83.5 83.5 0 1 1 83.48-83.5 83.59 83.59 0 0 1-83.48 83.5z";

const ROTARY_WHEEL_INNER_PATH =
  "M481.79 37.32a73.46 73.46 0 1 0 73.45 73.45 73.52 73.52 0 0 0-73.45-73.45zM491 49.13a2.93 2.93 0 0 1 2.57-.2c14.76 3.57 25.59 9.8 36.17 20.92a3.45 3.45 0 0 1 1.16 2.19v.26c-.22 1-1.35 1.55-2.36 2l-30.9 15a3.33 3.33 0 0 1-3.25.07 3.42 3.42 0 0 1-1.58-2.86l-2.49-34.23c-.1-1.64.12-2.65.68-3.15zm-57.37 21c10.57-11.1 21.39-17.37 36.15-20.91a2.82 2.82 0 0 1 2.54.21c.63.48.84 1.49.73 3.13l-2.45 34.21a3.3 3.3 0 0 1-1.55 2.86 3.33 3.33 0 0 1-3.25-.07l-30.88-15c-1-.5-2.19-1-2.39-2a3.09 3.09 0 0 1 1.13-2.45zm-7.33 63.44c-1.34.92-2.33 1.25-3.09 1s-1.12-1.22-1.39-2.13c-4.37-14.58-4.37-27.08-.05-41.78.37-1.26.9-2 1.57-2.2 1-.36 2 .37 3 1l28.38 19.31a3.4 3.4 0 0 1 1.7 2.78 3.56 3.56 0 0 1-1.66 2.77zm46.6 40.2a2.89 2.89 0 0 1-2.57.14c-14.75-3.52-25.6-9.76-36.15-20.89a3.29 3.29 0 0 1-1.14-2.13 1.16 1.16 0 0 1 0-.31c.14-1 1.33-1.54 2.33-2l30.9-15a3.15 3.15 0 0 1 4.83 2.78l2.5 34.3c.16 1.59-.08 2.59-.67 3.11zm8.8-42.76a20.07 20.07 0 0 1-11-36.82 4.052 4.052 0 0 1 4.47 6.76 12 12 0 1 0 13.15 0 4.052 4.052 0 0 1 4.47-6.76 20.07 20.07 0 0 1-11 36.83zm48.08 21.61c-10.53 11.08-21.31 17.32-36.15 20.88a3 3 0 0 1-2.66-.23c-.78-.65-.68-2-.6-3.08l2.46-34.25a3.64 3.64 0 0 1 1.62-2.9 3.53 3.53 0 0 1 3.22.1l30.91 15c1.45.71 2.22 1.41 2.37 2.18s-.45 1.57-1.14 2.28zm10.42-64.34c.83.28 1.16 1.2 1.41 2.11 4.35 14.59 4.35 27.08 0 41.79-.35 1.26-.86 2-1.53 2.23-1 .3-2-.4-2.92-1.06l-28.42-19.28a3.46 3.46 0 0 1-1.73-2.79 3.5 3.5 0 0 1 1.73-2.79l28.42-19.27c1.31-.94 2.32-1.23 3.07-.96z";

const ugandaClubs = [
  NON_MEMBER,
  "Rotary Club of Adjumani",
  "Rotary Club of Arua",
  "Rotary Club of Bugiri",
  "Rotary Club of Bugolobi",
  "Rotary Club of Bulenga",
  "Rotary Club of Bundibugyo",
  "Rotary Club of Busia",
  "Rotary Club of Bushenyi",
  "Rotary Club of Bweyogerere",
  "Rotary Club of Entebbe",
  "Rotary Club of Entebbe Airport",
  "Rotary Club of Fort Portal",
  "Rotary Club of Gayaza",
  "Rotary Club of Ggaba",
  "Rotary Club of Gulu",
  "Rotary Club of Hoima",
  "Rotary Club of Iganga",
  "Rotary Club of Ishaka",
  "Rotary Club of Jinja",
  "Rotary Club of Jinja Nile",
  "Rotary Club of Kabale",
  "Rotary Club of Kaliro",
  "Rotary Club of Kamuli",
  "Rotary Club of Kampala",
  "Rotary Club of Kampala East",
  "Rotary Club of Kampala Metropolitan",
  "Rotary Club of Kampala Nile",
  "Rotary Club of Kampala North",
  "Rotary Club of Kampala South",
  "Rotary Club of Kampala West",
  "Rotary Club of Kasese",
  "Rotary Club of Katwe",
  "Rotary Club of Kawempe",
  "Rotary Club of Kayunga",
  "Rotary Club of Kira",
  "Rotary Club of Kisubi",
  "Rotary Club of Kitende",
  "Rotary Club of Kitende Breeze",
  "Rotary Club of Koboko",
  "Rotary Club of Kololo",
  "Rotary Club of Kotido",
  "Rotary Club of Kumi",
  "Rotary Club of Lira",
  "Rotary Club of Lubaga",
  "Rotary Club of Lugazi",
  "Rotary Club of Makindye",
  "Rotary Club of Masaka",
  "Rotary Club of Masindi",
  "Rotary Club of Mbale",
  "Rotary Club of Mbale Elgon",
  "Rotary Club of Mbarara",
  "Rotary Club of Mbarara Ankole",
  "Rotary Club of Mengo",
  "Rotary Club of Mityana",
  "Rotary Club of Moroto",
  "Rotary Club of Moyo",
  "Rotary Club of Mukono",
  "Rotary Club of Munyonyo",
  "Rotary Club of Muyenga",
  "Rotary Club of Najeera",
  "Rotary Club of Naalya",
  "Rotary Club of Najjeera",
  "Rotary Club of Nakasero",
  "Rotary Club of Nakawa",
  "Rotary Club of Mbuya",
  "Rotary Club of Nansana",
  "Rotary Club of Nebbi",
  "Rotary Club of Njeru",
  "Rotary Club of Ntinda",
  "Rotary Club of Pallisa",
  "Rotary Club of Rubaga",
  "Rotary Club of Rukungiri",
  "Rotary Club of Soroti",
  "Rotary Club of Ssabagabo",
  "Rotary Club of Tororo",
  "Rotary Club of Wakiso",
  "Rotary Club of Yumbe",
  "Rotary Club of Nalumunye",
  "Rotary Club of Nalumunye Heights",
  "Rotary Club of Bwebaja ",
  "Rotary Club of Bwebaja mid city",
  "Rotary Club of Alright",
  "Rotary Club of Kitende",
  "Rotary Club of Kajjansi",
  "Rotary Club of Namasuba",
  "Rotary Club of Muyenga breeze",
  "Rotary Club of Bunamwaya",
  "Rotary Club of Lubowa",
  "Rotary Club of Medical stores",
  "Rotary Club of Entebbe Base",
];

const searchableClubs = Array.from(
  new Set(
    ugandaClubs
      .filter((club) => club !== NON_MEMBER)
      .map((club) => club.trim()),
  ),
).sort((first, second) => first.localeCompare(second));

const heroImages = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=80",
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80",
  "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=80",
];

const classifications = [
  "Rotarian",
  "Rotaractor",
  "Inner Wheel",
  "Interact",
  "Honorary Member",
  "Guest",
];

const purposeOptions = [
  {
    key: "Installation",
    title: "Installation",
    subtitle: "Ceremony attendance",
    icon: <CrownIcon />,
  },
  {
    key: "Club Fellowship",
    title: "Club Fellowship",
    subtitle: "Networking",
    icon: <PeopleIcon />,
  },
  {
    key: "Service Project",
    title: "Service Project",
    subtitle: "Collaboration",
    icon: <HeartIcon />,
  },
  {
    key: "Other",
    title: "Other",
    subtitle: "Tell us more",
    icon: <MessageIcon />,
  },
];

type Errors = Partial<
  Record<"fullName" | "rotaryClub" | "purpose" | "otherPurpose", string>
>;

type FormNotice = {
  type: "error" | "info";
  title: string;
  message: string;
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function customScrollTo(element: HTMLElement, duration = 900) {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const target = element.getBoundingClientRect().top + window.scrollY;
  const start = window.scrollY;
  const distance = target - start;

  if (prefersReducedMotion) {
    window.scrollTo(0, target);
    return;
  }

  let startTime: number | null = null;

  function frame(timestamp: number) {
    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, start + distance * eased);

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function highlightMatch(text: string, query: string) {
  const cleanQuery = query.trim();

  if (!cleanQuery) return text;

  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));

  return parts.map((part, index) =>
    part.toLowerCase() === cleanQuery.toLowerCase() ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      part
    ),
  );
}

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function titleCaseWords(value: string) {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s-])([a-z])/g,
      (_match, prefix: string, letter: string) =>
        `${prefix}${letter.toUpperCase()}`,
    );
}

function normalizeClubName(value: string) {
  const clean = collapseWhitespace(value);

  if (!clean) return "";
  if (clean === NON_MEMBER) return NON_MEMBER;

  const withoutPrefix = clean.replace(/^rotary\s+club\s+of\s+/i, "");
  return `Rotary Club of ${titleCaseWords(withoutPrefix)}`;
}

function normalizeBuddyGroup(value: string) {
  return collapseWhitespace(value).toUpperCase();
}

function splitClubAndBuddyGroup(value: string) {
  const [clubPart = "", ...groupParts] = value.split("|");

  return {
    club: collapseWhitespace(clubPart),
    buddyGroup: normalizeBuddyGroup(groupParts.join("|")),
  };
}

function combineClubAndBuddyGroup(club: string, buddyGroup: string) {
  const normalizedGroup = normalizeBuddyGroup(buddyGroup);
  return normalizedGroup ? `${club} | ${normalizedGroup}` : club;
}

function formatUgandanPhone(value: string) {
  const digits = value
    .replace(/\D/g, "")
    .replace(/^00/, "")
    .replace(/^256/, "")
    .replace(/^0+/, "");
  return digits ? `+256${digits}` : "";
}

function todayInKampalaISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  const parsed = new Date(`${value}T12:00:00+03:00`);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-UG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function eventNameForPurpose(value: string) {
  if (value === "Club Fellowship")
    return "Rotary Club of Nakawa Monday Fellowship";
  if (value === "Installation")
    return "Rotary Club of Nakawa Presidential Installation";
  if (value === "Service Project")
    return "Rotary Club of Nakawa Service Project";
  return "Rotary Club of Nakawa Event";
}

function getFriendlySubmitError(
  response?: (RegistrationResponse & { code?: string }) | null,
): FormNotice {
  if (response?.code === "DUPLICATE") {
    return {
      type: "error",
      title: "Already checked in",
      message:
        response.message ||
        "This guest is already checked in for this selected day/event.",
    };
  }

  if (response?.code === "VALIDATION") {
    return {
      type: "error",
      title: "Please check the form",
      message: response.message || "Some required details are missing.",
    };
  }

  return {
    type: "error",
    title: "Registration could not be completed",
    message:
      response?.message ||
      "Please try again in a moment. If this continues, speak to the registration desk.",
  };
}

export default function Page() {
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const userScrolledRef = useRef(false);

  const [showSplash, setShowSplash] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [clubQuery, setClubQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [clubOpen, setClubOpen] = useState(false);
  const [classification, setClassification] = useState("");
  const [buddyGroup, setBuddyGroup] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [purpose, setPurpose] = useState("Club Fellowship");
  const [otherPurpose, setOtherPurpose] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<AttendanceSubmission | null>(null);
  const [notice, setNotice] = useState<FormNotice | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [lookupContact, setLookupContact] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const isNonMember = selectedClub === NON_MEMBER;

  const filteredClubs = useMemo(() => {
    const query = clubQuery.trim().toLowerCase();

    if (!query) return searchableClubs;

    return searchableClubs.filter((club) => club.toLowerCase().includes(query));
  }, [clubQuery]);

  const customClubCandidate = useMemo(() => {
    const normalized = normalizeClubName(clubQuery);

    if (!normalized || normalized === NON_MEMBER) return "";

    const alreadyExists = searchableClubs.some(
      (club) => club.toLowerCase() === normalized.toLowerCase(),
    );

    return alreadyExists ? "" : normalized;
  }, [clubQuery]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const alreadySeen =
      sessionStorage.getItem("kitende-breeze-splash-seen") === "true";

    if (alreadySeen || reduceMotion) {
      setShowSplash(false);
      setAppReady(true);
      return;
    }

    setShowSplash(true);

    const splashDone = window.setTimeout(() => {
      sessionStorage.setItem("kitende-breeze-splash-seen", "true");
      setShowSplash(false);
      setAppReady(true);
    }, 4500);

    return () => window.clearTimeout(splashDone);
  }, []);

  useEffect(() => {
    const handleLogoClick = (event: globalThis.MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;

      if (!target) return;

      const logo = target.closest(".rotary-wheel-icon, .rotary-wheel-outline");

      if (!logo) return;

      logo.classList.remove("logo-clicked");
      void (logo as HTMLElement).offsetWidth;
      logo.classList.add("logo-clicked");

      window.setTimeout(() => {
        logo.classList.remove("logo-clicked");
      }, 720);
    };

    document.addEventListener("click", handleLogoClick);

    return () => {
      document.removeEventListener("click", handleLogoClick);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % heroImages.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };

    const markScrolled = () => {
      if (window.scrollY > 12) userScrolledRef.current = true;
      updateProgress();
    };

    updateProgress();

    window.addEventListener("scroll", markScrolled, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", markScrolled);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  useEffect(() => {
    if (!appReady) return;

    const fieldItems = Array.from(
      document.querySelectorAll<HTMLElement>(".field-reveal"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            target.classList.add("is-visible");
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.2 },
    );

    fieldItems.forEach((field, index) => {
      field.style.setProperty("--field-delay", `${index * 60}ms`);
      observer.observe(field);
    });

    return () => observer.disconnect();
  }, [appReady, success]);

  useEffect(() => {
    const onPointer = (event: globalThis.MouseEvent) => {
      const dropdown = document.querySelector(".club-row");

      if (dropdown && !dropdown.contains(event.target as Node)) {
        setClubOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointer);

    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  useEffect(() => {
    if (!appReady || window.innerWidth >= 768) return;

    const toastIn = window.setTimeout(() => {
      if (!userScrolledRef.current) setShowToast(true);
    }, 2500);

    const toastOut = window.setTimeout(() => setShowToast(false), 3200);

    const scrollTimer = window.setTimeout(() => {
      if (!userScrolledRef.current && formCardRef.current) {
        customScrollTo(formCardRef.current, 900);
      }
    }, 3300);

    return () => {
      window.clearTimeout(toastIn);
      window.clearTimeout(toastOut);
      window.clearTimeout(scrollTimer);
    };
  }, [appReady]);

  function scrollToForm() {
    if (formCardRef.current) customScrollTo(formCardRef.current, 900);
  }

  function selectClub(club: string) {
    setSelectedClub(club);
    setClubQuery(club === NON_MEMBER ? "" : club);
    setClubOpen(false);
    setNotice(null);
    setErrors((current) => ({ ...current, rotaryClub: undefined }));
  }

  async function lookupReturningVisitor() {
    const query = lookupContact.trim();

    setNotice(null);

    if (!query) {
      setNotice({
        type: "error",
        title: "Enter contact first",
        message:
          "Returning guests can use either their email address or phone number.",
      });
      return;
    }

    setLookupLoading(true);

    try {
      const response = await fetch("/api/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query }),
      });

      let data: LookupResponse | null = null;

      try {
        data = (await response.json()) as LookupResponse;
      } catch {
        data = null;
      }

      if (!response.ok || !data?.success || !data.visitor) {
        setNotice({
          type: "info",
          title: "New guest",
          message:
            data?.message ||
            "No saved record was found. Please complete the details once.",
        });
        return;
      }

      const visitor = data.visitor as typeof data.visitor &
        Partial<
          Pick<
            AttendanceSubmission,
            "baseRotaryClub" | "buddyGroup" | "invitedBy"
          >
        >;
      const restored = splitClubAndBuddyGroup(visitor.rotaryClub || "");
      const restoredClub = visitor.baseRotaryClub || restored.club;
      const restoredBuddyGroup = visitor.buddyGroup || restored.buddyGroup;

      setFullName(visitor.fullName || "");
      setEmail(visitor.email || "");
      setPhone(visitor.phone || "");
      setClassification(visitor.classification || "");
      setSelectedClub(restoredClub);
      setClubQuery(
        restoredClub && restoredClub !== NON_MEMBER ? restoredClub : "",
      );
      setBuddyGroup(normalizeBuddyGroup(restoredBuddyGroup || ""));
      setInvitedBy(visitor.invitedBy || "");
      setClubOpen(false);
      setErrors({});
      setNotice({
        type: "info",
        title: "Welcome back",
        message: `${visitor.fullName}'s details have been restored. Confirm today's visit to check in.`,
      });
    } catch {
      setNotice({
        type: "error",
        title: "Lookup unavailable",
        message:
          "We could not retrieve the saved record right now. You can still complete the form manually.",
      });
    } finally {
      setLookupLoading(false);
    }
  }

  function validateForm(resolvedClub: string) {
    const nextErrors: Errors = {};

    if (!fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!phone.trim() && !email.trim())
      nextErrors.fullName =
        "Enter phone or email so future fellowship check-ins are quick.";
    if (!resolvedClub)
      nextErrors.rotaryClub =
        "Select your Rotary club, add it, or choose non-member.";
    if (!purpose) nextErrors.purpose = "Select a purpose of visit.";

    if (purpose === "Other" && !otherPurpose.trim()) {
      nextErrors.otherPurpose = "Please describe your purpose.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setNotice(null);

    const resolvedClub = selectedClub;

    if (!validateForm(resolvedClub)) {
      setNotice({
        type: "error",
        title: "A few details are missing",
        message: "Please check the highlighted fields before submitting.",
      });
      return;
    }

    setLoading(true);

    const attendanceDate = todayInKampalaISO();
    const normalizedBuddyGroup = normalizeBuddyGroup(buddyGroup);
    const isCustomClub =
      resolvedClub !== NON_MEMBER &&
      !searchableClubs.some(
        (club) => club.toLowerCase() === resolvedClub.toLowerCase(),
      );

    const submission: AttendanceSubmission = {
      fullName: fullName.trim(),
      phone: formatUgandanPhone(phone),
      email: email.trim().toLowerCase(),
      baseRotaryClub: resolvedClub,
      buddyGroup: normalizedBuddyGroup,
      invitedBy: collapseWhitespace(invitedBy),
      customClub: isCustomClub,
      rotaryClub: combineClubAndBuddyGroup(resolvedClub, normalizedBuddyGroup),
      classification,
      purpose,
      otherPurpose: purpose === "Other" ? otherPurpose.trim() : "",
      event: eventNameForPurpose(purpose),
      date: attendanceDate,
      attendanceDate,
      venue:
        purpose === "Installation"
          ? "Rivonia Suites, Nakawa Uganda"
          : "Rotary Club of Nakawa",
      submittedAt: new Date().toISOString(),
      checkInSource: "web",
    };

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...submission,
          honeypot,
        }),
      });

      let data: (RegistrationResponse & { code?: string }) | null = null;

      try {
        data = (await response.json()) as RegistrationResponse & {
          code?: string;
        };
      } catch {
        data = null;
      }

      if (!response.ok || !data?.success) {
        setNotice(getFriendlySubmitError(data));
        return;
      }

      if (data.alreadyRegistered) {
        setNotice({
          type: "info",
          title: "Already checked in",
          message:
            data.message || "This visitor was already checked in for today.",
        });
      }

      setSuccess(submission);
    } catch {
      setNotice({
        type: "error",
        title: "Connection problem",
        message:
          "We could not send the registration. Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFullName("");
    setPhone("");
    setEmail("");
    setClubQuery("");
    setSelectedClub("");
    setClubOpen(false);
    setClassification("");
    setBuddyGroup("");
    setInvitedBy("");
    setPurpose("Club Fellowship");
    setOtherPurpose("");
    setErrors({});
    setNotice(null);
    setHoneypot("");
    setLookupContact("");
    setSuccess(null);
  }

  return (
    <main>
      <div className="scroll-progress" style={{ width: `${progress}%` }} />

      {showSplash && <SplashScreen />}

      <Nav onRegister={scrollToForm} />

      {showToast && (
        <div className="mobile-toast" role="status">
          👇 Let&apos;s get you registered
        </div>
      )}

      <section className={`hero ${appReady ? "is-ready" : ""}`} id="welcome">
        <div className="hero-images" aria-hidden="true">
          {heroImages.map((image, index) => (
            <div
              key={image}
              className={`hero-image ${activeImage === index ? "active" : ""}`}
              style={{ backgroundImage: `url(${image})` }}
            />
          ))}
        </div>

        <div className="hero-overlay" />

        <div className="hero-grid">
          <div className="hero-copy">
            <div
              className="hero-item hero-badge-wrap"
              style={{ "--delay": "0ms" } as CSSProperties}
            >
              <span className="hero-badge">FELLOWSHIP & EVENT CHECK-IN</span>
            </div>

            <h1
              className="hero-title hero-item"
              style={{ "--delay": "150ms" } as CSSProperties}
            >
              <span>Welcome to</span>
              <strong>RC Nakawa</strong>
            </h1>

            <div
              className="hero-separator hero-item"
              style={{ "--delay": "280ms" } as CSSProperties}
            />

            <div
              className="hero-meta hero-item"
              style={{ "--delay": "380ms" } as CSSProperties}
            >
              <p>
                <strong>Weekly fellowship, events and guest attendance</strong>
              </p>
              <p>
                Monday Fellowship <span>·</span> Returning guest lookup{" "}
                <span>·</span> RC Nakawa
              </p>
            </div>

            <div
              className="hero-action hero-item"
              style={{ "--delay": "500ms" } as CSSProperties}
            >
              <button type="button" onClick={scrollToForm}>
                Check In
                <ArrowRightIcon />
              </button>
              <small>Returning guests only need email or phone</small>
            </div>
          </div>

          <div
            className="form-card-wrap hero-form"
            ref={formCardRef}
            style={{ "--delay": "200ms" } as CSSProperties}
          >
            <RegistrationCard
              success={success}
              notice={notice}
              honeypot={honeypot}
              fullName={fullName}
              phone={phone}
              email={email}
              clubQuery={clubQuery}
              selectedClub={selectedClub}
              clubOpen={clubOpen}
              classification={classification}
              buddyGroup={buddyGroup}
              invitedBy={invitedBy}
              purpose={purpose}
              otherPurpose={otherPurpose}
              errors={errors}
              loading={loading}
              lookupContact={lookupContact}
              lookupLoading={lookupLoading}
              filteredClubs={filteredClubs}
              customClubCandidate={customClubCandidate}
              isNonMember={isNonMember}
              onSubmit={handleSubmit}
              onReset={resetForm}
              onLookupReturningVisitor={lookupReturningVisitor}
              setHoneypot={setHoneypot}
              setLookupContact={setLookupContact}
              setFullName={setFullName}
              setPhone={setPhone}
              setEmail={setEmail}
              setClubQuery={setClubQuery}
              setSelectedClub={setSelectedClub}
              setClubOpen={setClubOpen}
              selectClub={selectClub}
              setClassification={setClassification}
              setBuddyGroup={setBuddyGroup}
              setInvitedBy={setInvitedBy}
              setPurpose={setPurpose}
              setOtherPurpose={setOtherPurpose}
              setErrors={setErrors}
              setNotice={setNotice}
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function RegistrationCard({
  success,
  notice,
  honeypot,
  fullName,
  phone,
  email,
  clubQuery,
  selectedClub,
  clubOpen,
  classification,
  buddyGroup,
  invitedBy,
  purpose,
  otherPurpose,
  errors,
  loading,
  lookupContact,
  lookupLoading,
  filteredClubs,
  customClubCandidate,
  isNonMember,
  onSubmit,
  onReset,
  onLookupReturningVisitor,
  setHoneypot,
  setLookupContact,
  setFullName,
  setPhone,
  setEmail,
  setClubQuery,
  setSelectedClub,
  setClubOpen,
  selectClub,
  setClassification,
  setBuddyGroup,
  setInvitedBy,
  setPurpose,
  setOtherPurpose,
  setErrors,
  setNotice,
}: {
  success: AttendanceSubmission | null;
  notice: FormNotice | null;
  honeypot: string;
  fullName: string;
  phone: string;
  email: string;
  clubQuery: string;
  selectedClub: string;
  clubOpen: boolean;
  classification: string;
  buddyGroup: string;
  invitedBy: string;
  purpose: string;
  otherPurpose: string;
  errors: Errors;
  loading: boolean;
  lookupContact: string;
  lookupLoading: boolean;
  filteredClubs: string[];
  customClubCandidate: string;
  isNonMember: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onLookupReturningVisitor: () => void;
  setHoneypot: (value: string) => void;
  setLookupContact: (value: string) => void;
  setFullName: (value: string) => void;
  setPhone: (value: string) => void;
  setEmail: (value: string) => void;
  setClubQuery: (value: string) => void;
  setSelectedClub: (value: string) => void;
  setClubOpen: (value: boolean) => void;
  selectClub: (club: string) => void;
  setClassification: (value: string) => void;
  setBuddyGroup: (value: string) => void;
  setInvitedBy: (value: string) => void;
  setPurpose: (value: string) => void;
  setOtherPurpose: (value: string) => void;
  setErrors: Dispatch<SetStateAction<Errors>>;
  setNotice: Dispatch<SetStateAction<FormNotice | null>>;
}) {
  if (success) {
    return <SuccessState submission={success} onReset={onReset} />;
  }

  return (
    <div className="registration-card">
      <header className="card-header">
        <div className="card-icon">
          <RotaryWheelIcon />
        </div>

        <div>
          <p>FAST CHECK-IN</p>
          <h2>Fellowship Attendance</h2>
          <span>Returning guests can restore details with email or phone.</span>
        </div>
      </header>

      <div className="card-divider" />

      <div className="returning-lookup field-reveal">
        <div>
          <strong>Returning guest?</strong>
          <span>
            Enter email or phone, then confirm today's fellowship/event.
          </span>
        </div>

        <div className="lookup-row">
          <input
            type="text"
            value={lookupContact}
            onChange={(event) => {
              setLookupContact(event.target.value);
              setNotice(null);
            }}
            placeholder="Email or phone number"
            autoComplete="email tel"
          />
          <button
            type="button"
            onClick={onLookupReturningVisitor}
            disabled={lookupLoading}
          >
            {lookupLoading ? "Finding..." : "Find"}
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <div className="honeypot-field" aria-hidden="true">
          <label htmlFor="company-name">Company name</label>
          <input
            id="company-name"
            name="companyName"
            type="text"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <FloatingInput
          className="field-reveal"
          id="full-name"
          label="Full name"
          value={fullName}
          onChange={(value) => {
            setFullName(value);
            setNotice(null);
            setErrors((current) => ({ ...current, fullName: undefined }));
          }}
          icon={<UserIcon />}
          error={errors.fullName}
          autoComplete="name"
          required
        />

        <div className="form-row field-reveal">
          <div className="phone-row">
            <div className="phone-prefix">
              <span aria-hidden="true">🇺🇬</span>
              <strong>256</strong>
            </div>

            <label
              className={`phone-field ${phone ? "has-value" : ""}`}
              htmlFor="phone"
            >
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setNotice(null);
                }}
                placeholder=" "
                inputMode="tel"
                autoComplete="tel"
              />
              <span>Phone number</span>
            </label>
          </div>

          <p className="helper-text">
            Recommended — makes next Thursday a one-step check-in
          </p>
        </div>

        <FloatingInput
          className="field-reveal"
          id="email"
          label="Email address"
          value={email}
          onChange={(value) => {
            setEmail(value);
            setNotice(null);
          }}
          icon={<MailIcon />}
          helper="Recommended — use email or phone for returning lookup"
          type="email"
          autoComplete="email"
        />

        {!isNonMember ? (
          <div className="form-row club-row field-reveal">
            <FieldLabel required>ROTARY CLUB</FieldLabel>

            <div
              className={`club-select ${clubOpen ? "open" : ""} ${selectedClub ? "has-value" : ""}`}
            >
              <SearchIcon />

              <input
                type="text"
                value={clubQuery}
                onFocus={() => setClubOpen(true)}
                onChange={(event) => {
                  setClubQuery(event.target.value);
                  setSelectedClub("");
                  setClubOpen(true);
                  setNotice(null);
                }}
                placeholder=" "
                aria-invalid={Boolean(errors.rotaryClub)}
              />

              <span>Search or select your club...</span>

              {clubOpen && (
                <div className="club-dropdown" role="listbox">
                  <button
                    type="button"
                    className="club-option non-member-option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectClub(NON_MEMBER)}
                  >
                    {NON_MEMBER}
                  </button>

                  {customClubCandidate && (
                    <button
                      type="button"
                      className="club-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectClub(customClubCandidate)}
                    >
                      Add “{customClubCandidate}”
                    </button>
                  )}

                  {filteredClubs.length > 0 ? (
                    filteredClubs.map((club) => (
                      <button
                        type="button"
                        key={club}
                        className={`club-option ${selectedClub === club ? "selected" : ""}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectClub(club)}
                      >
                        {highlightMatch(club, clubQuery)}
                      </button>
                    ))
                  ) : (
                    <div className="club-empty">
                      No matching club. Use the “Add” option above.
                    </div>
                  )}
                </div>
              )}
            </div>

            {errors.rotaryClub && (
              <p className="error-text">{errors.rotaryClub}</p>
            )}
          </div>
        ) : (
          <div className="non-member-state field-reveal">
            <div>
              <strong>Non-member guest selected</strong>
              <span>Rotary club selection has been skipped.</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedClub("");
                setClubQuery("");
                setNotice(null);
              }}
            >
              Change
            </button>
          </div>
        )}

        <div className="form-row field-reveal">
          <FieldLabel>BUDDY SYSTEM</FieldLabel>
          <p className="helper-text">
            Optional — add your group and the person who encouraged you to
            attend.
          </p>
        </div>

        <FloatingInput
          className="field-reveal"
          id="buddy-group"
          label="Buddy group (optional)"
          value={buddyGroup}
          onChange={(value) => {
            setBuddyGroup(value.toUpperCase());
            setNotice(null);
          }}
          icon={<PeopleIcon />}
          helper="Saved in uppercase and submitted as CLUB | GROUP"
          autoComplete="organization"
        />

        <FloatingInput
          className="field-reveal"
          id="invited-by"
          label="Who invited or encouraged you? (optional)"
          value={invitedBy}
          onChange={(value) => {
            setInvitedBy(value);
            setNotice(null);
          }}
          icon={<UserIcon />}
          helper="This credits the person who brought or encouraged attendance"
          autoComplete="name"
        />

        <div className="form-row field-reveal">
          <FieldLabel>ROTARIAN CLASSIFICATION</FieldLabel>

          <div className="chips">
            {classifications.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip ${classification === item ? "selected" : ""}`}
                onClick={() => {
                  setClassification(item);
                  setNotice(null);
                }}
              >
                {classification === item && <i />}
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row field-reveal">
          <FieldLabel required>PURPOSE OF VISIT</FieldLabel>

          <div className="purpose-grid">
            {purposeOptions.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`purpose-card ${purpose === item.key ? "selected" : ""}`}
                onClick={() => {
                  setPurpose(item.key);
                  setNotice(null);
                  setErrors((current) => ({
                    ...current,
                    purpose: undefined,
                    otherPurpose: undefined,
                  }));
                }}
              >
                <span className="purpose-icon">{item.icon}</span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>

          {errors.purpose && <p className="error-text">{errors.purpose}</p>}

          <div className={`other-field ${purpose === "Other" ? "show" : ""}`}>
            <textarea
              value={otherPurpose}
              onChange={(event) => {
                setOtherPurpose(event.target.value);
                setNotice(null);
                setErrors((current) => ({
                  ...current,
                  otherPurpose: undefined,
                }));
              }}
              placeholder="Describe your purpose..."
              rows={3}
            />

            {errors.otherPurpose && (
              <p className="error-text">{errors.otherPurpose}</p>
            )}
          </div>
        </div>

        {notice && (
          <div
            className={`form-notice ${notice.type}`}
            role={notice.type === "error" ? "alert" : "status"}
          >
            <strong>{notice.title}</strong>
            <span>{notice.message}</span>
          </div>
        )}

        <button
          className={`submit-button ${loading ? "loading" : ""}`}
          type="submit"
          disabled={loading}
        >
          <span>{loading ? "Checking in..." : "Complete Check-In"}</span>
          <i aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function SuccessState({
  submission,
  onReset,
}: {
  submission: AttendanceSubmission;
  onReset: () => void;
}) {
  return (
    <div className="registration-card success-card">
      <div className="success-brand success-brand-celebrate" aria-hidden="true">
        <RotaryWheelIcon />
      </div>

      <svg className="success-check" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="28" />
        <path d="M24 37.5 32.5 46 50 27" />
      </svg>

      <h2>Check-in Complete</h2>
      <p>{submission.fullName}</p>

      <div className="success-event">
        {submission.event} ·{" "}
        {displayDate(submission.attendanceDate || submission.date)}
      </div>
      <div className="success-event">{submission.rotaryClub}</div>

      {submission.invitedBy && (
        <p className="helper-text">
          Attendance credited to {submission.invitedBy}.
        </p>
      )}

      <button type="button" onClick={onReset}>
        Check in another guest
      </button>
    </div>
  );
}

function FloatingInput({
  id,
  label,
  value,
  onChange,
  icon,
  error,
  helper,
  className = "",
  type = "text",
  autoComplete,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  error?: string;
  helper?: string;
  className?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className={`form-row ${className}`}>
      <label
        className={`floating-field ${value ? "has-value" : ""}`}
        htmlFor={id}
      >
        <span className="input-icon">{icon}</span>

        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder=" "
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
        />

        <span>{label}</span>
      </label>

      {helper && !error && <p className="helper-text">{helper}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <p className="field-label">
      {children} {required && <span>*</span>}
    </p>
  );
}

function SplashScreen() {
  return (
    <div className="splash">
      <div className="splash-wheel-wrap">
        <RotaryWheelOutline className="splash-wheel splash-wheel-base" />
        <RotaryWheelIcon className="splash-wheel splash-wheel-color" />
      </div>

      <div className="splash-copy">
        <RotaryWordmarkLogo className="splash-brand-logo" />

        <span>ROTARY CLUB OF</span>
        <h1>Nakawa</h1>
        <i />
        <p>Fellowship & Event Attendance</p>
      </div>
    </div>
  );
}

function Nav({ onRegister }: { onRegister: () => void }) {
  return (
    <nav className="nav">
      <a href="#welcome" className="nav-brand">
        <span className="brand-rotary-word">Rotary</span>
        <RotaryWheelIcon className="nav-wheel" />
        <span className="club-chip">Nakawa</span>
      </a>

      <div className="nav-links">
        <a className="active" href="#welcome">
          Welcome
        </a>

        <button type="button" onClick={onRegister}>
          Check In
        </button>

        <a href="/admin">Admin</a>
      </div>

      <button type="button" className="nav-cta" onClick={onRegister}>
        Check In
      </button>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer" id="venue">
      <RotaryWordmarkLogo className="footer-logo" />

      <h2>Rotary Club of Nakawa</h2>
      <p>Weekly Monday Fellowship · Events · Guest Attendance</p>
      <p>Returning guests can check in with email or phone.</p>

      <a
        className="footer-powered"
        href="https://baseight.com"
        target="_blank"
        rel="noreferrer"
      >
        Powered by Baseight Developers
      </a>
    </footer>
  );
}

function RotaryWordmarkLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 593.15 222.86"
      className={`rotary-wordmark ${className}`}
      role="img"
      aria-label="Rotary logo"
    >
      <path d={ROTARY_BLUE_PATH} fill="#17458f" />
      <path d={ROTARY_WHEEL_OUTER_PATH} fill="#f7a81b" />
      <path d={ROTARY_WHEEL_INNER_PATH} fill="#f7a81b" />
    </svg>
  );
}

function RotaryWheelIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="370 0 223.15 222.86"
      className={`rotary-wheel-icon ${className}`}
      role="img"
      aria-label="Rotary wheel icon"
    >
      <path d={ROTARY_WHEEL_OUTER_PATH} fill="#f7a81b" />
      <path d={ROTARY_WHEEL_INNER_PATH} fill="#f7a81b" />
    </svg>
  );
}

function RotaryWheelOutline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="370 0 223.15 222.86"
      className={`rotary-wheel-outline ${className}`}
      role="img"
      aria-label="Rotary wheel outline"
    >
      <path
        d={ROTARY_WHEEL_OUTER_PATH}
        fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.2"
      />
      <path
        d={ROTARY_WHEEL_INNER_PATH}
        fill="rgba(255,255,255,0.12)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />
    </svg>
  );
}

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function UserIcon() {
  return (
    <IconSvg>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </IconSvg>
  );
}

function MailIcon() {
  return (
    <IconSvg>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </IconSvg>
  );
}

function SearchIcon() {
  return (
    <IconSvg>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconSvg>
  );
}

function ArrowRightIcon() {
  return (
    <IconSvg>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconSvg>
  );
}

function CrownIcon() {
  return (
    <IconSvg>
      <path d="m4 8 4.2 3.7L12 5l3.8 6.7L20 8l-1.4 9.5H5.4L4 8Z" />
      <path d="M6 20h12" />
    </IconSvg>
  );
}

function PeopleIcon() {
  return (
    <IconSvg>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M14.5 16.5A4.5 4.5 0 0 1 21 20" />
    </IconSvg>
  );
}

function HeartIcon() {
  return (
    <IconSvg>
      <path d="M20.4 5.7a5.3 5.3 0 0 0-7.5 0l-.9.9-.9-.9a5.3 5.3 0 1 0-7.5 7.5l.9.9L12 21l7.5-6.9.9-.9a5.3 5.3 0 0 0 0-7.5Z" />
    </IconSvg>
  );
}

function MessageIcon() {
  return (
    <IconSvg>
      <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5H6.8L3 22l1.4-3.6A8.5 8.5 0 1 1 21 12Z" />
      <path d="M8 11.5h8" />
      <path d="M8 15h5.5" />
    </IconSvg>
  );
}
