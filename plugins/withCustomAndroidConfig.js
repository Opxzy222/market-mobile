const { withProjectBuildGradle, withAppBuildGradle, withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 1. Top-level build.gradle: Add QoreID Maven repos
const withQoreIdMavenRepos = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const content = config.modResults.contents;
      const qoreIdRepos = `
 // === QOREID REQUIRED REPOSITORIES ===
 maven { url "https://repo.qoreid.com/repository/maven-releases/" }
 maven { url 'https://jitpack.io' }
 // ===============================`;

      if (!content.includes('repo.qoreid.com')) {
        config.modResults.contents = content.replace(
          /repositories \{[^}]*\}/s,
          (match) => match.replace('}', `${qoreIdRepos}\n    }`)
        );
      }
    }
    return config;
  });
};

// 2. app/build.gradle: Add packagingOptions.useLegacyPackaging = true
const withLegacyPackaging = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const content = config.modResults.contents;
      if (!content.includes('useLegacyPackaging true')) {
        config.modResults.contents = content.replace(
          /packagingOptions \{/,
          `packagingOptions {
     jniLibs {
         useLegacyPackaging true   // REQUIRED FOR YOUR SETUP
     }`
        );
      }
    }
    return config;
  });
};

// 3. Apply your proguard-rules.pro (if you have custom rules)
// Save your ProGuard rules as proguard-rules.txt in project root
const withCustomProguard = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardFile = path.join(config.modRequest.projectRoot, 'proguard-rules.txt');
      const androidDir = path.join(config.modRequest.platformProjectRoot, 'app');
      const targetFile = path.join(androidDir, 'proguard-rules.pro');

      if (fs.existsSync(proguardFile)) {
        fs.mkdirSync(androidDir, { recursive: true });
        fs.copyFileSync(proguardFile, targetFile);
        console.log('Copied custom proguard-rules.pro');
      }
      return config;
    },
  ]);
};

module.exports = (config) => {
  config = withQoreIdMavenRepos(config);
  config = withLegacyPackaging(config);
  config = withCustomProguard(config);
  return config;
};