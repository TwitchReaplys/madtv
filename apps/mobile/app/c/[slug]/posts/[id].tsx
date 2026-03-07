import { Redirect, useLocalSearchParams } from "expo-router";

export default function CreatorPostAliasRoute() {
  const { id, slug } = useLocalSearchParams<{ id: string; slug: string }>();

  if (!id) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Redirect
      href={{
        pathname: "/post/[id]",
        params: {
          id,
          creatorSlug: slug,
        },
      }}
    />
  );
}
