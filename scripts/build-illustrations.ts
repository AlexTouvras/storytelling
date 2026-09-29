/**
 * Writes the Rive illustrations from code. `--check` fails if a committed file
 * no longer matches what its model produces, which is how a re-freeze of the
 * book is caught before the illustration disagrees with the data.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildField } from "@/lib/sim/book-field";
import { buildHousehold, householdValues } from "@/illustrations/household";
import { buildGrid, gridValues } from "@/illustrations/grid";
import { buildCars } from "@/illustrations/cars";
import { buildRobot } from "@/illustrations/robot";

const check = process.argv.includes("--check");
const dir = join(process.cwd(), "src", "illustrations");

const featured = buildField().featured;
const robotFont = new Uint8Array(readFileSync(join(dir, "fonts", "Inter-subset.ttf")));
const files: Array<[string, Uint8Array, string]> = [
  ["household.riv", buildHousehold(householdValues(featured)), `for loan ${featured.id}`],
  ["grid.riv", buildGrid(gridValues()), "from the grid frequency model"],
  ["cars.riv", buildCars(), "three cars, one brake"],
  ["robot.riv", buildRobot(robotFont), "the AI field card character"],
];

let stale = 0;
for (const [name, bytes, why] of files) {
  const path = join(dir, name);
  if (check) {
    let current: Buffer | null = null;
    try {
      current = readFileSync(path);
    } catch {
      current = null;
    }
    if (!current || Buffer.compare(current, Buffer.from(bytes)) !== 0) {
      console.error(`${name} is stale — run npm run build:illustrations`);
      stale++;
    } else {
      console.log(`${name} ok (${bytes.length} bytes)`);
    }
  } else {
    writeFileSync(path, bytes);
    console.log(`wrote ${name} (${bytes.length} bytes) ${why}`);
  }
}
if (stale) process.exit(1);
