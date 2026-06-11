import test from "node:test";

import { getDatabaseTestUrl } from "./env";

test("database test environment is configured", () => {
  getDatabaseTestUrl();
});
