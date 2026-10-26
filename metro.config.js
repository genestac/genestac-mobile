// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude native Android and iOS build artifacts from Metro file watcher
config.resolver.blockList = [
  /.*\/android\/build\/.*/,
  /.*\/android\/app\/build\/.*/,
  /.*\/android\/app\/\.cxx\/.*/,
  /.*\/ios\/build\/.*/,
  /.*\/node_modules\/.*\/android\/build\/.*/,
];

module.exports = config;
