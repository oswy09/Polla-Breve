/**
 * Scoring unit tests — run with: node src/lib/scoring.test.js
 * Verifies all point scenarios match the rules:
 *   3 pts = marcador exacto
 *   2 pts = ganador correcto o empate correcto
 *   1 pt  = un marcador parcial coincide
 *   0 pts = sin acierto
 */

function scorePrediction(predHome, predAway, realHome, realAway, rules) {
  const exact  = rules?.exact_result   ?? 3;
  const winner = rules?.correct_winner ?? 2;
  const draw   = rules?.correct_draw   ?? 2;

  if (predHome === realHome && predAway === realAway) return exact;

  const sign = (h, a) => (h === a ? 0 : h > a ? 1 : -1);

  if (sign(predHome, predAway) === sign(realHome, realAway)) {
    return sign(realHome, realAway) === 0 ? draw : winner;
  }

  if (predHome === realHome || predAway === realAway) return 1;

  return 0;
}

const RULES = { exact_result: 3, correct_winner: 2, correct_draw: 2 };

const cases = [
  // [predHome, predAway, realHome, realAway, expectedPts, description]
  [2, 1,  2, 1,  3, "Marcador exacto → 3 pts"],
  [0, 0,  0, 0,  3, "Empate exacto → 3 pts"],
  [3, 0,  3, 0,  3, "Goleada exacta → 3 pts"],
  [2, 1,  3, 1,  2, "Ganador correcto (marcador diferente) → 2 pts"],
  [2, 1,  4, 2,  2, "Ganador correcto (ambos diferentes) → 2 pts"],
  [1, 1,  2, 2,  2, "Empate correcto (diferente marcador) → 2 pts"],
  [0, 0,  3, 3,  2, "Empate correcto (0-0 vs 3-3) → 2 pts"],
  [2, 1,  2, 3,  1, "Local coincide, pierde en vez de ganar → 1 pt"],
  [1, 2,  3, 2,  1, "Visitante coincide, pierde en vez de ganar → 1 pt"],
  [2, 0,  2, 2,  1, "Local coincide, empate en vez de victoria → 1 pt"],
  [2, 1,  0, 3,  0, "Resultado opuesto → 0 pts"],
  [3, 1,  0, 2,  0, "Resultado opuesto diferente → 0 pts"],
  [1, 1,  2, 0,  0, "Empate predicho, victoria local real → 0 pts"],
  [2, 1,  1, 1,  1, "Victoria predicha, empate real, away coincide → 1 pt"],
  [0, 1,  2, 3,  2, "Visitante gana en ambos (0-1 y 2-3) → 2 pts ganador correcto"],
  [3, 1,  1, 2,  0, "Local gana predicho, visitante gana real, sin coincidencia → 0 pts"],
  [2, 0,  1, 3,  0, "Local gana predicho, visitante gana real, sin coincidencia 2 → 0 pts"],
];

let passed = 0;
let failed = 0;

for (const [pH, pA, rH, rA, expected, desc] of cases) {
  const got = scorePrediction(pH, pA, rH, rA, RULES);
  const ok = got === expected;
  if (ok) {
    passed++;
    console.log(`  ✓ ${desc}`);
  } else {
    failed++;
    console.error(`  ✗ ${desc}`);
    console.error(`    Pred ${pH}-${pA}  Real ${rH}-${rA}  esperado=${expected}  obtenido=${got}`);
  }
}

// Trivia: 0.5 pts per correct answer, accumulated
function triviaPoints(correctAnswers) {
  return correctAnswers * 0.5;
}

const triviaTests = [
  [1, 0.5,  "1 correcta → 0.5 pts"],
  [2, 1.0,  "2 correctas → 1.0 pts"],
  [4, 2.0,  "4 correctas → 2.0 pts"],
  [0, 0.0,  "0 correctas → 0.0 pts"],
];

console.log("\n--- Trivia ---");
for (const [n, expected, desc] of triviaTests) {
  const got = triviaPoints(n);
  const ok = got === expected;
  if (ok) { passed++; console.log(`  ✓ ${desc}`); }
  else     { failed++; console.error(`  ✗ ${desc} (obtenido=${got})`); }
}

// Total points example
console.log("\n--- Ejemplo ranking acumulado ---");
const examplePoints = scorePrediction(2,1,2,1,RULES) + scorePrediction(1,1,2,2,RULES) + triviaPoints(3);
console.log(`  Exacto(3) + Empate correcto(2) + Trivia×3(1.5) = ${examplePoints} pts  ${examplePoints === 6.5 ? "✓" : "✗ esperado 6.5"}`);
if (examplePoints === 6.5) passed++; else failed++;

console.log(`\n${"=".repeat(40)}`);
console.log(`Resultado: ${passed} pasaron, ${failed} fallaron`);
if (failed === 0) console.log("✅ Todo correcto");
else process.exit(1);
