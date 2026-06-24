"use client";

import { useEffect, useState } from "react";

interface UseTypewriterOptions {
  /** ms delay between each typed character */
  typingSpeed?: number;
  /** ms delay between each deleted character */
  deletingSpeed?: number;
  /** ms to hold the fully-typed word before deleting it */
  pauseTime?: number;
}

/**
 * Classic typewriter effect — types a word out character by character,
 * pauses, deletes it, then moves on to the next word in the list (looping).
 *
 * Used for the header search box, cycling through service names so the
 * placeholder reads like "Search for AC Repair…", "Search for
 * Refrigerator Repair…", etc.
 */
export function useTypewriter(words: string[], options: UseTypewriterOptions = {}): string {
  const { typingSpeed = 55, deletingSpeed = 28, pauseTime = 1500 } = options;

  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!words.length) return;
    const current = words[wordIndex % words.length] ?? "";

    // Fully typed — hold, then start deleting.
    if (!deleting && text === current) {
      const hold = setTimeout(() => setDeleting(true), pauseTime);
      return () => clearTimeout(hold);
    }

    // Fully deleted — advance to the next word.
    if (deleting && text === "") {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % words.length);
      return;
    }

    const timeout = setTimeout(
      () => {
        setText((t) =>
          deleting ? current.slice(0, t.length - 1) : current.slice(0, t.length + 1)
        );
      },
      deleting ? deletingSpeed : typingSpeed
    );
    return () => clearTimeout(timeout);
  }, [text, deleting, wordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}
