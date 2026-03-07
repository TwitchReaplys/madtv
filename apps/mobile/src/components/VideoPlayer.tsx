import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ResizeMode, Video, type AVPlaybackStatus, type AVPlaybackStatusSuccess } from "expo-av";
import { radius, spacing, withAlpha } from "@madtv/ui";

import { formatRelativeSeconds } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";

type VideoPlayerProps = {
  libraryId: string;
  videoId: string;
  title: string;
  initialPositionSeconds?: number;
  onProgress?: (positionSeconds: number, durationSeconds: number | null) => void;
  onStarted?: () => void;
  onCompleted?: () => void;
};

function isStatusLoaded(status: AVPlaybackStatus): status is AVPlaybackStatusSuccess {
  return status.isLoaded;
}

export function VideoPlayer({
  libraryId,
  videoId,
  title,
  initialPositionSeconds = 0,
  onProgress,
  onStarted,
  onCompleted,
}: VideoPlayerProps) {
  const { theme } = useAppTheme();
  const videoRef = useRef<Video>(null);
  const startedRef = useRef(false);
  const lastPersistedRef = useRef(0);
  const hasSeekedToResumeRef = useRef(false);

  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamUrl = useMemo(() => `https://vz-${libraryId}.b-cdn.net/${videoId}/playlist.m3u8`, [libraryId, videoId]);

  const handlePlaybackStatus = useCallback(
    (nextStatus: AVPlaybackStatus) => {
      setStatus(nextStatus);

      if (!isStatusLoaded(nextStatus)) {
        return;
      }

      if (!hasSeekedToResumeRef.current && initialPositionSeconds > 3 && nextStatus.durationMillis) {
        hasSeekedToResumeRef.current = true;
        void videoRef.current?.setPositionAsync(Math.min(initialPositionSeconds * 1000, nextStatus.durationMillis - 1500));
      }

      if (nextStatus.isPlaying && !startedRef.current) {
        startedRef.current = true;
        onStarted?.();
      }

      const currentSeconds = Math.floor(nextStatus.positionMillis / 1000);
      const durationSeconds = nextStatus.durationMillis ? Math.floor(nextStatus.durationMillis / 1000) : null;

      if (currentSeconds - lastPersistedRef.current >= 5) {
        lastPersistedRef.current = currentSeconds;
        onProgress?.(currentSeconds, durationSeconds);
      }

      if (nextStatus.didJustFinish) {
        onProgress?.(durationSeconds ?? currentSeconds, durationSeconds);
        onCompleted?.();
      }
    },
    [initialPositionSeconds, onCompleted, onProgress, onStarted],
  );

  const loadedStatus = isStatusLoaded(status as AVPlaybackStatus) ? (status as AVPlaybackStatusSuccess) : null;
  const isPlaying = Boolean(loadedStatus?.isPlaying);
  const positionSeconds = loadedStatus ? Math.floor(loadedStatus.positionMillis / 1000) : 0;
  const durationSeconds = loadedStatus?.durationMillis ? Math.floor(loadedStatus.durationMillis / 1000) : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: withAlpha(theme.surface, 0.96),
          borderColor: withAlpha(theme.border, 0.65),
        },
      ]}
    >
      <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>
        {title}
      </Text>
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: streamUrl }}
        onPlaybackStatusUpdate={handlePlaybackStatus}
        onError={(nativeError) => setError(String(nativeError))}
        useNativeControls={false}
        resizeMode={ResizeMode.CONTAIN}
      />

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      <View style={styles.controls}>
        <Pressable
          onPress={() => {
            if (!loadedStatus) {
              return;
            }

            if (loadedStatus.isPlaying) {
              void videoRef.current?.pauseAsync();
              return;
            }

            void videoRef.current?.playAsync();
          }}
          style={({ pressed }) => [
            styles.button,
            {
              borderColor: withAlpha(theme.border, 0.75),
              backgroundColor: withAlpha(theme.surfaceElevated, 0.9),
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: theme.textPrimary }]}>{isPlaying ? "Pause" : "Play"}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!loadedStatus) {
              return;
            }

            void videoRef.current?.setPositionAsync(Math.max(0, loadedStatus.positionMillis - 10000));
          }}
          style={({ pressed }) => [
            styles.button,
            {
              borderColor: withAlpha(theme.border, 0.75),
              backgroundColor: withAlpha(theme.surfaceElevated, 0.9),
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: theme.textPrimary }]}>-10s</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!loadedStatus || !loadedStatus.durationMillis) {
              return;
            }

            void videoRef.current?.setPositionAsync(
              Math.min(loadedStatus.durationMillis, loadedStatus.positionMillis + 10000),
            );
          }}
          style={({ pressed }) => [
            styles.button,
            {
              borderColor: withAlpha(theme.border, 0.75),
              backgroundColor: withAlpha(theme.surfaceElevated, 0.9),
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: theme.textPrimary }]}>+10s</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            void videoRef.current?.presentFullscreenPlayer();
          }}
          style={({ pressed }) => [
            styles.button,
            {
              borderColor: withAlpha(theme.accent, 0.7),
              backgroundColor: withAlpha(theme.accent, 0.2),
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonLabel, { color: theme.accent }]}>Fullscreen</Text>
        </Pressable>
      </View>

      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {formatRelativeSeconds(positionSeconds)}
        {durationSeconds ? ` / ${formatRelativeSeconds(durationSeconds)}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  video: {
    borderRadius: radius.md,
    height: 220,
    overflow: "hidden",
    width: "100%",
  },
  error: {
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  button: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  meta: {
    fontSize: 12,
  },
});
