// Expo config plugin for the Android build: keeps CMake object-file paths under the Windows MAX_PATH limit (260 chars);
//     without it the native build fails on Windows with "Filename longer than
//     260 characters" (app) or "mkdir(...): No such file or directory" (libraries);
const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// gymtracker: build tweaks';
const CMAKE_ARG = '-DCMAKE_OBJECT_PATH_MAX=255';

const APP_BLOCK = `
    ${MARKER}
    externalNativeBuild {
      cmake {
        arguments "${CMAKE_ARG}"
      }
    }
`;

const ROOT_BLOCK = `
${MARKER}
subprojects { sp ->
  sp.plugins.withId('com.android.library') {
    sp.android.defaultConfig.externalNativeBuild.cmake.arguments.add("${CMAKE_ARG}")
  }
}
`;

function withApp(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    const src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    let out = src.replace(/defaultConfig \{\n/, (m) => m + APP_BLOCK);
    cfg.modResults.contents = out;
    return cfg;
  });
}

function withRoot(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    const src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    cfg.modResults.contents = src + ROOT_BLOCK;
    return cfg;
  });
}

module.exports = function withShortObjectPaths(config) {
  return withRoot(withApp(config));
};
