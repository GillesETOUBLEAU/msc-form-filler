import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, TABLE, log } from "./config.js";
import { enqueue, waitForDrain } from "./queue.js";
import { initBrowser, closeBrowser, processContact } from "./worker.js";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRAIN_ONLY = args.includes("--drain-only");
const DRY_RUN = args.includes("--dry-run");
const HEADED = args.includes("--headed");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Wrapper that binds supabase to processContact
  const process_ = (contact) => processContact(supabase, contact);

  // --- Startup drain: pick up pending + processing (crash recovery) ---
  const { data: pending, error: fetchErr } = await supabase
    .from(TABLE)
    .select("*")
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: true });

  if (fetchErr) {
    console.error("Supabase fetch error:", fetchErr.message);
    process.exit(1);
  }

  if (pending && pending.length > 0) {
    log(`Startup drain: ${pending.length} contact(s) to process.`);

    if (DRY_RUN) {
      for (const c of pending) {
        log(`[DRY-RUN] Would process: ${c.prenom} ${c.nom} <${c.email}>`);
      }
      if (DRAIN_ONLY) return;
    } else {
      await initBrowser(HEADED);
      for (const contact of pending) {
        enqueue(contact, process_);
      }
    }
  } else {
    log("No pending contacts at startup.");
    if (!DRY_RUN) await initBrowser(HEADED);
  }

  // If drain-only mode, wait for completion and exit
  if (DRAIN_ONLY) {
    await waitForDrain();
    await closeBrowser();
    log("Drain complete. Exiting.");
    return;
  }

  if (DRY_RUN) {
    log("[DRY-RUN] Listening mode skipped.");
    return;
  }

  // --- Realtime subscription: listen for new INSERTs ---
  const channel = supabase
    .channel("msc-inserts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: TABLE },
      (payload) => {
        log(`Realtime: new contact ${payload.new.email}`);
        enqueue(payload.new, process_);
      }
    )
    .subscribe((status) => {
      log(`Realtime subscription: ${status}`);
    });

  // --- Polling fallback: catch anything missed by Realtime (every 60s) ---
  const pollInterval = setInterval(async () => {
    const { data } = await supabase
      .from(TABLE)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      log(`Poll: found ${data.length} pending contact(s).`);
      for (const contact of data) {
        enqueue(contact, process_);
      }
    }
  }, 60_000);

  log("Worker running. Listening for new contacts...");

  // --- Graceful shutdown ---
  const shutdown = async (signal) => {
    log(`${signal} received. Shutting down gracefully...`);
    clearInterval(pollInterval);
    supabase.removeChannel(channel);
    await waitForDrain();
    await closeBrowser();
    log("Shutdown complete.");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
