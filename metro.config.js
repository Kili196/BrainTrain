const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

// Sentry's variant of Expo's default config: same Metro setup, plus a debug ID
// stamped into each bundle so a crash report can be matched to its source map
// and point at real lines instead of the minified bundle.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
