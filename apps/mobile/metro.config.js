const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Expo configures Metro for the monorepo automatically (SDK 52+).
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
