// Flags for functionality that is built but not switched on yet.
//
// `appleSignIn` is off until there is an Apple developer account to register
// the Service ID / capability with — turning it on without that would just
// crash the native module. Flip it to `true` once that setup exists; the UI
// and the sign-in path are already wired behind this flag.
export const FEATURES = {
  appleSignIn: false,
} as const;
