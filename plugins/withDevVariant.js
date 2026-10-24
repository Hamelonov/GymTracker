// Expo config plugin: the debug (development) build gets its own application id
// (".dev") and the launcher name "GymTracker Dev", so it installs next to the
// release build, which keeps the plain id and the name "GymTracker".
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

const MARKER = '// gymtracker: dev variant';

function withDevGradle(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    let buildGradleSource = config.modResults.contents;
    if (buildGradleSource.includes(MARKER)) return config;
    buildGradleSource = buildGradleSource.replace(
      /(buildTypes \{\s*\n(\s*)debug \{\n)/,
      (match, _debugBlockStart, indentation) =>
        `${match}${indentation}    ${MARKER}\n${indentation}    applicationIdSuffix ".dev"\n`,
    );
    config.modResults.contents = buildGradleSource;
    return config;
  });
}

function withDevName(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      // A debug source set overrides app_name without clashing with the main strings.xml.
      const valuesDirectory = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'debug',
        'res',
        'values',
      );
      fs.mkdirSync(valuesDirectory, { recursive: true });
      fs.writeFileSync(
        path.join(valuesDirectory, 'strings.xml'),
        '<resources>\n  <string name="app_name">GymTracker Dev</string>\n</resources>\n',
      );
      return config;
    },
  ]);
}

module.exports = function withDevVariant(config) {
  return withDevName(withDevGradle(config));
};
