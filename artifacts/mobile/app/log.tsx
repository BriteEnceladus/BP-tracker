import { Redirect } from 'expo-router';

/** Deep link target for `bptracker://log` (home-screen widget). */
export default function LogDeepLink() {
  return <Redirect href="/(tabs)/log" />;
}
