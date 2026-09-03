const regexps = [
    /(?:opt|pc|proy|ut)?[_.\-]?ut[_.\-]?([0-9]{1,2})\b/i,
    /(?:bloque|tema|fase|unidad|ut)\s*[:#_.\-]*\s*([0-9]{1,2})\b/i,
    /(?:r\.?a\.?|ra)\s*[:#_.\-]*\s*([0-9]{1,2})\b/i,
    /(?:crit|criterio|proy|opt|pc)[_.\-]?([0-9]{1,2})[a-z]?\b/i
];
function test(str) {
    for (const r of regexps) {
        const m = str.match(r);
        if (m) return parseInt(m[1], 10);
    }
    return null;
}
console.log("proy_1a", test("proy_1a"));
console.log("opt_crit1a", test("opt_crit1a"));
console.log("proy_ut2", test("proy_ut2"));
