
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to xcodeproj
const projectPath = path.join(__dirname, 'App.xcodeproj');
const pbxprojPath = path.join(projectPath, 'project.pbxproj');
const buildConfigPath = path.join(__dirname, 'App', 'build.xcconfig');

console.log('Ensuring build.xcconfig exists and has correct settings...');
if (fs.existsSync(buildConfigPath)) {
  console.log('build.xcconfig found, verifying contents...');
  let configContent = fs.readFileSync(buildConfigPath, 'utf8');
  const requiredSettings = [
    'PROVISIONING_PROFILE_SPECIFIER = "Appp"',
    'DEVELOPMENT_TEAM = TN748MMP9M',
    'CODE_SIGN_IDENTITY = Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)',
    'CODE_SIGN_STYLE = Manual',
    'PRODUCT_BUNDLE_IDENTIFIER = com.velpuri.app'
  ];
  
  let needsUpdate = false;
  for (const setting of requiredSettings) {
    if (!configContent.includes(setting)) {
      needsUpdate = true;
      break;
    }
  }
  
  if (needsUpdate) {
    console.log('Updating build.xcconfig with required settings...');
    fs.writeFileSync(buildConfigPath, 
`// Provisioning profile configuration
PROVISIONING_PROFILE_SPECIFIER = "Appp"
DEVELOPMENT_TEAM = TN748MMP9M
CODE_SIGN_IDENTITY = Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)
CODE_SIGN_STYLE = Manual

// Bundle identifier should match what's in capacitor.config.ts
PRODUCT_BUNDLE_IDENTIFIER = com.velpuri.app

// Include build.xcconfig in Xcode project
#include? "Pods/Target Support Files/Pods-App/Pods-App.debug.xcconfig"
#include? "Pods/Target Support Files/Pods-App/Pods-App.release.xcconfig"
`);
  }
} else {
  console.log('Creating build.xcconfig...');
  fs.writeFileSync(buildConfigPath, 
`// Provisioning profile configuration
PROVISIONING_PROFILE_SPECIFIER = "Appp"
DEVELOPMENT_TEAM = TN748MMP9M
CODE_SIGN_IDENTITY = Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)
CODE_SIGN_STYLE = Manual

// Bundle identifier should match what's in capacitor.config.ts
PRODUCT_BUNDLE_IDENTIFIER = com.velpuri.app

// Include build.xcconfig in Xcode project
#include? "Pods/Target Support Files/Pods-App/Pods-App.debug.xcconfig"
#include? "Pods/Target Support Files/Pods-App/Pods-App.release.xcconfig"
`);
}

// Check if build.xcconfig is already referenced in pbxproj
console.log('Checking if build.xcconfig is referenced in Xcode project...');
const pbxproj = fs.existsSync(pbxprojPath) ? fs.readFileSync(pbxprojPath, 'utf8') : '';
const hasBuildConfig = pbxproj.includes('build.xcconfig');

// Apply the build settings directly with xcodebuild
console.log('Applying build settings via command line...');
try {
  // Set provisioning profile specifier for both Debug and Release configurations
  execSync(`/usr/libexec/PlistBuddy -c "Add :buildSettings:PROVISIONING_PROFILE_SPECIFIER string Appp" ${projectPath}/project.pbxproj || true`, { stdio: 'inherit' });
  execSync(`xcodebuild -project ${projectPath} -scheme App -configuration Debug PROVISIONING_PROFILE_SPECIFIER="Appp" CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)" DEVELOPMENT_TEAM=TN748MMP9M build -showBuildSettings || true`, { stdio: 'inherit' });
  execSync(`xcodebuild -project ${projectPath} -scheme App -configuration Release PROVISIONING_PROFILE_SPECIFIER="Appp" CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution: Velpuri Enterprises Inc. (TN748MMP9M)" DEVELOPMENT_TEAM=TN748MMP9M build -showBuildSettings || true`, { stdio: 'inherit' });
} catch (error) {
  console.error('Warning: Command failed, but continuing:', error.message);
}

if (!hasBuildConfig) {
  console.log('build.xcconfig not found in project. For full integration:');
  console.log('1. Open the Xcode project: ios/App/App.xcodeproj');
  console.log('2. Select the project in the Navigator');
  console.log('3. Select the "App" target');
  console.log('4. Go to the "Build Settings" tab');
  console.log('5. At the top right, click "Add Build Setting" and select "Add User-Defined Setting"');
  console.log('6. Name it "XCCONFIG_FILE" and set the value to "$(SRCROOT)/App/build.xcconfig"');
  console.log('7. Under "Build Options", set "Use Build Config From" to "build.xcconfig"');
}

// Direct modification to ensure bundle ID is set
try {
  console.log('Setting bundle ID in Info.plist...');
  const infoPlistPath = path.join(__dirname, 'App', 'Info.plist');
  if (fs.existsSync(infoPlistPath)) {
    execSync(`/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.velpuri.app" ${infoPlistPath}`, { stdio: 'inherit' });
  }
} catch (error) {
  console.error('Warning: Failed to set bundle ID in Info.plist:', error.message);
}

console.log('Build configuration update completed.');
