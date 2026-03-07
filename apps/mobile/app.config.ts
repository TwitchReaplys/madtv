import type { ExpoConfig, ConfigContext } from "expo/config";

function getWebHost(appWebUrl: string) {
  try {
    return new URL(appWebUrl).hostname;
  } catch {
    return "app.example.com";
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appWebUrl = process.env.EXPO_PUBLIC_APP_WEB_URL ?? "https://app.example.com";
  const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? "myapp";
  const host = getWebHost(appWebUrl);

  return {
    ...config,
    name: "MadTV",
    slug: "madtv-mobile",
    scheme: appScheme,
    userInterfaceStyle: "automatic",
    orientation: "portrait",
    plugins: ["expo-router"],
    experiments: {
      typedRoutes: true,
    },
    ios: {
      supportsTablet: false,
      associatedDomains: [`applinks:${host}`],
      bundleIdentifier: "com.madtv.mobile",
    },
    android: {
      package: "com.madtv.mobile",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host,
              pathPrefix: "/c/",
            },
            {
              scheme: "https",
              host,
              pathPrefix: "/post/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    extra: {
      ...config.extra,
      appWebUrl,
      appScheme,
    },
  };
};
