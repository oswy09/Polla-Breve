/**
 * Mapeo de nombres de equipos: football-data.org → nombres en nuestra BD.
 *
 * football-data.org usa nombres en inglés. Nuestra BD usa los nombres como
 * los insertamos en el seed (mezcla español/inglés).
 *
 * Agrega aquí cualquier nombre que no matchee automáticamente.
 */
export const TEAM_MAP: Record<string, string> = {
  // ── Hosts ──────────────────────────────────────────────
  "United States":          "USA",
  "USA":                    "USA",
  "Canada":                 "Canadá",
  "Mexico":                 "México",

  // ── CONMEBOL ───────────────────────────────────────────
  "Argentina":              "Argentina",
  "Brazil":                 "Brasil",
  "Colombia":               "Colombia",
  "Uruguay":                "Uruguay",
  "Ecuador":                "Ecuador",
  "Chile":                  "Chile",
  "Venezuela":              "Venezuela",
  "Paraguay":               "Paraguay",
  "Bolivia":                "Bolivia",
  "Peru":                   "Perú",

  // ── UEFA ───────────────────────────────────────────────
  "France":                 "Francia",
  "Spain":                  "España",
  "England":                "Inglaterra",
  "Germany":                "Alemania",
  "Portugal":               "Portugal",
  "Netherlands":            "Países Bajos",
  "Belgium":                "Bélgica",
  "Italy":                  "Italia",
  "Croatia":                "Croacia",
  "Switzerland":            "Suiza",
  "Denmark":                "Dinamarca",
  "Serbia":                 "Serbia",
  "Poland":                 "Polonia",
  "Austria":                "Austria",
  "Turkey":                 "Turquía",
  "Scotland":               "Escocia",
  "Ukraine":                "Ucrania",
  "Slovakia":               "Eslovenia",   // ajusta si es Slovakia vs Slovenia
  "Slovenia":               "Eslovenia",
  "Hungary":                "Hungría",
  "Albania":                "Albania",

  // ── CAF ────────────────────────────────────────────────
  "Morocco":                "Marruecos",
  "Senegal":                "Senegal",
  "Nigeria":                "Nigeria",
  "Ivory Coast":            "Costa de Marfil",
  "Côte d'Ivoire":          "Costa de Marfil",
  "Egypt":                  "Egipto",
  "South Africa":           "Sudáfrica",
  "Algeria":                "Argelia",
  "Tunisia":                "Túnez",
  "Cameroon":               "Camerún",
  "Ghana":                  "Ghana",

  // ── AFC ────────────────────────────────────────────────
  "Japan":                  "Japón",
  "South Korea":            "Corea del Sur",
  "Korea Republic":         "Corea del Sur",
  "Australia":              "Australia",
  "Iran":                   "Irán",
  "Saudi Arabia":           "Arabia Saudita",
  "Qatar":                  "Qatar",
  "Iraq":                   "Irak",
  "Jordan":                 "Jordania",

  // ── CONCACAF (no hosts) ────────────────────────────────
  "Panama":                 "Panamá",
  "Jamaica":                "Jamaica",
  "Honduras":               "Honduras",
  "Costa Rica":             "Costa Rica",
  "El Salvador":            "El Salvador",

  // ── OFC ────────────────────────────────────────────────
  "New Zealand":            "Nueva Zelanda",
};

/**
 * Devuelve el nombre normalizado para nuestra BD.
 * Si no hay mapeo exacto, intenta coincidencia parcial.
 * Si sigue sin encontrar, devuelve el nombre original (para que el admin lo vea).
 */
export function normalizeTeamName(apiName: string): string {
  if (TEAM_MAP[apiName]) return TEAM_MAP[apiName];

  // Coincidencia parcial (ignora mayúsculas)
  const lower = apiName.toLowerCase();
  for (const [key, val] of Object.entries(TEAM_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }

  return apiName; // fallback: usa el nombre de la API tal cual
}
