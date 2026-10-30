"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY =
  "BBdSGcx2WaXxJ-Apowz6RmqJ0ufrYoGwu13trOeMowAPCv4A1aN9cRLKOamxYDjY216Ymz5erQgHbAeu3o_liSU";

const AVAILABLE_INTERVALS = [
  {
    value: 1440,
    ru: "За 24 часа",
    uk: "За 24 години",
  },
  {
    value: 720,
    ru: "За 12 часов",
    uk: "За 12 годин",
  },
  {
    value: 360,
    ru: "За 6 часов",
    uk: "За 6 годин",
  },
  {
    value: 180,
    ru: "За 3 часа",
    uk: "За 3 години",
  },
  {
    value: 60,
    ru: "За 1 час",
    uk: "За 1 годину",
  },
  {
    value: 30,
    ru: "За 30 минут",
    uk: "За 30 хвилин",
  },
];

type Props = {
  language: "ru" | "uk";
};

function urlBase64ToUint8Array(
  base64String: string
) {
  const padding =
    "=".repeat(
      (4 -
        (base64String.length %
          4)) %
        4
    );

  const base64 =
    (
      base64String +
      padding
    )
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  const rawData =
    window.atob(
      base64
    );

  return Uint8Array.from(
    [...rawData].map(
      (char) =>
        char.charCodeAt(
          0
        )
    )
  );
}

export default function NotificationSettings({
  language,
}: Props) {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    enabled,
    setEnabled,
  ] =
    useState(false);

  const [
    intervals,
    setIntervals,
  ] =
    useState<number[]>([
      1440,
      60,
    ]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    status,
    setStatus,
  ] =
    useState("");

  const isUk =
    language === "uk";

  useEffect(() => {
    async function loadSettings() {
      const {
        data: userData,
      } =
        await supabase.auth.getUser();

      const userId =
        userData.user?.id;

      if (
        !userId
      ) {
        setLoading(
          false
        );

        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "settings"
          )
          .select(
            "notifications_enabled, notification_intervals"
          )
          .eq(
            "id",
            userId
          )
          .maybeSingle();

      if (
        !error &&
        data
      ) {
        setEnabled(
          Boolean(
            data.notifications_enabled
          )
        );

        if (
          Array.isArray(
            data.notification_intervals
          )
        ) {
          setIntervals(
            data.notification_intervals.map(
              Number
            )
          );
        }
      }

      setLoading(
        false
      );
    }

    void loadSettings();
  }, [
    supabase,
  ]);

  async function saveSettings(
    nextEnabled: boolean,
    nextIntervals: number[]
  ) {
    const {
      data: userData,
    } =
      await supabase.auth.getUser();

    const userId =
      userData.user?.id;

    if (
      !userId
    ) {
      throw new Error(
        "User not found"
      );
    }

    const {
      data: existingSettings,
      error: existingSettingsError,
    } =
      await supabase
        .from(
          "settings"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    if (
      existingSettingsError
    ) {
      throw existingSettingsError;
    }

    if (
      existingSettings
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "settings"
          )
          .update({
            notifications_enabled:
              nextEnabled,

            notification_intervals:
              nextIntervals,

            timezone:
              "Europe/Kyiv",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            userId
          )
          .select(
            "id"
          )
          .maybeSingle();

      if (
        error
      ) {
        throw error;
      }

      if (
        !data
      ) {
        throw new Error(
          "Settings were not updated"
        );
      }

      return;
    }

    const {
      error: insertError,
    } =
      await supabase
        .from(
          "settings"
        )
        .insert({
          id:
            userId,

          user_id:
            userId,

          language,

          start_hour:
            8,

          end_hour:
            21,

          work_days:
            [0, 1, 2, 3, 4, 5, 6],

          notifications_enabled:
            nextEnabled,

          notification_intervals:
            nextIntervals,

          timezone:
            "Europe/Kyiv",

          updated_at:
            new Date().toISOString(),
        });

    if (
      insertError
    ) {
      throw insertError;
    }
  }

  async function subscribeToPush() {
  if (process.env.NODE_ENV !== "production") {
    setStatus(
      isUk
        ? "Push-сповіщення потрібно перевіряти після публікації застосунку."
        : "Push-уведомления нужно проверять после публикации приложения."
    );

    return false;
  }

  if (
    !(
      "serviceWorker" in
      navigator
    ) ||
    !(
      "PushManager" in
      window
    ) ||
    !(
      "Notification" in
      window
    )
  ) {
      setStatus(
        isUk
          ? "Цей пристрій не підтримує push-сповіщення."
          : "Это устройство не поддерживает push-уведомления."
      );

      return false;
    }

    if (
      !VAPID_PUBLIC_KEY ||
      VAPID_PUBLIC_KEY.includes(
        "ВСТАВЬ"
      )
    ) {
      setStatus(
        isUk
          ? "Спочатку додай VAPID public key."
          : "Сначала добавь VAPID public key."
      );

      return false;
    }

    const permission =
      await Notification.requestPermission();

    if (
      permission !==
      "granted"
    ) {
      setStatus(
        isUk
          ? "Дозвіл на сповіщення не надано."
          : "Разрешение на уведомления не предоставлено."
      );

      return false;
    }

    const registration =
      await navigator.serviceWorker.ready;

    let subscription =
      await registration.pushManager.getSubscription();

    if (
      !subscription
    ) {
      subscription =
        await registration.pushManager.subscribe(
          {
            userVisibleOnly:
              true,

            applicationServerKey:
              urlBase64ToUint8Array(
                VAPID_PUBLIC_KEY
              ),
          }
        );
    }

    const json =
      subscription.toJSON();

    if (
      !json.endpoint ||
      !json.keys?.p256dh ||
      !json.keys?.auth
    ) {
      throw new Error(
        "Invalid push subscription"
      );
    }

    const {
      data: userData,
    } =
      await supabase.auth.getUser();

    const userId =
      userData.user?.id;

    if (
      !userId
    ) {
      throw new Error(
        "User not found"
      );
    }

    const {
      error,
    } =
      await supabase
        .from(
          "push_subscriptions"
        )
        .upsert(
          {
            user_id:
              userId,

            endpoint:
              json.endpoint,

            p256dh:
              json.keys.p256dh,

            auth:
              json.keys.auth,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id,endpoint",
          }
        );

    if (
      error
    ) {
      throw error;
    }

    return true;
  }

  async function enableNotifications() {
    try {
      setStatus(
        isUk
          ? "Підключення..."
          : "Подключение..."
      );

      const success =
        await subscribeToPush();

      if (
        !success
      ) {
        return;
      }

      setEnabled(
        true
      );

      await saveSettings(
        true,
        intervals
      );

      setStatus(
        isUk
          ? "Сповіщення увімкнено."
          : "Уведомления включены."
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setStatus(
        isUk
          ? "Не вдалося увімкнути сповіщення."
          : "Не удалось включить уведомления."
      );
    }
  }

  async function disableNotifications() {
    try {
      setEnabled(
        false
      );

      await saveSettings(
        false,
        intervals
      );

      setStatus(
        isUk
          ? "Сповіщення вимкнено."
          : "Уведомления выключены."
      );
    } catch (
      error
    ) {
      console.error(
        error
      );
    }
  }

  async function toggleInterval(
    value: number
  ) {
    const next =
      intervals.includes(
        value
      )
        ? intervals.filter(
            (
              item
            ) =>
              item !==
              value
          )
        : [
            ...intervals,
            value,
          ];

    const sorted =
      [...next].sort(
        (
          a,
          b
        ) =>
          b - a
      );

    setIntervals(
      sorted
    );

    try {
      await saveSettings(
        enabled,
        sorted
      );
    } catch (
      error
    ) {
      console.error(
        error
      );
    }
  }

  async function testNotification() {
    try {
      if (
        !(
          "Notification" in
          window
        )
      ) {
        setStatus(
          isUk
            ? "Сповіщення не підтримуються."
            : "Уведомления не поддерживаются."
        );

        return;
      }

      if (
        Notification.permission !==
        "granted"
      ) {
        setStatus(
          isUk
            ? "Спочатку увімкни сповіщення."
            : "Сначала включи уведомления."
        );

        return;
      }

      const registration =
        await navigator.serviceWorker.ready;

      await registration.showNotification(
        isUk
          ? "Тестове нагадування 💅"
          : "Тестовое напоминание 💅",
        {
          body:
            isUk
              ? "Завтра клієнт о 14:00 · Нарощування"
              : "Завтра клиент в 14:00 · Наращивание",

          icon:
            "/icon-192.png",

          badge:
            "/icon-192.png",

          tag:
            "nails-test",
        }
      );

      setStatus(
        isUk
          ? "Тестове сповіщення відправлено."
          : "Тестовое уведомление отправлено."
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setStatus(
        isUk
          ? "Не вдалося відправити тестове сповіщення."
          : "Не удалось отправить тестовое уведомление."
      );
    }
  }

  if (loading) {
  return (
    <div className="mt-3 rounded-[24px] bg-yellow-100 p-4">
      Загрузка настроек уведомлений...
    </div>
  );
}

  return (
    <div className="mt-3 rounded-[24px] border border-white/70 bg-white/55 p-4 backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            {isUk
              ? "Нагадування"
              : "Напоминания"}
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            {isUk
              ? "Push-сповіщення про майбутні записи"
              : "Push-уведомления о предстоящих записях"}
          </p>
        </div>

        <button
          type="button"
          onClick={
            enabled
              ? disableNotifications
              : enableNotifications
          }
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            enabled
              ? "bg-rose-400"
              : "bg-neutral-300"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
              enabled
                ? "left-7"
                : "left-1"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          <p className="mt-5 text-xs font-medium text-neutral-500">
            {isUk
              ? "Нагадувати до запису"
              : "Напоминать до записи"}
          </p>

          <div className="mt-2 space-y-2">
            {AVAILABLE_INTERVALS.map(
              (
                item
              ) => {
                const selected =
                  intervals.includes(
                    item.value
                  );

                return (
                  <button
                    key={
                      item.value
                    }
                    type="button"
                    onClick={() =>
                      toggleInterval(
                        item.value
                      )
                    }
                    className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm transition ${
                      selected
                        ? "border-rose-200 bg-rose-50/90 text-rose-700"
                        : "border-white/80 bg-white/65 text-neutral-600"
                    }`}
                  >
                    <span>
                      {
                        item[
                          language
                        ]
                      }
                    </span>

                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        selected
                          ? "border-rose-400 bg-rose-400 text-white"
                          : "border-neutral-300 bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              }
            )}
          </div>

          <button
            type="button"
            onClick={
              testNotification
            }
            className="mt-4 h-12 w-full rounded-2xl bg-white/80 text-sm font-medium shadow-sm"
          >
            {isUk
              ? "Надіслати тестове сповіщення"
              : "Отправить тестовое уведомление"}
          </button>
        </>
      )}

      {status && (
        <p className="mt-3 text-xs text-neutral-500">
          {status}
        </p>
      )}
    </div>
  );
}