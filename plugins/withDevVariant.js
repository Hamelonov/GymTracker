// Config-плагин Expo: debug-сборка (разработческая) получает собственный application id
// (".dev") и имя в лаунчере «GymTracker Dev», поэтому ставится рядом с
// release-сборкой, у которой обычный id и имя «GymTracker».
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
      // Debug source set переопределяет app_name, не конфликтуя с основным strings.xml.
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
