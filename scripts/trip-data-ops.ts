import { createPool } from "@/db/client";
import {
  deleteTripData,
  exportTripData,
  parseTripDataOpsArgs,
} from "@/lib/ops/trip-data";

async function main() {
  const parsed = parseTripDataOpsArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.message);
    process.exitCode = 1;
    return;
  }

  const pool = createPool(parsed.databaseUrl);
  try {
    if (parsed.command === "export") {
      const result = await exportTripData(pool, {
        ownerId: parsed.ownerId,
        tripId: parsed.tripId,
        outputPath: parsed.outputPath,
        overwrite: parsed.overwrite,
      });
      if (!result.ok) {
        console.error(result.message);
        process.exitCode = 1;
        return;
      }
      console.log(`Export written to ${result.outputPath}`);
      console.log(`Counts: ${JSON.stringify(result.counts)}`);
      return;
    }

    const result = await deleteTripData(pool, {
      ownerId: parsed.ownerId,
      tripId: parsed.tripId,
      confirmTripId: parsed.confirmTripId,
    });
    if (!result.ok) {
      console.error(result.message);
      process.exitCode = 1;
      return;
    }
    console.log(`Deleted trip ${result.deletedTripId}`);
    console.log(`Counts: ${JSON.stringify(result.counts)}`);
  } finally {
    await pool.end();
  }
}

void main();
