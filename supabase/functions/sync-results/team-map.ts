/**
 * Mapeo de nombres de equipos: API externa → nombres exactos en nuestra BD.
 * La BD usa nombres en inglés tal como fueron insertados en el seed.
 */
export const TEAM_MAP: Record<string, string> = {
  // ── Hosts ──────────────────────────────────────────────
  "United States":                    "United States",
  "USA":                              "United States",
  "US":                               "United States",
  "Canada":                           "Canada",
  "Mexico":                           "Mexico",
  "México":                           "Mexico",

  // ── CONMEBOL ───────────────────────────────────────────
  "Argentina":                        "Argentina",
  "Brazil":                           "Brazil",
  "Brasil":                           "Brazil",
  "Colombia":                         "Colombia",
  "Uruguay":                          "Uruguay",
  "Ecuador":                          "Ecuador",
  "Chile":                            "Chile",
  "Venezuela":                        "Venezuela",
  "Paraguay":                         "Paraguay",
  "Bolivia":                          "Bolivia",
  "Peru":                             "Peru",
  "Perú":                             "Peru",

  // ── UEFA ───────────────────────────────────────────────
  "France":                           "France",
  "Spain":                            "Spain",
  "España":                           "Spain",
  "England":                          "England",
  "Germany":                          "Germany",
  "Alemania":                         "Germany",
  "Portugal":                         "Portugal",
  "Netherlands":                      "Netherlands",
  "Holland":                          "Netherlands",
  "Belgium":                          "Belgium",
  "Italy":                            "Italy",
  "Croatia":                          "Croatia",
  "Switzerland":                      "Switzerland",
  "Denmark":                          "Denmark",
  "Serbia":                           "Serbia",
  "Poland":                           "Poland",
  "Austria":                          "Austria",
  "Turkey":                           "Turkey",
  "Scotland":                         "Scotland",
  "Ukraine":                          "Ukraine",
  "Slovakia":                         "Slovakia",
  "Slovenia":                         "Slovenia",
  "Hungary":                          "Hungary",
  "Albania":                          "Albania",
  "Norway":                           "Norway",
  "Sweden":                           "Sweden",
  "Czech Republic":                   "Czech Republic",
  "Czechia":                          "Czech Republic",
  "Bosnia and Herzegovina":           "Bosnia and Herzegovina",
  "Bosnia & Herzegovina":             "Bosnia and Herzegovina",

  // ── CAF ────────────────────────────────────────────────
  "Morocco":                          "Morocco",
  "Marruecos":                        "Morocco",
  "Senegal":                          "Senegal",
  "Nigeria":                          "Nigeria",
  "Ivory Coast":                      "Ivory Coast",
  "Côte d'Ivoire":                    "Ivory Coast",
  "Cote d'Ivoire":                    "Ivory Coast",
  "Egypt":                            "Egypt",
  "South Africa":                     "South Africa",
  "Algeria":                          "Algeria",
  "Argelia":                          "Algeria",
  "Tunisia":                          "Tunisia",
  "Cameroon":                         "Cameroon",
  "Ghana":                            "Ghana",
  "Cape Verde":                       "Cape Verde",
  "Cabo Verde":                       "Cape Verde",
  "Democratic Republic of the Congo": "Democratic Republic of the Congo",
  "DR Congo":                         "Democratic Republic of the Congo",
  "Congo DR":                         "Democratic Republic of the Congo",
  "Haiti":                            "Haiti",

  // ── AFC ────────────────────────────────────────────────
  "Japan":                            "Japan",
  "South Korea":                      "South Korea",
  "Korea Republic":                   "South Korea",
  "Korea, Republic of":               "South Korea",
  "Australia":                        "Australia",
  "Iran":                             "Iran",
  "Saudi Arabia":                     "Saudi Arabia",
  "Qatar":                            "Qatar",
  "Iraq":                             "Iraq",
  "Jordan":                           "Jordan",
  "Uzbekistan":                       "Uzbekistan",

  // ── CONCACAF (no hosts) ────────────────────────────────
  "Panama":                           "Panama",
  "Jamaica":                          "Jamaica",
  "Honduras":                         "Honduras",
  "Costa Rica":                       "Costa Rica",
  "El Salvador":                      "El Salvador",
  "Curaçao":                          "Curaçao",
  "Curacao":                          "Curaçao",

  // ── OFC ────────────────────────────────────────────────
  "New Zealand":                      "New Zealand",
};

/**
 * Devuelve el nombre exacto como está en la BD.
 * Si no hay mapeo exacto, intenta coincidencia parcial ignorando mayúsculas.
 * Si sigue sin encontrar, devuelve el nombre original.
 */
export function normalizeTeamName(apiName: string): string {
  if (!apiName) return "";
  if (TEAM_MAP[apiName]) return TEAM_MAP[apiName];

  const lower = apiName.toLowerCase().trim();
  for (const [key, val] of Object.entries(TEAM_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }

  return apiName;
}
