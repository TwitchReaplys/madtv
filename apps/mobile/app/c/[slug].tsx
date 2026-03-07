import { Redirect, useLocalSearchParams } from "expo-router";

export default function CreatorAliasRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  if (!slug) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Redirect
      href={{
        pathname: "/creator/[slug]",
        params: {
          slug,
        },
      }}
    />
  );
}
