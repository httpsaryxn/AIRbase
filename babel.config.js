module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // We keep reanimated because it's used for navigation and animations
      'react-native-reanimated/plugin', 
    ],
  };
};