// RideLine configuration. Keep secrets out of git: the build workflow fills this
// file from the TOMTOM_API_KEY repository secret. A key typed in the app's Safety
// tab (stored only on that phone) takes priority.
window.RIDE_CONFIG = window.RIDE_CONFIG || { tomtomKey: '' };
