// Config-плагин Expo для сборки Android: удерживает пути объектных файлов `CMake` в пределах
// лимита Windows MAX_PATH (260 символов). Без него нативная сборка на
// Windows падает с «Filename longer than 260 characters» (приложение) или
// «mkdir(...): No such file or directory» (библиотеки).
const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// gymtracker: build tweaks';
const CMAKE_ARGUMENT = '-DCMAKE_OBJECT_PATH_MAX=255';

const APP_BLOCK = `
    ${MARKER}
    externalNativeBuild {
      cmake {
        arguments "${CMAKE_ARGUMENT}"
      }
    }
`;

const ROOT_BLOCK = `
${MARKER}
subprojects { subproject ->
  subproject.plugins.withId('com.android.library') {
    subproject.android.defaultConfig.externalNativeBuild.cmake.arguments.add("${CMAKE_ARGUMENT}")
  }
}
`;

function withApp(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    const buildGradleSource = config.modResults.contents;
    if (buildGradleSource.includes(MARKER)) return config;
    config.modResults.contents = buildGradleSource.replace(
      /defaultConfig \{\n/,
      (match) => match + APP_BLOCK,
    );
    return config;
  });
}

function withRoot(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    const buildGradleSource = config.modResults.contents;
    if (buildGradleSource.includes(MARKER)) return config;
    config.modResults.contents = buildGradleSource + ROOT_BLOCK;
    return config;
  });
}

module.exports = function withShortObjectPaths(config) {
  return withRoot(withApp(config));
};
