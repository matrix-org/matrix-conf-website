import assert from "node:assert/strict";
import { test } from "node:test";
import { midpoint, niceLength } from "./geo.ts";
import { chain } from "./route.ts";

const line = (...lons: number[]) => lons.map((lon) => ({ lat: 0, lon }));

test("chain joins lines that are given in the wrong order and direction", () => {
    const joined = chain([line(0, 1), line(3, 2), line(1, 2)]);
    assert.deepEqual(
        joined.map((point) => point.lon),
        [0, 1, 2, 3],
    );
});

test("midpoint is halfway along the line, not between its ends", () => {
    const bend = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
    ];
    assert.deepEqual(midpoint(bend), { x: 10, y: 0 });
});

test("niceLength picks 1, 2 or 5 times a power of ten that fits", () => {
    assert.equal(niceLength(7300), 5000);
    assert.equal(niceLength(2400), 2000);
    assert.equal(niceLength(130), 100);
    assert.equal(niceLength(10), 10);
});
