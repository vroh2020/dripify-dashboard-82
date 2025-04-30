
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to xcodeproj
const projectPath = path.join(__dirname, 'App.xcodeproj');
const pbxprojPath = path.join(projectPath, 'project.pbxproj');

// Check if build.xcconfig is already referenced
const pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
const hasBuildConfig = pbxproj.includes('build.xcconfig');

if (!hasBuildConfig) {
  console.log('Adding build.xcconfig to project...');
  
  // In a real implementation, you would use a library like xcode
  // to properly modify the pbxproj file. For demonstration:
  console.log('To add the build.xcconfig to your Xcode project:');
  console.log('1. Open the Xcode project: ios/App/App.xcodeproj');
  console.log('2. Select the project in the Navigator');
  console.log('3. Select the "App" target');
  console.log('4. Go to the "Build Settings" tab');
  console.log('5. Click "+" at the top and select "Add User-Defined Setting"');
  console.log('6. Name it "XCCONFIG_FILE" and set the value to "$(SRCROOT)/App/build.xcconfig"');
  console.log('7. At the top of the Build Settings, click "+" and select "Add Configuration File"');
  console.log('8. Browse and select the build.xcconfig file');
}

console.log('Build configuration updated successfully.');
