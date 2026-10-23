// Expo config plugin: keeps CMake object-file paths under the Windows MAX_PATH
// limit (260 chars). Without it the native build fails on Windows with
// "ninja: error: ... Filename longer than 260 characters".
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// gymtracker: short object paths';
const BLOCK = `
    ${MARKER}
    externalNativeBuild {
      cmake {
        arguments "-DCMAKE_OBJECT_PATH_MAX=255"
      }
    }
`;

module.exports = function withShortObjectPaths(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    src = src.replace(/defaultConfig \{\n/, (m) => m + BLOCK);
    cfg.modResults.contents = src;
    return cfg;
  });
};
