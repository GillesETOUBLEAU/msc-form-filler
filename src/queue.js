import { MAX_CONCURRENCY, log } from "./config.js";

// ---------------------------------------------------------------------------
// Semaphore-based concurrency limiter
// ---------------------------------------------------------------------------

let active = 0;
const waiting = [];
const inFlight = new Set(); // track contact IDs currently being processed

function acquire() {
  if (active < MAX_CONCURRENCY) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  active--;
  if (waiting.length > 0) {
    active++;
    waiting.shift()();
  }
}

/**
 * Enqueue a contact for processing.
 * Returns immediately — processing happens in background.
 * @param {object} contact - row from msc_newsletter_contacts
 * @param {function} processFn - async (contact) => void
 */
export function enqueue(contact, processFn) {
  // Skip if already in flight (dedup for Realtime + polling overlap)
  if (inFlight.has(contact.id)) {
    log(`  Skipping ${contact.email} (already in flight)`);
    return;
  }

  inFlight.add(contact.id);

  // Fire and forget — errors are handled inside processFn
  acquire().then(async () => {
    try {
      await processFn(contact);
    } finally {
      inFlight.delete(contact.id);
      release();
    }
  });
}

/** Wait for all in-flight contacts to finish */
export function waitForDrain() {
  if (inFlight.size === 0) return Promise.resolve();
  log(`Waiting for ${inFlight.size} in-flight contact(s) to finish...`);
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (inFlight.size === 0) {
        clearInterval(check);
        resolve();
      }
    }, 500);
  });
}

/** Number of contacts currently being processed */
export function activeCount() {
  return inFlight.size;
}
