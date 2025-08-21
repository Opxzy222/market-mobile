module.exports = {
  dependencies: {
    '@react-native-community/datetimepicker': {
      platforms: {
        android: {
          sourceDir: './node_modules/@react-native-community/datetimepicker/android',
          packageImportPath: 'com.reactnativecommunity.datetimepicker',
          packageInstance: 'new RNDateTimePickerPackage()',
          codegenConfig: null // Disable codegen
        }
      }
    }
  }
};