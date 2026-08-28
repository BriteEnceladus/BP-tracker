import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep link target for `bptracker://log` (home-screen widget). Forwards metric/id/gid. */
export default function LogDeepLink() {
  const params = useLocalSearchParams<{ id?: string; metric?: string; gid?: string }>();
  return <Redirect href={{ pathname: '/(tabs)/log', params }} />;
}
