// Extends app.json with values that come from the environment (EAS env / local shell).
// OS_APPID_STARGAZE is the OneSignal App ID; it is never committed.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    oneSignalAppId: process.env.OS_APPID_STARGAZE ?? process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '',
  },
});
