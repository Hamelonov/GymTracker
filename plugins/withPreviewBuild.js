// Expo config plugin: when GYMTRACKER_PREVIEW=1 is set during prebuild, the
// release build gets its own application id (".preview") and launcher name, so
// it installs next to the development build instead of replacing it.
// Without the variable this plugin does nothing (normal release / F-Droid build).
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

const MARKER = '// gymtracker: preview release';

function withPreviewGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    src = src.replace(/(buildTypes \{[\s\S]*?\n(\s*)release \{\n)/, (m, _all, ws) => `${m}${ws}    ${MARKER}\n${ws}    applicationIdSuffix ".preview"\n`);
    cfg.modResults.contents = src;
    return cfg;
  });
}

function withPreviewName(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'release', 'res', 'values');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'strings.xml'),
        '<resources>\n  <string name="app_name">GymTracker Preview</string>\n</resources>\n',
      );
      return cfg;
    },
  ]);
}

module.exports = function withPreviewBuild(config) {
  if (process.env.GYMTRACKER_PREVIEW !== '1') return config;
  return withPreviewName(withPreviewGradle(config));
};
