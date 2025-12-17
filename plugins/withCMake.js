const { withDangerousMod } = require('@expo/config-plugins');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function withCMake(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildscriptPath = path.join(config.modRequest.platformProjectRoot, '..', 'buildscript-src');
      if (!fs.existsSync(buildscriptPath)) {
        fs.mkdirSync(buildscriptPath, { recursive: true });
      }

      // Create a shell script that runs during build
      const scriptPath = path.join(buildscriptPath, 'install-cmake.sh');
      fs.writeFileSync(
        scriptPath,
        `#!/bin/bash
apt-get update -y
apt-get install -y cmake
echo "CMake installed successfully"
`
      );

      // Make it executable
      execSync(`chmod +x "${scriptPath}"`);

      // Run it
      console.log('Installing CMake...');
      execSync(scriptPath, { stdio: 'inherit' });

      return config;
    },
  ]);
};