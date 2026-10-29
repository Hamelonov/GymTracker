// Дополняет app.json тем, что зависит от сборки.
// Канал обновлений по воздуху: свой телефон получает каждую правку («preview»),
// сборки для друзей — только проверенные обновления («production»).
// Сборка для друзей: APP_UPDATE_CHANNEL=production перед командой сборки.
const updateChannel = process.env.APP_UPDATE_CHANNEL ?? 'preview';

module.exports = ({ config }) => ({
  ...config,
  updates: {
    ...config.updates,
    requestHeaders: { 'expo-channel-name': updateChannel },
  },
});
