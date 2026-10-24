// Expo config plugin: the debug (development) build gets its own application id
// (".dev") and the launcher name "GymTracker Dev", so it installs next to the
// release build, which keeps the plain id and the name "GymTracker".
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

const MARKER = '// gymtracker: dev variant';

function withDevGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    src = src.replace(/(buildTypes \{\s*\n(\s*)debug \{\n)/, (m, _all, ws) => `${m}${ws}    ${MARKER}\n${ws}    applicationIdSuffix ".dev"\n`);
    cfg.modResults.contents = src;
    return cfg;
  });
}

function withDevName(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      // A debug source set overrides app_name without clashing with the main strings.xml.
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'debug', 'res', 'values');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'strings.xml'), '<resources>\n  <string name="app_name">GymTracker Dev</string>\n</resources>\n');
      return cfg;
    },
  ]);
}

module.exports = function withDevVariant(config) {
  return withDevName(withDevGradle(config));
};
