// RideLine configuration.
// TomTom key for live traffic and traffic-aware routing — added at the owner's request for testing.
// Replace it with a new key (restricted to your domain/app in the TomTom portal) before public release,
// or set the TOMTOM_API_KEY repository secret, which overrides this file in the APK build.
// A key typed in the app's Safety tab (stored only on that phone) takes priority.
// geminiKey: Google Gemini API key used by Nova for open questions (or set it in Nova → ⚙ on the phone).
window.RIDE_CONFIG = window.RIDE_CONFIG || {
  tomtomKey: 'czTfwgZE69WE2a6dOxWA25f96p5XX3Qx',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash'
};
