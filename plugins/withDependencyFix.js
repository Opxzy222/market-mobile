const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

const withDependencyFix = (config) => {
  // Modify project/build.gradle
  config = withProjectBuildGradle(config, async (config) => {
    let contents = config.modResults.contents;
    const dependency = `
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.2'
    }
}
`;
    if (!contents.includes('com.google.gms:google-services')) {
      contents += dependency;
    }
    config.modResults.contents = contents;
    return config;
  });

  // Modify app/build.gradle
  config = withAppBuildGradle(config, async (config) => {
    let contents = config.modResults.contents;
    const dependencies = `
dependencies {
    implementation platform('com.google.firebase:firebase-bom:33.1.0')
    implementation 'com.google.firebase:firebase-messaging:24.0.1'
}
`;
    const resolutionStrategy = `
configurations.all {
    resolutionStrategy {
        force 'androidx.core:core:1.13.1'
        force 'com.google.firebase:firebase-messaging:24.0.1'
        force 'com.google.firebase:firebase-bom:33.1.0'
        exclude group: 'com.android.support'
    }
}
`;
    if (!contents.includes('com.google.firebase:firebase-messaging')) {
      contents += dependencies;
    }
    if (!contents.includes('configurations.all')) {
      contents += resolutionStrategy;
    }
    if (!contents.includes('apply plugin: \'com.google.gms.google-services\'')) {
      contents = contents.replace(
        /apply plugin: 'com.android.application'/,
        `apply plugin: 'com.android.application'\napply plugin: 'com.google.gms.google-services'`
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withDependencyFix;