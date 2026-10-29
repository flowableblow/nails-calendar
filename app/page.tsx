"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Language = "ru" | "uk";

type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no-show";

type Appointment = {
  id: number;
  date: string;
  time: string;
  clientId?: number;
  name: string;
  serviceId?: number;
  service: string;
  duration: number;
  price: number;
  status: AppointmentStatus;
};

type Client = {
  id: number;
  name: string;
  phone: string;
  telegram: string;
  instagram: string;
  note: string;
  social?: string;
};

type Service = {
  id: number;
  name: string;
  duration: number;
  price: number;
};

type WorkSettings = {
  startHour: number;
  endHour: number;
  workDays: number[];
};

type Tab =
  | "calendar"
  | "clients"
  | "analytics"
  | "settings";

type CalendarView = "day" | "month";

type DatabaseStatus =
  | "connecting"
  | "connected"
  | "offline"
  | "error";

type QueueTable =
  | "appointments"
  | "clients"
  | "services"
  | "settings";

type PendingOperation =
  | {
      queueId: string;
      type: "upsert";
      table: QueueTable;
      recordId: string | number;
      payload: Record<string, unknown>;
    }
  | {
      queueId: string;
      type: "delete";
      table: QueueTable;
      recordId: string | number;
      column: string;
      value: string | number;
    };

const HOUR_HEIGHT = 96;

const APPOINTMENTS_STORAGE_KEY =
  "nails-calendar-appointments";

const CLIENTS_STORAGE_KEY =
  "nails-calendar-clients";

const SERVICES_STORAGE_KEY =
  "nails-calendar-services";

const WORK_SETTINGS_STORAGE_KEY =
  "nails-calendar-work-settings";

const LANGUAGE_STORAGE_KEY =
  "nails-calendar-language";

const OFFLINE_QUEUE_STORAGE_KEY =
  "nails-calendar-offline-queue";

const DEFAULT_WORK_SETTINGS: WorkSettings = {
  startHour: 8,
  endHour: 21,
  workDays: [0, 1, 2, 3, 4, 5, 6],
};

const APP_BACKGROUND_STYLE = {
  backgroundImage:
    "linear-gradient(rgba(255,235,243,0.68), rgba(255,235,243,0.68)), url('/publicbg-man.png')",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center center",
  backgroundSize: "cover",
  backgroundColor: "#f8e9ee",
};

const WEEKDAYS = [
  { value: 1, ru: "Пн", uk: "Пн" },
  { value: 2, ru: "Вт", uk: "Вт" },
  { value: 3, ru: "Ср", uk: "Ср" },
  { value: 4, ru: "Чт", uk: "Чт" },
  { value: 5, ru: "Пт", uk: "Пт" },
  { value: 6, ru: "Сб", uk: "Сб" },
  { value: 0, ru: "Вс", uk: "Нд" },
];

const translations = {
  ru: {
    calendar: "Календарь",
    clients: "Клиенты",
    analytics: "Аналитика",
    settings: "Настройки",

    today: "Сегодня",
    currentMonth: "Текущий месяц",
    returnToday: "Вернуться на сегодня",
    returnCurrentMonth: "Вернуться на текущий месяц",

    day: "День",
    month: "Месяц",
    records: "Записей",

    clientBase: "База клиентов",
    searchClient:
      "Поиск по имени, телефону, Telegram...",
    noClients: "Клиентов пока нет",

    financeRecords: "Финансы и записи",
    todayIncome: "Сегодня",
    sevenDays: "7 дней",
    currentMonthIncome: "Текущий месяц",
    averageCheck: "Средний чек",

    scheduled: "Запланировано",
    completed: "Завершено",
    cancelled: "Отменено",
    noShow: "Не пришли",
    topServices: "Топ услуг",

    sync: "Синхронизация",
    online: "Онлайн",
    offline: "Офлайн",
    syncing: "Синхронизация",

    language: "Язык приложения",
    workSchedule: "Рабочий график",
    startDay: "Начало дня",
    endDay: "Конец дня",
    workDays: "Рабочие дни",

    services: "Услуги",
    edit: "Изменить",
    delete: "Удалить",

    appointmentNew: "Новая запись",
    appointmentEdit: "Редактировать запись",
    client: "Клиент",
    manualName: "Ввести имя вручную",
    clientName: "Имя клиента",
    service: "Услуга",
    manualService: "Ввести вручную",
    serviceName: "Название услуги",
    date: "Дата",
    time: "Время",
    duration: "Длительность",
    price: "Цена, грн",
    status: "Статус",

    createAppointment: "Создать запись",
    saveChanges: "Сохранить изменения",
    deleteAppointment: "Удалить запись",
    forceSave: "Всё равно сохранить",

    scheduledStatus: "Запланирована",
    completedStatus: "Завершена",
    cancelledStatus: "Отменена",
    noShowStatus: "Не пришла",

    newClient: "Новый клиент",
    editClient: "Редактировать клиента",
    name: "Имя",
    phone: "Телефон",
    telegram: "Telegram",
    instagram: "Instagram",
    note: "Заметка",
    save: "Сохранить",

    phoneMissing: "Телефон не указан",
    bookClient: "Записать клиента",
    editClientButton: "Редактировать",
    futureAppointments: "Ближайшие записи",
    history: "История",
    deleteClient: "Удалить клиента",

    call: "Позвонить",

    remind: "Напомнить",
    remindClient: "Напомнить клиенту",
    reminder: "Напоминание клиенту",

    copyText: "Скопировать текст",
    copied: "Текст скопирован",

    newService: "Новая услуга",
    editService: "Редактировать услугу",
    servicePrice: "Цена, грн",

    logout: "Выйти",
    minutes: "мин.",

    clientRequired: "Укажи клиента.",
    dateRequired: "Укажи дату.",
    timeRequired: "Укажи время.",

    conflict: "Это время пересекается с записью",

    deleteAppointmentConfirm: "Удалить эту запись?",

    deleteClientConfirm:
      "Удалить клиента? Его записи останутся в календаре.",

    deleteServiceConfirm: "Удалить эту услугу?",
  },

  uk: {
    calendar: "Календар",
    clients: "Клієнти",
    analytics: "Аналітика",
    settings: "Налаштування",

    today: "Сьогодні",
    currentMonth: "Поточний місяць",
    returnToday: "Повернутися на сьогодні",
    returnCurrentMonth:
      "Повернутися на поточний місяць",

    day: "День",
    month: "Місяць",
    records: "Записів",

    clientBase: "База клієнтів",
    searchClient:
      "Пошук за ім'ям, телефоном, Telegram...",
    noClients: "Клієнтів поки немає",

    financeRecords: "Фінанси та записи",
    todayIncome: "Сьогодні",
    sevenDays: "7 днів",
    currentMonthIncome: "Поточний місяць",
    averageCheck: "Середній чек",

    scheduled: "Заплановано",
    completed: "Завершено",
    cancelled: "Скасовано",
    noShow: "Не прийшли",
    topServices: "Топ послуг",

    sync: "Синхронізація",
    online: "Онлайн",
    offline: "Офлайн",
    syncing: "Синхронізація",

    language: "Мова застосунку",
    workSchedule: "Робочий графік",
    startDay: "Початок дня",
    endDay: "Кінець дня",
    workDays: "Робочі дні",

    services: "Послуги",
    edit: "Змінити",
    delete: "Видалити",

    appointmentNew: "Новий запис",
    appointmentEdit: "Редагувати запис",
    client: "Клієнт",
    manualName: "Ввести ім'я вручну",
    clientName: "Ім'я клієнта",
    service: "Послуга",
    manualService: "Ввести вручну",
    serviceName: "Назва послуги",
    date: "Дата",
    time: "Час",
    duration: "Тривалість",
    price: "Ціна, грн",
    status: "Статус",

    createAppointment: "Створити запис",
    saveChanges: "Зберегти зміни",
    deleteAppointment: "Видалити запис",
    forceSave: "Усе одно зберегти",

    scheduledStatus: "Заплановано",
    completedStatus: "Завершено",
    cancelledStatus: "Скасовано",
    noShowStatus: "Не прийшла",

    newClient: "Новий клієнт",
    editClient: "Редагувати клієнта",
    name: "Ім'я",
    phone: "Телефон",
    telegram: "Telegram",
    instagram: "Instagram",
    note: "Нотатка",
    save: "Зберегти",

    phoneMissing: "Телефон не вказано",
    bookClient: "Записати клієнта",
    editClientButton: "Редагувати",
    futureAppointments: "Найближчі записи",
    history: "Історія",
    deleteClient: "Видалити клієнта",

    call: "Подзвонити",

    remind: "Нагадати",
    remindClient: "Нагадати клієнту",
    reminder: "Нагадування клієнту",

    copyText: "Скопіювати текст",
    copied: "Текст скопійовано",

    newService: "Нова послуга",
    editService: "Редагувати послугу",
    servicePrice: "Ціна, грн",

    logout: "Вийти",
    minutes: "хв.",

    clientRequired: "Вкажи клієнта.",
    dateRequired: "Вкажи дату.",
    timeRequired: "Вкажи час.",

    conflict:
      "Цей час перетинається із записом",

    deleteAppointmentConfirm:
      "Видалити цей запис?",

    deleteClientConfirm:
      "Видалити клієнта? Його записи залишаться в календарі.",

    deleteServiceConfirm:
      "Видалити цю послугу?",
  },
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocale(language: Language) {
  return language === "uk"
    ? "uk-UA"
    : "ru-RU";
}

function formatDateTitle(
  date: Date,
  language: Language
) {
  return new Intl.DateTimeFormat(
    getLocale(language),
    {
      day: "numeric",
      month: "long",
    }
  ).format(date);
}

function formatMonthTitle(
  date: Date,
  language: Language
) {
  return new Intl.DateTimeFormat(
    getLocale(language),
    {
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

function formatFullDate(
  dateString: string,
  language: Language
) {
  return new Intl.DateTimeFormat(
    getLocale(language),
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${dateString}T12:00:00`
    )
  );
}

function formatWeekday(
  date: Date,
  language: Language
) {
  return new Intl.DateTimeFormat(
    getLocale(language),
    {
      weekday: "long",
    }
  ).format(date);
}

function formatUkrainianReminderDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "uk-UA",
    {
      day: "numeric",
      month: "long",
    }
  ).format(
    new Date(
      `${dateString}T12:00:00`
    )
  );
}

function timeToMinutes(time: string) {
  const [hours, minutes] =
    time.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(
  totalMinutes: number
) {
  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function formatDurationLabel(
  minutes: number,
  language: Language
) {
  if (minutes === 30) {
    return language === "uk"
      ? "30 хвилин"
      : "30 минут";
  }

  const hours =
    Math.floor(minutes / 60);

  const hasHalfHour =
    minutes % 60 === 30;

  if (hasHalfHour) {
    return `${hours}:30`;
  }

  if (language === "uk") {
    if (hours === 1) {
      return "1 година";
    }

    if (
      hours >= 2 &&
      hours <= 4
    ) {
      return `${hours} години`;
    }

    return `${hours} годин`;
  }

  if (hours === 1) {
    return "1 час";
  }

  if (
    hours >= 2 &&
    hours <= 4
  ) {
    return `${hours} часа`;
  }

  return `${hours} часов`;
}

function getAppointmentTop(
  time: string,
  startHour: number
) {
  return (
    ((timeToMinutes(time) -
      startHour * 60) /
      60) *
    HOUR_HEIGHT
  );
}

function getAppointmentHeight(
  duration: number
) {
  return Math.max(
    (duration / 60) *
      HOUR_HEIGHT,
    48
  );
}

function safeArray<T>(
  value: string | null
): T[] {
  if (!value) return [];

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function safeObject<T>(
  value: string | null,
  fallback: T
): T {
  if (!value) return fallback;

  try {
    return JSON.parse(
      value
    ) as T;
  } catch {
    return fallback;
  }
}

function createQueueId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function cleanUsername(
  value: string
) {
  return value
    .trim()
    .replace(
      /^https?:\/\/(www\.)?/,
      ""
    )
    .replace(/^t\.me\//, "")
    .replace(
      /^telegram\.me\//,
      ""
    )
    .replace(
      /^instagram\.com\//,
      ""
    )
    .replace(
      /^www\.instagram\.com\//,
      ""
    )
    .replace(/^@/, "")
    .split("/")[0]
    .split("?")[0];
}

function getTelegramUrl(
  value: string
) {
  const username =
    cleanUsername(value);

  return username
    ? `https://t.me/${username}`
    : "";
}

function getInstagramUrl(
  value: string
) {
  const username =
    cleanUsername(value);

  return username
    ? `https://instagram.com/${username}`
    : "";
}

function normalizeClient(
  client: Partial<Client> & {
    id: number;
    name?: string;
    phone?: string;
    social?: string;
    telegram?: string;
    instagram?: string;
    note?: string;
  }
): Client {
  const legacy =
    client.social?.trim() || "";

  let legacyTelegram = "";
  let legacyInstagram = "";

  if (
    legacy.startsWith("@") ||
    legacy.includes("t.me") ||
    legacy.includes("telegram")
  ) {
    legacyTelegram = legacy;
  } else if (legacy) {
    legacyInstagram = legacy;
  }

  return {
    id: Number(client.id),
    name: client.name ?? "",
    phone: client.phone ?? "",

    telegram:
      client.telegram ??
      legacyTelegram,

    instagram:
      client.instagram ??
      legacyInstagram,

    note: client.note ?? "",
  };
}

function getMonthCalendarDays(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    date.getMonth();

  const first =
    new Date(
      year,
      month,
      1
    );

  const last =
    new Date(
      year,
      month + 1,
      0
    );

  let weekday =
    first.getDay();

  if (weekday === 0) {
    weekday = 7;
  }

  const before =
    weekday - 1;

  const cells: {
    date: Date;
    isCurrentMonth: boolean;
  }[] = [];

  for (
    let index = before;
    index > 0;
    index--
  ) {
    cells.push({
      date: new Date(
        year,
        month,
        1 - index
      ),

      isCurrentMonth: false,
    });
  }

  for (
    let day = 1;
    day <= last.getDate();
    day++
  ) {
    cells.push({
      date: new Date(
        year,
        month,
        day
      ),

      isCurrentMonth: true,
    });
  }

  while (
    cells.length % 7 !== 0
  ) {
    const day =
      cells.length -
      before -
      last.getDate() +
      1;

    cells.push({
      date: new Date(
        year,
        month + 1,
        day
      ),

      isCurrentMonth: false,
    });
  }

  return cells;
}

function getStatusBadgeClass(
  status: AppointmentStatus
) {
  if (
    status === "completed"
  ) {
    return "border-green-300 bg-green-50 text-green-700";
  }

  if (
    status === "cancelled"
  ) {
    return "border-red-300 bg-red-50 text-red-700";
  }

  if (
    status === "no-show"
  ) {
    return "border-orange-300 bg-orange-50 text-orange-700";
  }

  return "border-sky-300 bg-sky-50 text-sky-700";
}

function getAppointmentCardClass(
  status: AppointmentStatus
) {
  if (
    status === "completed"
  ) {
    return "border-green-400 bg-green-50/95";
  }

  if (
    status === "cancelled"
  ) {
    return "border-red-400 bg-red-50/95";
  }

  if (
    status === "no-show"
  ) {
    return "border-orange-400 bg-orange-50/95";
  }

  return "border-sky-400 bg-sky-50/95";
}

function sumPrices(
  items: Appointment[]
) {
  return items.reduce(
    (sum, item) =>
      sum +
      Number(
        item.price || 0
      ),
    0
  );
}

export default function Home() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const settingsReadyRef =
    useRef(false);

  const syncingRef =
    useRef(false);

  const [
    today,
    setToday,
  ] =
    useState(
      new Date(
        "2000-01-01T12:00:00"
      )
    );

  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null
    );

  const [
    authChecked,
    setAuthChecked,
  ] =
    useState(false);

  const [
    loginEmail,
    setLoginEmail,
  ] =
    useState("");

  const [
    loginPassword,
    setLoginPassword,
  ] =
    useState("");

  const [
    loginError,
    setLoginError,
  ] =
    useState("");

  const [
    loginLoading,
    setLoginLoading,
  ] =
    useState(false);

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "uk"
    );

  const t =
    translations[language];

  const [
    databaseStatus,
    setDatabaseStatus,
  ] =
    useState<DatabaseStatus>(
      "connecting"
    );

  const [
    isOnline,
    setIsOnline,
  ] =
    useState(true);

  const [
    pendingCount,
    setPendingCount,
  ] =
    useState(0);

  const [
    isSyncing,
    setIsSyncing,
  ] =
    useState(false);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<Tab>(
      "calendar"
    );

  const [
    calendarView,
    setCalendarView,
  ] =
    useState<CalendarView>(
      "day"
    );

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      new Date(
        "2000-01-01T12:00:00"
      )
    );

  const [
    visibleMonth,
    setVisibleMonth,
  ] =
    useState(
      new Date(
        "2000-01-01T12:00:00"
      )
    );

  const [
    appointments,
    setAppointments,
  ] =
    useState<
      Appointment[]
    >([]);

  const [
    clients,
    setClients,
  ] =
    useState<Client[]>(
      []
    );

  const [
    services,
    setServices,
  ] =
    useState<Service[]>(
      []
    );

  const [
    workSettings,
    setWorkSettings,
  ] =
    useState<WorkSettings>(
      DEFAULT_WORK_SETTINGS
    );

  const [
    isLoaded,
    setIsLoaded,
  ] =
    useState(false);

  const [
    isAppointmentModalOpen,
    setIsAppointmentModalOpen,
  ] =
    useState(false);

  const [
    isClientModalOpen,
    setIsClientModalOpen,
  ] =
    useState(false);

  const [
    isClientDetailsOpen,
    setIsClientDetailsOpen,
  ] =
    useState(false);

  const [
    isServiceModalOpen,
    setIsServiceModalOpen,
  ] =
    useState(false);

  const [
    isReminderModalOpen,
    setIsReminderModalOpen,
  ] =
    useState(false);

  const [
    editingAppointmentId,
    setEditingAppointmentId,
  ] =
    useState<number | null>(
      null
    );

  const [
    editingClientId,
    setEditingClientId,
  ] =
    useState<number | null>(
      null
    );

  const [
    editingServiceId,
    setEditingServiceId,
  ] =
    useState<number | null>(
      null
    );

  const [
    selectedClientDetailsId,
    setSelectedClientDetailsId,
  ] =
    useState<number | null>(
      null
    );

  const [
    selectedClientId,
    setSelectedClientId,
  ] =
    useState("");

  const [
    selectedServiceId,
    setSelectedServiceId,
  ] =
    useState("");

  const [
    appointmentName,
    setAppointmentName,
  ] =
    useState("");

  const [
    appointmentDate,
    setAppointmentDate,
  ] =
    useState("");

  const [
    appointmentTime,
    setAppointmentTime,
  ] =
    useState("");

  const [
    appointmentService,
    setAppointmentService,
  ] =
    useState("");

  const [
    appointmentDuration,
    setAppointmentDuration,
  ] =
    useState("90");

  const [
    appointmentPrice,
    setAppointmentPrice,
  ] =
    useState("");

  const [
    appointmentStatus,
    setAppointmentStatus,
  ] =
    useState<AppointmentStatus>(
      "scheduled"
    );

  const [
    appointmentError,
    setAppointmentError,
  ] =
    useState("");

  const [
    hasConflict,
    setHasConflict,
  ] =
    useState(false);

  const [
    clientName,
    setClientName,
  ] =
    useState("");

  const [
    clientPhone,
    setClientPhone,
  ] =
    useState("");

  const [
    clientTelegram,
    setClientTelegram,
  ] =
    useState("");

  const [
    clientInstagram,
    setClientInstagram,
  ] =
    useState("");

  const [
    clientNote,
    setClientNote,
  ] =
    useState("");

  const [
    serviceName,
    setServiceName,
  ] =
    useState("");

  const [
    serviceDuration,
    setServiceDuration,
  ] =
    useState("90");

  const [
    servicePrice,
    setServicePrice,
  ] =
    useState("");

  const [
    clientSearch,
    setClientSearch,
  ] =
    useState("");

  const [
    reminderText,
    setReminderText,
  ] =
    useState("");

  const [
    reminderCopied,
    setReminderCopied,
  ] =
    useState(false);

  const [
    reminderClientId,
    setReminderClientId,
  ] =
    useState<number | null>(
      null
    );

  function getQueue() {
    return safeArray<PendingOperation>(
      localStorage.getItem(
        OFFLINE_QUEUE_STORAGE_KEY
      )
    );
  }

  function saveQueue(
    queue: PendingOperation[]
  ) {
    localStorage.setItem(
      OFFLINE_QUEUE_STORAGE_KEY,
      JSON.stringify(queue)
    );

    setPendingCount(
      queue.length
    );
  }

  function enqueueOperation(
    operation: PendingOperation
  ) {
    let queue =
      getQueue();

    queue =
      queue.filter(
        (item) =>
          !(
            item.table ===
              operation.table &&
            item.recordId ===
              operation.recordId
          )
      );

    queue.push(
      operation
    );

    saveQueue(
      queue
    );
  }

  const executeOperation =
    useCallback(
      async (
        operation: PendingOperation
      ) => {
        if (
          operation.type ===
          "upsert"
        ) {
          const { error } =
            await supabase
              .from(
                operation.table
              )
              .upsert(
                operation.payload,
                {
                  onConflict:
                    "id",
                }
              );

          if (error) {
            throw error;
          }

          return;
        }

        const { error } =
          await supabase
            .from(
              operation.table
            )
            .delete()
            .eq(
              operation.column,
              operation.value
            );

        if (error) {
          throw error;
        }
      },
      [supabase]
    );

  const syncOfflineQueue =
    useCallback(
      async () => {
        if (
          !navigator.onLine ||
          syncingRef.current
        ) {
          return;
        }

        let queue =
          safeArray<PendingOperation>(
            localStorage.getItem(
              OFFLINE_QUEUE_STORAGE_KEY
            )
          );

        setPendingCount(
          queue.length
        );

        if (
          queue.length === 0
        ) {
          setDatabaseStatus(
            "connected"
          );

          return;
        }

        syncingRef.current =
          true;

        setIsSyncing(true);

        setDatabaseStatus(
          "connecting"
        );

        while (
          queue.length > 0
        ) {
          const operation =
            queue[0];

          try {
            await executeOperation(
              operation
            );

            queue =
              queue.slice(1);

            localStorage.setItem(
              OFFLINE_QUEUE_STORAGE_KEY,
              JSON.stringify(
                queue
              )
            );

            setPendingCount(
              queue.length
            );
          } catch (error) {
            console.error(
              "Sync failed:",
              error
            );

            setDatabaseStatus(
              "error"
            );

            break;
          }
        }

        syncingRef.current =
          false;

        setIsSyncing(false);

        if (
          queue.length === 0
        ) {
          setDatabaseStatus(
            "connected"
          );
        }
      },
      [
        executeOperation,
      ]
    );

  async function saveOrQueue(
    operation: PendingOperation
  ) {
    if (
      !navigator.onLine
    ) {
      enqueueOperation(
        operation
      );

      setIsOnline(
        false
      );

      setDatabaseStatus(
        "offline"
      );

      return;
    }

    try {
      await executeOperation(
        operation
      );

      setDatabaseStatus(
        "connected"
      );
    } catch (error) {
      console.error(
        "Cloud unavailable. Saved to offline queue:",
        error
      );

      enqueueOperation(
        operation
      );

      setDatabaseStatus(
        "error"
      );
    }
  }

  function loadLocalData() {
    const rawClients =
      safeArray<Client>(
        localStorage.getItem(
          CLIENTS_STORAGE_KEY
        )
      );

    setClients(
      rawClients.map(
        (client) =>
          normalizeClient(
            client
          )
      )
    );

    setServices(
      safeArray<Service>(
        localStorage.getItem(
          SERVICES_STORAGE_KEY
        )
      )
    );

    setAppointments(
      safeArray<Appointment>(
        localStorage.getItem(
          APPOINTMENTS_STORAGE_KEY
        )
      )
    );

    setWorkSettings(
      safeObject<WorkSettings>(
        localStorage.getItem(
          WORK_SETTINGS_STORAGE_KEY
        ),
        DEFAULT_WORK_SETTINGS
      )
    );

    const storedLanguage =
      localStorage.getItem(
        LANGUAGE_STORAGE_KEY
      );

    if (
      storedLanguage === "ru" ||
      storedLanguage === "uk"
    ) {
      setLanguage(
        storedLanguage
      );
    }
  }

  useEffect(() => {
    const current =
      new Date();

    setToday(
      current
    );

    setSelectedDate(
      current
    );

    setVisibleMonth(
      new Date(
        current.getFullYear(),
        current.getMonth(),
        1
      )
    );

    const online =
      navigator.onLine;

    setIsOnline(
      online
    );

    const queue =
      safeArray<PendingOperation>(
        localStorage.getItem(
          OFFLINE_QUEUE_STORAGE_KEY
        )
      );

    setPendingCount(
      queue.length
    );

    function handleOnline() {
      setIsOnline(true);

      void syncOfflineQueue();
    }

    function handleOffline() {
      setIsOnline(false);

      setDatabaseStatus(
        "offline"
      );
    }

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, [syncOfflineQueue]);

  useEffect(() => {
    const storedLanguage =
      localStorage.getItem(
        LANGUAGE_STORAGE_KEY
      );

    if (
      storedLanguage === "ru" ||
      storedLanguage === "uk"
    ) {
      setLanguage(
        storedLanguage
      );
    }

    supabase.auth
      .getSession()
      .then(
        ({ data }) => {
          setSession(
            data.session
          );

          setAuthChecked(
            true
          );
        }
      );

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          nextSession
        ) => {
          setSession(
            nextSession
          );

          setAuthChecked(
            true
          );
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session) {
      return;
    }

    async function loadData() {
      setIsLoaded(
        false
      );

      if (
        !navigator.onLine
      ) {
        loadLocalData();

        setDatabaseStatus(
          "offline"
        );

        settingsReadyRef.current =
          true;

        setIsLoaded(
          true
        );

        return;
      }

      setDatabaseStatus(
        "connecting"
      );

      try {
        await syncOfflineQueue();

        const [
          clientsResult,
          servicesResult,
          appointmentsResult,
          settingsResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "clients"
              )
              .select("*")
              .order("name"),

            supabase
              .from(
                "services"
              )
              .select("*")
              .order("name"),

            supabase
              .from(
                "appointments"
              )
              .select("*")
              .order("date")
              .order("time"),

            supabase
              .from(
                "settings"
              )
              .select("*")
              .eq(
                "id",
                "main"
              )
              .maybeSingle(),
          ]);

        if (
          clientsResult.error
        ) {
          throw clientsResult.error;
        }

        if (
          servicesResult.error
        ) {
          throw servicesResult.error;
        }

        if (
          appointmentsResult.error
        ) {
          throw appointmentsResult.error;
        }

        if (
          settingsResult.error
        ) {
          throw settingsResult.error;
        }

        const nextClients: Client[] =
          (
            clientsResult.data ??
            []
          ).map(
            (row) =>
              normalizeClient({
                id: Number(
                  row.id
                ),

                name:
                  row.name ??
                  "",

                phone:
                  row.phone ??
                  "",

                telegram:
                  row.telegram ??
                  undefined,

                instagram:
                  row.instagram ??
                  undefined,

                social:
                  row.social ??
                  "",

                note:
                  row.note ??
                  "",
              })
          );

        const nextServices: Service[] =
          (
            servicesResult.data ??
            []
          ).map(
            (row) => ({
              id: Number(
                row.id
              ),

              name:
                row.name ??
                "",

              duration:
                Number(
                  row.duration ??
                    90
                ),

              price:
                Number(
                  row.price ??
                    0
                ),
            })
          );

        const nextAppointments: Appointment[] =
          (
            appointmentsResult.data ??
            []
          ).map(
            (row) => ({
              id: Number(
                row.id
              ),

              date:
                row.date ??
                "",

              time:
                String(
                  row.time ??
                    ""
                ).slice(
                  0,
                  5
                ),

              clientId:
                row.client_id !==
                  null &&
                row.client_id !==
                  undefined
                  ? Number(
                      row.client_id
                    )
                  : undefined,

              name:
                row.name ??
                "",

              serviceId:
                row.service_id !==
                  null &&
                row.service_id !==
                  undefined
                  ? Number(
                      row.service_id
                    )
                  : undefined,

              service:
                row.service ??
                "",

              duration:
                Number(
                  row.duration ??
                    90
                ),

              price:
                Number(
                  row.price ??
                    0
                ),

              status:
                (row.status ??
                  "scheduled") as AppointmentStatus,
            })
          );

        setClients(
          nextClients
        );

        setServices(
          nextServices
        );

        setAppointments(
          nextAppointments
        );

        if (
          settingsResult.data
        ) {
          const row =
            settingsResult.data;

          setLanguage(
            row.language ===
              "ru"
              ? "ru"
              : "uk"
          );

          setWorkSettings({
            startHour:
              Number(
                row.start_hour ??
                  8
              ),

            endHour:
              Number(
                row.end_hour ??
                  21
              ),

            workDays:
              Array.isArray(
                row.work_days
              )
                ? row.work_days.map(
                    Number
                  )
                : DEFAULT_WORK_SETTINGS.workDays,
          });
        }

        setDatabaseStatus(
          "connected"
        );
      } catch (error) {
        console.error(
          "Load failed, using local data:",
          error
        );

        loadLocalData();

        setDatabaseStatus(
          navigator.onLine
            ? "error"
            : "offline"
        );
      } finally {
        settingsReadyRef.current =
          true;

        setIsLoaded(
          true
        );
      }
    }

    void loadData();
  }, [
    session,
    supabase,
    syncOfflineQueue,
  ]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(
      CLIENTS_STORAGE_KEY,
      JSON.stringify(
        clients
      )
    );
  }, [
    clients,
    isLoaded,
  ]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(
      SERVICES_STORAGE_KEY,
      JSON.stringify(
        services
      )
    );
  }, [
    services,
    isLoaded,
  ]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(
      APPOINTMENTS_STORAGE_KEY,
      JSON.stringify(
        appointments
      )
    );
  }, [
    appointments,
    isLoaded,
  ]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      language
    );

    localStorage.setItem(
      WORK_SETTINGS_STORAGE_KEY,
      JSON.stringify(
        workSettings
      )
    );

    if (
      !settingsReadyRef.current
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void saveOrQueue({
            queueId:
              createQueueId(),

            type:
              "upsert",

            table:
              "settings",

            recordId:
              "main",

            payload: {
              id: "main",

              language,

              start_hour:
                workSettings.startHour,

              end_hour:
                workSettings.endHour,

              work_days:
                workSettings.workDays,

              updated_at:
                new Date().toISOString(),
            },
          });
        },
        500
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    language,
    workSettings,
    isLoaded,
  ]);

  async function handleLogin(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !navigator.onLine
    ) {
      setLoginError(
        language === "uk"
          ? "Для входу потрібен інтернет."
          : "Для входа нужен интернет."
      );

      return;
    }

    setLoginLoading(
      true
    );

    setLoginError("");

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email:
            loginEmail.trim(),

          password:
            loginPassword,
        }
      );

    if (error) {
      setLoginError(
        language === "uk"
          ? "Невірний email або пароль."
          : "Неверный email или пароль."
      );
    }

    setLoginLoading(
      false
    );
  }

  async function handleLogout() {
    if (
      navigator.onLine
    ) {
      await supabase.auth.signOut();
    }

    setSession(
      null
    );
  }

  const todayKey =
    formatDateKey(
      today
    );

  const selectedDateKey =
    formatDateKey(
      selectedDate
    );

  const selectedDateIsToday =
    selectedDateKey ===
    todayKey;

  const visibleMonthIsCurrent =
    visibleMonth.getFullYear() ===
      today.getFullYear() &&
    visibleMonth.getMonth() ===
      today.getMonth();

  const selectedDayAppointments =
    appointments
      .filter(
        (appointment) =>
          appointment.date ===
          selectedDateKey
      )
      .sort(
        (a, b) =>
          a.time.localeCompare(
            b.time
          )
      );

  const hours =
    Array.from(
      {
        length:
          workSettings.endHour -
          workSettings.startHour +
          1,
      },
      (
        _,
        index
      ) =>
        workSettings.startHour +
        index
    );

  const calendarHeight =
    (workSettings.endHour -
      workSettings.startHour) *
    HOUR_HEIGHT;

  const monthDays =
    getMonthCalendarDays(
      visibleMonth
    );

  const filteredClients =
    [...clients]
      .filter(
        (client) => {
          const search =
            clientSearch
              .trim()
              .toLowerCase();

          if (!search) {
            return true;
          }

          return (
            client.name
              .toLowerCase()
              .includes(search) ||
            client.phone
              .toLowerCase()
              .includes(search) ||
            client.telegram
              .toLowerCase()
              .includes(search) ||
            client.instagram
              .toLowerCase()
              .includes(search)
          );
        }
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            getLocale(
              language
            )
          )
      );

  const selectedClient =
    selectedClientDetailsId !==
    null
      ? clients.find(
          (client) =>
            client.id ===
            selectedClientDetailsId
        )
      : undefined;

  const reminderClient =
    reminderClientId !==
    null
      ? clients.find(
          (client) =>
            client.id ===
            reminderClientId
        )
      : undefined;

  const clientAppointments =
    selectedClientDetailsId !==
    null
      ? appointments.filter(
          (appointment) =>
            appointment.clientId ===
            selectedClientDetailsId
        )
      : [];

  const futureClientAppointments =
    clientAppointments
      .filter(
        (appointment) =>
          appointment.date >=
            todayKey &&
          appointment.status ===
            "scheduled"
      )
      .sort(
        (a, b) => {
          if (
            a.date !==
            b.date
          ) {
            return a.date.localeCompare(
              b.date
            );
          }

          return a.time.localeCompare(
            b.time
          );
        }
      );

  const pastClientAppointments =
    clientAppointments
      .filter(
        (appointment) =>
          appointment.date <
            todayKey ||
          appointment.status !==
            "scheduled"
      )
      .sort(
        (a, b) => {
          if (
            a.date !==
            b.date
          ) {
            return b.date.localeCompare(
              a.date
            );
          }

          return b.time.localeCompare(
            a.time
          );
        }
      );

  const sevenDaysAgo =
    useMemo(() => {
      const date =
        new Date(today);

      date.setDate(
        date.getDate() -
          6
      );

      return date;
    }, [today]);

  const sevenDaysAgoKey =
    formatDateKey(
      sevenDaysAgo
    );

  const monthStartKey =
    formatDateKey(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

  const monthEndKey =
    formatDateKey(
      new Date(
        today.getFullYear(),
        today.getMonth() +
          1,
        0
      )
    );

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status ===
        "completed"
    );

  const todayIncome =
    sumPrices(
      completedAppointments.filter(
        (appointment) =>
          appointment.date ===
          todayKey
      )
    );

  const weekIncome =
    sumPrices(
      completedAppointments.filter(
        (appointment) =>
          appointment.date >=
            sevenDaysAgoKey &&
          appointment.date <=
            todayKey
      )
    );

  const currentMonthAppointments =
    appointments.filter(
      (appointment) =>
        appointment.date >=
          monthStartKey &&
        appointment.date <=
          monthEndKey
    );

  const currentMonthCompleted =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status ===
        "completed"
    );

  const monthIncome =
    sumPrices(
      currentMonthCompleted
    );

  const averageCheck =
    currentMonthCompleted.length >
    0
      ? Math.round(
          monthIncome /
            currentMonthCompleted.length
        )
      : 0;

  const monthScheduledCount =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status ===
        "scheduled"
    ).length;

  const monthCompletedCount =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status ===
        "completed"
    ).length;

  const monthCancelledCount =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status ===
        "cancelled"
    ).length;

  const monthNoShowCount =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status ===
        "no-show"
    ).length;

  const serviceStats =
    Object.values(
      currentMonthCompleted.reduce(
        (
          result: Record<
            string,
            {
              name: string;
              count: number;
              income: number;
            }
          >,
          appointment
        ) => {
          const key =
            appointment.service ||
            "Без услуги";

          if (
            !result[key]
          ) {
            result[key] = {
              name: key,
              count: 0,
              income: 0,
            };
          }

          result[key].count +=
            1;

          result[key].income +=
            Number(
              appointment.price ||
                0
            );

          return result;
        },
        {}
      )
    ).sort(
      (a, b) =>
        b.count -
        a.count
    );

  function connectionLabel() {
    if (
      !isOnline
    ) {
      return t.offline;
    }

    if (
      isSyncing ||
      pendingCount > 0
    ) {
      return `${t.syncing}: ${pendingCount}`;
    }

    return t.online;
  }

  function connectionClass() {
    if (
      !isOnline
    ) {
      return "border-orange-300 bg-orange-50 text-orange-700";
    }

    if (
      isSyncing ||
      pendingCount > 0
    ) {
      return "border-amber-300 bg-amber-50 text-amber-700";
    }

    return "border-green-300 bg-green-50 text-green-700";
  }

  function statusLabel(
    status: AppointmentStatus
  ) {
    if (
      status ===
      "completed"
    ) {
      return t.completedStatus;
    }

    if (
      status ===
      "cancelled"
    ) {
      return t.cancelledStatus;
    }

    if (
      status ===
      "no-show"
    ) {
      return t.noShowStatus;
    }

    return t.scheduledStatus;
  }

  function changeDay(
    amount: number
  ) {
    const next =
      new Date(
        selectedDate
      );

    next.setDate(
      next.getDate() +
        amount
    );

    setSelectedDate(
      next
    );

    setVisibleMonth(
      new Date(
        next.getFullYear(),
        next.getMonth(),
        1
      )
    );
  }

  function changeMonth(
    amount: number
  ) {
    setVisibleMonth(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() +
          amount,
        1
      )
    );
  }

  function goToday() {
    const current =
      new Date();

    setSelectedDate(
      current
    );

    setVisibleMonth(
      new Date(
        current.getFullYear(),
        current.getMonth(),
        1
      )
    );
  }

  function resetAppointmentForm() {
    setEditingAppointmentId(
      null
    );

    setSelectedClientId(
      ""
    );

    setSelectedServiceId(
      ""
    );

    setAppointmentName(
      ""
    );

    setAppointmentDate(
      selectedDateKey
    );

    setAppointmentTime(
      ""
    );

    setAppointmentService(
      ""
    );

    setAppointmentDuration(
      "90"
    );

    setAppointmentPrice(
      ""
    );

    setAppointmentStatus(
      "scheduled"
    );

    setAppointmentError(
      ""
    );

    setHasConflict(
      false
    );
  }

  function openNewAppointment(
    time = ""
  ) {
    resetAppointmentForm();

    setAppointmentDate(
      selectedDateKey
    );

    setAppointmentTime(
      time
    );

    setIsAppointmentModalOpen(
      true
    );
  }

  function openEditAppointment(
    appointment: Appointment
  ) {
    setEditingAppointmentId(
      appointment.id
    );

    setAppointmentDate(
      appointment.date
    );

    setAppointmentTime(
      appointment.time
    );

    setAppointmentService(
      appointment.service
    );

    setAppointmentDuration(
      String(
        appointment.duration
      )
    );

    setAppointmentPrice(
      String(
        appointment.price
      )
    );

    setAppointmentStatus(
      appointment.status
    );

    setSelectedClientId(
      appointment.clientId
        ? String(
            appointment.clientId
          )
        : ""
    );

    setSelectedServiceId(
      appointment.serviceId
        ? String(
            appointment.serviceId
          )
        : ""
    );

    setAppointmentName(
      appointment.clientId
        ? ""
        : appointment.name
    );

    setAppointmentError(
      ""
    );

    setHasConflict(
      false
    );

    setIsAppointmentModalOpen(
      true
    );
  }

  function findConflict(
    date: string,
    time: string,
    duration: number,
    ignoreId: number | null
  ) {
    const start =
      timeToMinutes(
        time
      );

    const end =
      start +
      duration;

    return appointments.find(
      (appointment) => {
        if (
          appointment.date !==
          date
        ) {
          return false;
        }

        if (
          appointment.status ===
            "cancelled" ||
          appointment.status ===
            "no-show"
        ) {
          return false;
        }

        if (
          ignoreId !==
            null &&
          appointment.id ===
            ignoreId
        ) {
          return false;
        }

        const appointmentStart =
          timeToMinutes(
            appointment.time
          );

        const appointmentEnd =
          appointmentStart +
          appointment.duration;

        return (
          start <
            appointmentEnd &&
          end >
            appointmentStart
        );
      }
    );
  }

  async function actuallySaveAppointment() {
    const client =
      clients.find(
        (item) =>
          item.id ===
          Number(
            selectedClientId
          )
      );

    const service =
      services.find(
        (item) =>
          item.id ===
          Number(
            selectedServiceId
          )
      );

    const appointment: Appointment =
      {
        id:
          editingAppointmentId ??
          Date.now(),

        date:
          appointmentDate,

        time:
          appointmentTime,

        clientId:
          client?.id,

        name:
          client?.name ||
          appointmentName.trim(),

        serviceId:
          service?.id,

        service:
          service?.name ||
          appointmentService.trim() ||
          (language === "uk"
            ? "Манікюр"
            : "Маникюр"),

        duration:
          Number(
            appointmentDuration
          ),

        price:
          Number(
            appointmentPrice ||
              0
          ),

        status:
          appointmentStatus,
      };

    setAppointments(
      (current) => {
        if (
          editingAppointmentId !==
          null
        ) {
          return current.map(
            (item) =>
              item.id ===
              editingAppointmentId
                ? appointment
                : item
          );
        }

        return [
          ...current,
          appointment,
        ];
      }
    );

    await saveOrQueue({
      queueId:
        createQueueId(),

      type:
        "upsert",

      table:
        "appointments",

      recordId:
        appointment.id,

      payload: {
        id:
          appointment.id,

        date:
          appointment.date,

        time:
          appointment.time,

        client_id:
          appointment.clientId ??
          null,

        name:
          appointment.name,

        service_id:
          appointment.serviceId ??
          null,

        service:
          appointment.service,

        duration:
          appointment.duration,

        price:
          appointment.price,

        status:
          appointment.status,
      },
    });

    setIsAppointmentModalOpen(
      false
    );

    resetAppointmentForm();
  }

  async function saveAppointment() {
    const client =
      clients.find(
        (item) =>
          item.id ===
          Number(
            selectedClientId
          )
      );

    const finalName =
      client?.name ||
      appointmentName.trim();

    if (!finalName) {
      setAppointmentError(
        t.clientRequired
      );

      return;
    }

    if (
      !appointmentDate
    ) {
      setAppointmentError(
        t.dateRequired
      );

      return;
    }

    if (
      !appointmentTime
    ) {
      setAppointmentError(
        t.timeRequired
      );

      return;
    }

    const conflict =
      findConflict(
        appointmentDate,
        appointmentTime,
        Number(
          appointmentDuration
        ),
        editingAppointmentId
      );

    if (
      conflict &&
      appointmentStatus !==
        "cancelled" &&
      appointmentStatus !==
        "no-show"
    ) {
      setAppointmentError(
        `${t.conflict}: ${conflict.name}, ${conflict.time}–${minutesToTime(
          timeToMinutes(
            conflict.time
          ) +
            conflict.duration
        )}`
      );

      setHasConflict(
        true
      );

      return;
    }

    await actuallySaveAppointment();
  }

  async function deleteAppointment(
    id: number
  ) {
    if (
      !window.confirm(
        t.deleteAppointmentConfirm
      )
    ) {
      return;
    }

    setAppointments(
      (current) =>
        current.filter(
          (item) =>
            item.id !== id
        )
    );

    await saveOrQueue({
      queueId:
        createQueueId(),

      type:
        "delete",

      table:
        "appointments",

      recordId:
        id,

      column:
        "id",

      value:
        id,
    });

    setIsAppointmentModalOpen(
      false
    );
  }

  function openNewClient() {
    setEditingClientId(
      null
    );

    setClientName(
      ""
    );

    setClientPhone(
      ""
    );

    setClientTelegram(
      ""
    );

    setClientInstagram(
      ""
    );

    setClientNote(
      ""
    );

    setIsClientModalOpen(
      true
    );
  }

  function openEditClient(
    client: Client
  ) {
    setEditingClientId(
      client.id
    );

    setClientName(
      client.name
    );

    setClientPhone(
      client.phone
    );

    setClientTelegram(
      client.telegram
    );

    setClientInstagram(
      client.instagram
    );

    setClientNote(
      client.note
    );

    setIsClientDetailsOpen(
      false
    );

    setIsClientModalOpen(
      true
    );
  }

  async function saveClient() {
    if (
      !clientName.trim()
    ) {
      return;
    }

    const client: Client =
      {
        id:
          editingClientId ??
          Date.now(),

        name:
          clientName.trim(),

        phone:
          clientPhone.trim(),

        telegram:
          clientTelegram.trim(),

        instagram:
          clientInstagram.trim(),

        note:
          clientNote.trim(),
      };

    setClients(
      (current) => {
        if (
          editingClientId !==
          null
        ) {
          return current.map(
            (item) =>
              item.id ===
              editingClientId
                ? client
                : item
          );
        }

        return [
          ...current,
          client,
        ];
      }
    );

    if (
      editingClientId !==
      null
    ) {
      const changedAppointments =
        appointments
          .filter(
            (
              appointment
            ) =>
              appointment.clientId ===
              editingClientId
          )
          .map(
            (
              appointment
            ) => ({
              ...appointment,
              name:
                client.name,
            })
          );

      setAppointments(
        (current) =>
          current.map(
            (
              appointment
            ) => {
              const changed =
                changedAppointments.find(
                  (item) =>
                    item.id ===
                    appointment.id
                );

              return (
                changed ??
                appointment
              );
            }
          )
      );

      for (
        const appointment of
        changedAppointments
      ) {
        await saveOrQueue({
          queueId:
            createQueueId(),

          type:
            "upsert",

          table:
            "appointments",

          recordId:
            appointment.id,

          payload: {
            id:
              appointment.id,

            date:
              appointment.date,

            time:
              appointment.time,

            client_id:
              appointment.clientId ??
              null,

            name:
              appointment.name,

            service_id:
              appointment.serviceId ??
              null,

            service:
              appointment.service,

            duration:
              appointment.duration,

            price:
              appointment.price,

            status:
              appointment.status,
          },
        });
      }
    }

    await saveOrQueue({
      queueId:
        createQueueId(),

      type:
        "upsert",

      table:
        "clients",

      recordId:
        client.id,

      payload: {
        id:
          client.id,

        name:
          client.name,

        phone:
          client.phone,

        telegram:
          client.telegram,

        instagram:
          client.instagram,

        note:
          client.note,

        social: "",
      },
    });

    setIsClientModalOpen(
      false
    );
  }

  async function deleteClient(
    id: number
  ) {
    if (
      !window.confirm(
        t.deleteClientConfirm
      )
    ) {
      return;
    }

    setClients(
      (current) =>
        current.filter(
          (client) =>
            client.id !== id
        )
    );

    setAppointments(
      (current) =>
        current.map(
          (appointment) =>
            appointment.clientId ===
            id
              ? {
                  ...appointment,
                  clientId:
                    undefined,
                }
              : appointment
        )
    );

    await saveOrQueue({
      queueId:
        createQueueId(),

      type:
        "delete",

      table:
        "clients",

      recordId:
        id,

      column:
        "id",

      value:
        id,
    });

    setIsClientDetailsOpen(
      false
    );
  }

  function openNewService() {
    setEditingServiceId(
      null
    );

    setServiceName(
      ""
    );

    setServiceDuration(
      "90"
    );

    setServicePrice(
      ""
    );

    setIsServiceModalOpen(
      true
    );
  }

  function openEditService(
    service: Service
  ) {
    setEditingServiceId(
      service.id
    );

    setServiceName(
      service.name
    );

    setServiceDuration(
      String(
        service.duration
      )
    );

    setServicePrice(
      String(
        service.price
      )
    );

    setIsServiceModalOpen(
      true
    );
  }

  async function saveService() {
    if (
      !serviceName.trim()
    ) {
      return;
    }

    const service: Service =
      {
        id:
          editingServiceId ??
          Date.now(),

        name:
          serviceName.trim(),

        duration:
          Number(
            serviceDuration
          ),

        price:
          Number(
            servicePrice ||
              0
          ),
      };

    setServices(
      (current) => {
        if (
          editingServiceId !==
          null
        ) {
          return current.map(
            (item) =>
              item.id ===
              editingServiceId
                ? service
                : item
          );
        }

        return [
          ...current,
          service,
        ];
      }
    );

    await saveOrQueue({
      queueId:
        createQueueId(),

      type:
        "upsert",

      table:
        "services",

      recordId:
        service.id,

      payload: {
        id:
          service.id,

        name:
          service.name,

        duration:
          service.duration,

        price:
          service.price,
      },
    });

    setIsServiceModalOpen(
      false
    );
  }

  async function deleteService(
    id: number
  ) {
    if (
      !window.confirm(
        t.deleteServiceConfirm
      )
    ) {
      return;
    }

    setServices(
      (current) =>
        current.filter(
          (service) =>
            service.id !== id
        )
    );

    await saveOrQueue({
      queueId:
        createQueueId(),

      type:
        "delete",

      table:
        "services",

      recordId:
        id,

      column:
        "id",

      value:
        id,
    });
  }

  function handleCalendarClick(
    event: MouseEvent<HTMLDivElement>
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const y =
      event.clientY -
      rect.top;

    const hour =
      workSettings.startHour +
      Math.floor(
        y /
          HOUR_HEIGHT
      );

    if (
      hour <
        workSettings.startHour ||
      hour >=
        workSettings.endHour
    ) {
      return;
    }

    openNewAppointment(
      `${String(
        hour
      ).padStart(
        2,
        "0"
      )}:00`
    );
  }

  function handleServiceSelection(
    value: string
  ) {
    setSelectedServiceId(
      value
    );

    if (!value) {
      return;
    }

    const service =
      services.find(
        (item) =>
          item.id ===
          Number(value)
      );

    if (!service) {
      return;
    }

    setAppointmentService(
      service.name
    );

    setAppointmentDuration(
      String(
        service.duration
      )
    );

    setAppointmentPrice(
      String(
        service.price
      )
    );
  }

  function toggleWorkDay(
    day: number
  ) {
    setWorkSettings(
      (current) => ({
        ...current,

        workDays:
          current.workDays.includes(
            day
          )
            ? current.workDays.filter(
                (item) =>
                  item !==
                  day
              )
            : [
                ...current.workDays,
                day,
              ],
      })
    );
  }

  function openReminder(
    appointment: Appointment
  ) {
    const text =
      `Привіт, ${appointment.name}! ` +
      `Нагадую про ваш запис ${formatUkrainianReminderDate(
        appointment.date
      )} о ${appointment.time}. ` +
      `Послуга: ${appointment.service}. ` +
      `Чекаю на вас ❤️`;

    setReminderText(
      text
    );

    setReminderClientId(
      appointment.clientId ??
        null
    );

    setReminderCopied(
      false
    );

    setIsReminderModalOpen(
      true
    );
  }

  async function copyReminder() {
    try {
      await navigator.clipboard.writeText(
        reminderText
      );

      setReminderCopied(
        true
      );
    } catch {
      window.alert(
        reminderText
      );
    }
  }

  async function openTelegramReminder() {
    if (
      !reminderClient?.telegram
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        reminderText
      );

      setReminderCopied(
        true
      );
    } catch {}

    const url =
      getTelegramUrl(
        reminderClient.telegram
      );

    if (url) {
      window.open(
        url,
        "_blank"
      );
    }
  }

  async function openInstagramReminder() {
    if (
      !reminderClient?.instagram
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        reminderText
      );

      setReminderCopied(
        true
      );
    } catch {}

    const url =
      getInstagramUrl(
        reminderClient.instagram
      );

    if (url) {
      window.open(
        url,
        "_blank"
      );
    }
  }

  if (!authChecked) {
    return (
      <main
        className="flex h-dvh items-center justify-center"
        style={
          APP_BACKGROUND_STYLE
        }
      >
        <div className="rounded-3xl bg-rose-50/80 px-8 py-7 shadow-xl">
          Nails
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main
        className="flex h-dvh items-center justify-center px-5"
        style={
          APP_BACKGROUND_STYLE
        }
      >
        <form
          onSubmit={
            handleLogin
          }
          className="w-full max-w-sm rounded-3xl bg-rose-50/80 p-6 shadow-2xl backdrop-blur-md"
        >
          <h1 className="text-center text-2xl font-semibold">
            Nails
          </h1>

          <input
            type="email"
            value={
              loginEmail
            }
            onChange={(
              event
            ) =>
              setLoginEmail(
                event.target
                  .value
              )
            }
            placeholder="Email"
            className="mt-6 h-12 w-full rounded-xl border border-rose-200 bg-white px-3 text-black"
          />

          <input
            type="password"
            value={
              loginPassword
            }
            onChange={(
              event
            ) =>
              setLoginPassword(
                event.target
                  .value
              )
            }
            placeholder="Пароль"
            className="mt-3 h-12 w-full rounded-xl border border-rose-200 bg-white px-3 text-black"
          />

          {loginError && (
            <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {loginError}
            </div>
          )}

          <button
            disabled={
              loginLoading
            }
            className="mt-4 h-12 w-full rounded-xl bg-black font-medium text-white"
          >
            {loginLoading
              ? "..."
              : "Увійти / Войти"}
          </button>
        </form>
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main
        className="flex h-dvh items-center justify-center"
        style={
          APP_BACKGROUND_STYLE
        }
      >
        <div className="rounded-3xl bg-rose-50/80 px-8 py-7 shadow-xl">
          Загрузка...
        </div>
      </main>
    );
  }

  return (
    <main
      className="h-dvh overflow-hidden text-neutral-900"
      style={
        APP_BACKGROUND_STYLE
      }
    >
      <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-rose-50/45 shadow-2xl backdrop-blur-[1px]">

        {activeTab ===
          "calendar" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 border-b border-neutral-600/60 bg-rose-50/70 px-5 pb-3 pt-4 backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm capitalize text-neutral-500">
                      {selectedDateIsToday
                        ? t.today
                        : formatWeekday(
                            selectedDate,
                            language
                          )}
                    </p>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${connectionClass()}`}
                    >
                      {connectionLabel()}
                    </span>
                  </div>

                  <h1 className="text-2xl font-semibold capitalize">
                    {calendarView ===
                    "day"
                      ? formatDateTitle(
                          selectedDate,
                          language
                        )
                      : formatMonthTitle(
                          visibleMonth,
                          language
                        )}
                  </h1>

                  <p className="mt-1 text-xs text-neutral-500">
                    {t.records}:{" "}
                    {
                      selectedDayAppointments.length
                    }
                  </p>
                </div>

                <button
                  onClick={() =>
                    openNewAppointment()
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-2xl text-white"
                >
                  +
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 rounded-xl bg-rose-100/70 p-1">
                <button
                  onClick={() =>
                    setCalendarView(
                      "day"
                    )
                  }
                  className={`rounded-lg py-2 text-sm ${
                    calendarView ===
                    "day"
                      ? "bg-white shadow-sm"
                      : "text-neutral-500"
                  }`}
                >
                  {t.day}
                </button>

                <button
                  onClick={() =>
                    setCalendarView(
                      "month"
                    )
                  }
                  className={`rounded-lg py-2 text-sm ${
                    calendarView ===
                    "month"
                      ? "bg-white shadow-sm"
                      : "text-neutral-500"
                  }`}
                >
                  {t.month}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-[48px_1fr_48px] items-center">
                <button
                  onClick={() =>
                    calendarView ===
                    "day"
                      ? changeDay(
                          -1
                        )
                      : changeMonth(
                          -1
                        )
                  }
                  className="text-2xl"
                >
                  ‹
                </button>

                <button
                  onClick={
                    goToday
                  }
                  className="mx-auto rounded-xl bg-rose-100/70 px-4 py-2 text-sm"
                >
                  {calendarView ===
                  "day"
                    ? selectedDateIsToday
                      ? t.today
                      : t.returnToday
                    : visibleMonthIsCurrent
                    ? t.currentMonth
                    : t.returnCurrentMonth}
                </button>

                <button
                  onClick={() =>
                    calendarView ===
                    "day"
                      ? changeDay(
                          1
                        )
                      : changeMonth(
                          1
                        )
                  }
                  className="text-2xl"
                >
                  ›
                </button>
              </div>
            </header>

            {calendarView ===
              "day" && (
              <section className="min-h-0 flex-1 overflow-y-auto">
                <div
                  className="grid grid-cols-[70px_1fr]"
                  style={{
                    height: `${calendarHeight}px`,
                  }}
                >
                  <div className="relative">

                    <div
                      className="absolute -bottom-[3px] right-0 top-0 z-20 w-[6px]"
                      style={{
                        background:
                          "linear-gradient(to right, rgba(145,145,145,0.42) 0%, rgba(205,205,205,0.7) 30%, rgba(255,255,255,0.98) 45%, rgba(255,255,255,0.98) 55%, rgba(205,205,205,0.7) 70%, rgba(145,145,145,0.42) 100%)",
                      }}
                    />

                    {hours.map(
                      (
                        hour
                      ) => (
                        <div
                          key={
                            hour
                          }
                          className="absolute left-0 w-full px-3 text-sm text-neutral-600"
                          style={{
                            top: `${
                              (hour -
                                workSettings.startHour) *
                              HOUR_HEIGHT
                            }px`,
                          }}
                        >
                          {String(
                            hour
                          ).padStart(
                            2,
                            "0"
                          )}
                          :00
                        </div>
                      )
                    )}
                  </div>

                  <div
                    className="relative"
                    onClick={
                      handleCalendarClick
                    }
                  >
                    {hours.map(
                      (
                        hour
                      ) => (
                        <div
                          key={
                            hour
                          }
                          className="absolute -left-[3px] right-0 h-[6px]"
                          style={{
                            top: `${
                              (hour -
                                workSettings.startHour) *
                              HOUR_HEIGHT
                            }px`,
                            background:
                              "linear-gradient(to bottom, rgba(145,145,145,0.42) 0%, rgba(205,205,205,0.7) 30%, rgba(255,255,255,0.98) 45%, rgba(255,255,255,0.98) 55%, rgba(205,205,205,0.7) 70%, rgba(145,145,145,0.42) 100%)",
                          }}
                        />
                      )
                    )}

                    {selectedDayAppointments.map(
                      (
                        appointment
                      ) => {
                        const top =
                          getAppointmentTop(
                            appointment.time,
                            workSettings.startHour
                          );

                        const height =
                          getAppointmentHeight(
                            appointment.duration
                          );

                        return (
                          <button
                            key={
                              appointment.id
                            }
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              openEditAppointment(
                                appointment
                              );
                            }}
                            className={`absolute left-2 right-2 z-10 overflow-hidden rounded-2xl border p-3 text-left shadow-md ${getAppointmentCardClass(
                              appointment.status
                            )}`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                          >
                            <div className="flex justify-between gap-2">
                              <span className="font-medium">
                                {
                                  appointment.time
                                }
                              </span>

                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] ${getStatusBadgeClass(
                                  appointment.status
                                )}`}
                              >
                                {statusLabel(
                                  appointment.status
                                )}
                              </span>
                            </div>

                            <p className="mt-1 truncate font-semibold">
                              {
                                appointment.name
                              }
                            </p>

                            {height >=
                              70 && (
                              <p className="mt-1 truncate text-sm text-neutral-600">
                                {
                                  appointment.service
                                }
                              </p>
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </section>
            )}

            {calendarView ===
              "month" && (
              <section className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="rounded-2xl bg-white/65 p-3 backdrop-blur-sm">
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map(
                      (
                        day
                      ) => (
                        <div
                          key={
                            day.value
                          }
                          className="py-2 text-center text-xs text-neutral-500"
                        >
                          {
                            day[
                              language
                            ]
                          }
                        </div>
                      )
                    )}

                    {monthDays.map(
                      (
                        item
                      ) => {
                        const dateKey =
                          formatDateKey(
                            item.date
                          );

                        const count =
                          appointments.filter(
                            (
                              appointment
                            ) =>
                              appointment.date ===
                              dateKey
                          ).length;

                        const selected =
                          dateKey ===
                          selectedDateKey;

                        return (
                          <button
                            key={
                              dateKey
                            }
                            onClick={() => {
                              setSelectedDate(
                                item.date
                              );

                              setVisibleMonth(
                                new Date(
                                  item.date.getFullYear(),
                                  item.date.getMonth(),
                                  1
                                )
                              );

                              setCalendarView(
                                "day"
                              );
                            }}
                            className={`min-h-[62px] rounded-xl p-2 ${
                              selected
                                ? "bg-black text-white"
                                : item.isCurrentMonth
                                ? "bg-white/50"
                                : "text-neutral-300"
                            }`}
                          >
                            <div>
                              {
                                item.date.getDate()
                              }
                            </div>

                            {count >
                              0 && (
                              <div className="mt-1 text-xs">
                                {
                                  count
                                }
                              </div>
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab ===
          "clients" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 bg-rose-50/70 px-5 py-4 backdrop-blur-md">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-neutral-500">
                    {
                      t.clientBase
                    }
                  </p>

                  <h1 className="text-2xl font-semibold">
                    {
                      t.clients
                    }
                  </h1>
                </div>

                <button
                  onClick={
                    openNewClient
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-2xl text-white"
                >
                  +
                </button>
              </div>

              <input
                value={
                  clientSearch
                }
                onChange={(
                  event
                ) =>
                  setClientSearch(
                    event.target
                      .value
                  )
                }
                placeholder={
                  t.searchClient
                }
                className="mt-4 h-12 w-full rounded-xl border border-rose-200 bg-white/90 px-3"
              />
            </header>

            <section className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {filteredClients.length ===
                0 && (
                <div className="rounded-2xl bg-white/60 p-6 text-center text-neutral-500">
                  {
                    t.noClients
                  }
                </div>
              )}

              {filteredClients.map(
                (
                  client
                ) => (
                  <button
                    key={
                      client.id
                    }
                    onClick={() => {
                      setSelectedClientDetailsId(
                        client.id
                      );

                      setIsClientDetailsOpen(
                        true
                      );
                    }}
                    className="w-full rounded-2xl border border-rose-200 bg-white/70 p-4 text-left shadow-sm"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {
                            client.name
                          }
                        </p>

                        {client.phone && (
                          <p className="mt-1 truncate text-sm text-neutral-500">
                            {
                              client.phone
                            }
                          </p>
                        )}

                        {(client.telegram ||
                          client.instagram) && (
                          <p className="mt-1 truncate text-xs text-neutral-400">
                            {client.telegram
                              ? `TG ${client.telegram}`
                              : ""}

                            {client.telegram &&
                            client.instagram
                              ? " · "
                              : ""}

                            {client.instagram
                              ? `IG ${client.instagram}`
                              : ""}
                          </p>
                        )}
                      </div>

                      <span className="h-fit shrink-0 rounded-full bg-rose-100 px-3 py-1 text-xs">
                        {
                          appointments.filter(
                            (
                              appointment
                            ) =>
                              appointment.clientId ===
                              client.id
                          ).length
                        }
                      </span>
                    </div>
                  </button>
                )
              )}
            </section>
          </div>
        )}

        {activeTab ===
          "analytics" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 bg-rose-50/70 px-5 py-4">
              <p className="text-sm text-neutral-500">
                {
                  t.financeRecords
                }
              </p>

              <h1 className="text-2xl font-semibold">
                {
                  t.analytics
                }
              </h1>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={
                    t.todayIncome
                  }
                  value={`${todayIncome} грн`}
                />

                <StatCard
                  label={
                    t.sevenDays
                  }
                  value={`${weekIncome} грн`}
                />

                <StatCard
                  label={
                    t.currentMonthIncome
                  }
                  value={`${monthIncome} грн`}
                />

                <StatCard
                  label={
                    t.averageCheck
                  }
                  value={`${averageCheck} грн`}
                />

                <StatCard
                  label={
                    t.scheduled
                  }
                  value={String(
                    monthScheduledCount
                  )}
                  tone="blue"
                />

                <StatCard
                  label={
                    t.completed
                  }
                  value={String(
                    monthCompletedCount
                  )}
                  tone="green"
                />

                <StatCard
                  label={
                    t.cancelled
                  }
                  value={String(
                    monthCancelledCount
                  )}
                  tone="red"
                />

                <StatCard
                  label={
                    t.noShow
                  }
                  value={String(
                    monthNoShowCount
                  )}
                  tone="orange"
                />
              </div>

              <h2 className="mt-6 text-lg font-semibold">
                {
                  t.topServices
                }
              </h2>

              <div className="mt-3 space-y-2">
                {serviceStats.map(
                  (
                    service
                  ) => (
                    <div
                      key={
                        service.name
                      }
                      className="rounded-2xl bg-white/70 p-4"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">
                            {
                              service.name
                            }
                          </p>

                          <p className="text-sm text-neutral-500">
                            {
                              service.count
                            }
                          </p>
                        </div>

                        <p className="font-semibold">
                          {
                            service.income
                          }{" "}
                          грн
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab ===
          "settings" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 bg-rose-50/70 px-5 py-4">
              <h1 className="text-2xl font-semibold">
                {
                  t.settings
                }
              </h1>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto p-5">
              <h2 className="font-semibold">
                {
                  t.sync
                }
              </h2>

              <div
                className={`mt-3 rounded-2xl border p-4 ${connectionClass()}`}
              >
                <p className="font-medium">
                  {
                    connectionLabel()
                  }
                </p>

                {pendingCount >
                  0 && (
                  <p className="mt-1 text-xs">
                    В очереди:{" "}
                    {
                      pendingCount
                    }
                  </p>
                )}
              </div>

              <h2 className="mt-7 font-semibold">
                {
                  t.language
                }
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    setLanguage(
                      "ru"
                    )
                  }
                  className={`h-12 rounded-xl ${
                    language ===
                    "ru"
                      ? "bg-black text-white"
                      : "bg-white/70"
                  }`}
                >
                  Русский
                </button>

                <button
                  onClick={() =>
                    setLanguage(
                      "uk"
                    )
                  }
                  className={`h-12 rounded-xl ${
                    language ===
                    "uk"
                      ? "bg-black text-white"
                      : "bg-white/70"
                  }`}
                >
                  Українська
                </button>
              </div>

              <h2 className="mt-7 font-semibold">
                {
                  t.workSchedule
                }
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs text-neutral-500">
                    {
                      t.startDay
                    }
                  </p>

                  <select
                    value={
                      workSettings.startHour
                    }
                    onChange={(
                      event
                    ) =>
                      setWorkSettings(
                        {
                          ...workSettings,

                          startHour:
                            Number(
                              event.target.value
                            ),
                        }
                      )
                    }
                    className="h-12 w-full rounded-xl bg-white px-3"
                  >
                    {Array.from(
                      {
                        length:
                          18,
                      },
                      (
                        _,
                        index
                      ) =>
                        index +
                        6
                    ).map(
                      (
                        hour
                      ) => (
                        <option
                          key={
                            hour
                          }
                          value={
                            hour
                          }
                        >
                          {String(
                            hour
                          ).padStart(
                            2,
                            "0"
                          )}
                          :00
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <p className="mb-1 text-xs text-neutral-500">
                    {
                      t.endDay
                    }
                  </p>

                  <select
                    value={
                      workSettings.endHour
                    }
                    onChange={(
                      event
                    ) =>
                      setWorkSettings(
                        {
                          ...workSettings,

                          endHour:
                            Number(
                              event.target.value
                            ),
                        }
                      )
                    }
                    className="h-12 w-full rounded-xl bg-white px-3"
                  >
                    {Array.from(
                      {
                        length:
                          18,
                      },
                      (
                        _,
                        index
                      ) =>
                        index +
                        7
                    ).map(
                      (
                        hour
                      ) => (
                        <option
                          key={
                            hour
                          }
                          value={
                            hour
                          }
                        >
                          {hour ===
                          24
                            ? "24:00"
                            : `${String(
                                hour
                              ).padStart(
                                2,
                                "0"
                              )}:00`}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <p className="mt-4 text-xs text-neutral-500">
                {
                  t.workDays
                }
              </p>

              <div className="mt-2 grid grid-cols-7 gap-1">
                {WEEKDAYS.map(
                  (
                    day
                  ) => (
                    <button
                      key={
                        day.value
                      }
                      onClick={() =>
                        toggleWorkDay(
                          day.value
                        )
                      }
                      className={`h-11 rounded-xl text-xs ${
                        workSettings.workDays.includes(
                          day.value
                        )
                          ? "bg-black text-white"
                          : "bg-white/60"
                      }`}
                    >
                      {
                        day[
                          language
                        ]
                      }
                    </button>
                  )
                )}
              </div>

              <div className="mt-7 flex items-center justify-between">
                <h2 className="font-semibold">
                  {
                    t.services
                  }
                </h2>

                <button
                  onClick={
                    openNewService
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-xl text-white"
                >
                  +
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {services.map(
                  (
                    service
                  ) => (
                    <div
                      key={
                        service.id
                      }
                      className="rounded-2xl bg-white/70 p-4"
                    >
                      <p className="font-semibold">
                        {
                          service.name
                        }
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {
                          service.duration
                        }{" "}
                        {
                          t.minutes
                        }{" "}
                        ·{" "}
                        {
                          service.price
                        }{" "}
                        грн
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() =>
                            openEditService(
                              service
                            )
                          }
                          className="h-10 rounded-lg bg-white px-3 text-xs"
                        >
                          {
                            t.edit
                          }
                        </button>

                        <button
                          onClick={() =>
                            deleteService(
                              service.id
                            )
                          }
                          className="h-10 rounded-lg bg-red-50 px-3 text-xs text-red-600"
                        >
                          {
                            t.delete
                          }
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <button
                onClick={
                  handleLogout
                }
                className="mt-7 h-12 w-full rounded-xl bg-red-50 text-red-600"
              >
                {
                  t.logout
                }
              </button>
            </section>
          </div>
        )}

        <nav className="shrink-0 bg-rose-50/80 px-3 pb-3 pt-2 backdrop-blur-md">
          <div className="grid grid-cols-4 gap-2">
            <NavButton
              active={
                activeTab ===
                "calendar"
              }
              onClick={() =>
                setActiveTab(
                  "calendar"
                )
              }
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="16"
                    rx="3"
                  />
                  <path d="M7 3v4M17 3v4M3 10h18" />
                </svg>
              }
            >
              {
                t.calendar
              }
            </NavButton>

            <NavButton
              active={
                activeTab ===
                "clients"
              }
              onClick={() =>
                setActiveTab(
                  "clients"
                )
              }
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <circle
                    cx="9"
                    cy="8"
                    r="3"
                  />
                  <path d="M3.5 20c.7-4 2.8-6 5.5-6s4.8 2 5.5 6" />
                  <circle
                    cx="17"
                    cy="9"
                    r="2.3"
                  />
                  <path d="M15.5 14.5c2.6.3 4.3 2.2 5 5.5" />
                </svg>
              }
            >
              {
                t.clients
              }
            </NavButton>

            <NavButton
              active={
                activeTab ===
                "analytics"
              }
              onClick={() =>
                setActiveTab(
                  "analytics"
                )
              }
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M5 20V11" />
                  <path d="M12 20V5" />
                  <path d="M19 20v-7" />
                  <path d="M3 20h18" />
                </svg>
              }
            >
              {
                t.analytics
              }
            </NavButton>

            <NavButton
              active={
                activeTab ===
                "settings"
              }
              onClick={() =>
                setActiveTab(
                  "settings"
                )
              }
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                  />

                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
                </svg>
              }
            >
              {
                t.settings
              }
            </NavButton>
          </div>
        </nav>

        {isAppointmentModalOpen && (
          <Modal
            onClose={() =>
              setIsAppointmentModalOpen(
                false
              )
            }
          >
            <h2 className="text-xl font-semibold">
              {editingAppointmentId !==
              null
                ? t.appointmentEdit
                : t.appointmentNew}
            </h2>

            <div className="mt-5 space-y-4">
              {clients.length >
                0 && (
                <div>
                  <label className="mb-1 block text-sm text-neutral-500">
                    {
                      t.client
                    }
                  </label>

                  <select
                    value={
                      selectedClientId
                    }
                    onChange={(
                      event
                    ) => {
                      setSelectedClientId(
                        event.target
                          .value
                      );

                      if (
                        event.target
                          .value
                      ) {
                        setAppointmentName(
                          ""
                        );
                      }
                    }}
                    className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
                  >
                    <option value="">
                      {
                        t.manualName
                      }
                    </option>

                    {clients.map(
                      (
                        client
                      ) => (
                        <option
                          key={
                            client.id
                          }
                          value={
                            client.id
                          }
                        >
                          {
                            client.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              {!selectedClientId && (
                <input
                  value={
                    appointmentName
                  }
                  onChange={(
                    event
                  ) =>
                    setAppointmentName(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    t.clientName
                  }
                  className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
                />
              )}

              {services.length >
                0 && (
                <div>
                  <label className="mb-1 block text-sm text-neutral-500">
                    {
                      t.service
                    }
                  </label>

                  <select
                    value={
                      selectedServiceId
                    }
                    onChange={(
                      event
                    ) =>
                      handleServiceSelection(
                        event.target
                          .value
                      )
                    }
                    className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
                  >
                    <option value="">
                      {
                        t.manualService
                      }
                    </option>

                    {services.map(
                      (
                        service
                      ) => (
                        <option
                          key={
                            service.id
                          }
                          value={
                            service.id
                          }
                        >
                          {
                            service.name
                          }{" "}
                          —{" "}
                          {
                            service.price
                          }{" "}
                          грн
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              {!selectedServiceId && (
                <input
                  value={
                    appointmentService
                  }
                  onChange={(
                    event
                  ) =>
                    setAppointmentService(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    t.serviceName
                  }
                  className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
                />
              )}

              <div className="flex min-w-0 items-start gap-5">
                <div className="w-[40%] min-w-0">
                  <label className="mb-1 block text-sm text-neutral-500">
                    {
                      t.date
                    }
                  </label>

                  <input
                    type="date"
                    value={
                      appointmentDate
                    }
                    onChange={(
                      event
                    ) =>
                      setAppointmentDate(
                        event.target
                          .value
                      )
                    }
                    className="block h-12 w-full min-w-0 appearance-none rounded-xl border border-rose-200 bg-white px-3 py-0 text-base leading-[48px] text-black"
                  />
                </div>

                <div className="w-[40%] min-w-0">
                  <label className="mb-1 block text-sm text-neutral-500">
                    {
                      t.time
                    }
                  </label>

                  <input
                    type="time"
                    value={
                      appointmentTime
                    }
                    onChange={(
                      event
                    ) =>
                      setAppointmentTime(
                        event.target
                          .value
                      )
                    }
                    className="block h-12 w-full min-w-0 appearance-none rounded-xl border border-rose-200 bg-white px-3 py-0 text-base leading-[48px] text-black"
                  />
                </div>
              </div>

              <select
                value={
                  appointmentDuration
                }
                onChange={(
                  event
                ) =>
                  setAppointmentDuration(
                    event.target
                      .value
                  )
                }
                className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
              >
                {Array.from(
                  {
                    length:
                      12,
                  },
                  (
                    _,
                    index
                  ) =>
                    (index +
                      1) *
                    30
                ).map(
                  (
                    minutes
                  ) => (
                    <option
                      key={
                        minutes
                      }
                      value={
                        minutes
                      }
                    >
                      {formatDurationLabel(
                        minutes,
                        language
                      )}
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                min="0"
                value={
                  appointmentPrice
                }
                onChange={(
                  event
                ) =>
                  setAppointmentPrice(
                    event.target
                      .value
                  )
                }
                placeholder={
                  t.price
                }
                className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
              />

              <select
                value={
                  appointmentStatus
                }
                onChange={(
                  event
                ) =>
                  setAppointmentStatus(
                    event.target
                      .value as AppointmentStatus
                  )
                }
                className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
              >
                <option value="scheduled">
                  {
                    t.scheduledStatus
                  }
                </option>

                <option value="completed">
                  {
                    t.completedStatus
                  }
                </option>

                <option value="no-show">
                  {
                    t.noShowStatus
                  }
                </option>

                <option value="cancelled">
                  {
                    t.cancelledStatus
                  }
                </option>
              </select>

              {editingAppointmentId !==
                null &&
                appointmentStatus ===
                  "scheduled" && (
                  <button
                    onClick={() => {
                      const appointment =
                        appointments.find(
                          (
                            item
                          ) =>
                            item.id ===
                            editingAppointmentId
                        );

                      if (
                        appointment
                      ) {
                        setIsAppointmentModalOpen(
                          false
                        );

                        openReminder(
                          appointment
                        );
                      }
                    }}
                    className="h-12 w-full rounded-xl bg-sky-50 font-medium text-sky-700"
                  >
                    {
                      t.remindClient
                    }
                  </button>
                )}

              {appointmentError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {
                    appointmentError
                  }

                  {hasConflict && (
                    <button
                      onClick={
                        actuallySaveAppointment
                      }
                      className="mt-3 h-12 w-full rounded-xl bg-white"
                    >
                      {
                        t.forceSave
                      }
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={
                  saveAppointment
                }
                className="h-12 w-full rounded-xl bg-black font-medium text-white"
              >
                {editingAppointmentId !==
                null
                  ? t.saveChanges
                  : t.createAppointment}
              </button>

              {editingAppointmentId !==
                null && (
                <button
                  onClick={() =>
                    deleteAppointment(
                      editingAppointmentId
                    )
                  }
                  className="h-12 w-full rounded-xl bg-red-50 text-red-600"
                >
                  {
                    t.deleteAppointment
                  }
                </button>
              )}
            </div>
          </Modal>
        )}

        {isClientModalOpen && (
          <Modal
            onClose={() =>
              setIsClientModalOpen(
                false
              )
            }
          >
            <h2 className="text-xl font-semibold">
              {editingClientId !==
              null
                ? t.editClient
                : t.newClient}
            </h2>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-neutral-500">
                  {
                    t.name
                  }
                </label>

                <input
                  value={
                    clientName
                  }
                  onChange={(
                    event
                  ) =>
                    setClientName(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    t.name
                  }
                  className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3 text-base"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-500">
                  {
                    t.phone
                  }
                </label>

                <input
                  value={
                    clientPhone
                  }
                  onChange={(
                    event
                  ) =>
                    setClientPhone(
                      event.target
                        .value
                    )
                  }
                  placeholder="+380..."
                  inputMode="tel"
                  className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3 text-base"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-500">
                  Telegram
                </label>

                <input
                  value={
                    clientTelegram
                  }
                  onChange={(
                    event
                  ) =>
                    setClientTelegram(
                      event.target
                        .value
                    )
                  }
                  placeholder="@user"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3 text-base"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-500">
                  Instagram
                </label>

                <input
                  value={
                    clientInstagram
                  }
                  onChange={(
                    event
                  ) =>
                    setClientInstagram(
                      event.target
                        .value
                    )
                  }
                  placeholder="user"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3 text-base"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-500">
                  {
                    t.note
                  }
                </label>

                <textarea
                  value={
                    clientNote
                  }
                  onChange={(
                    event
                  ) =>
                    setClientNote(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    t.note
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-rose-200 bg-white p-3 text-base"
                />
              </div>

              <button
                onClick={
                  saveClient
                }
                className="h-12 w-full rounded-xl bg-black font-medium text-white"
              >
                {
                  t.save
                }
              </button>
            </div>
          </Modal>
        )}

        {isClientDetailsOpen &&
          selectedClient && (
            <Modal
              onClose={() =>
                setIsClientDetailsOpen(
                  false
                )
              }
            >
              <h2 className="text-2xl font-semibold">
                {
                  selectedClient.name
                }
              </h2>

              <div className="mt-4 space-y-2">
                <div className="flex h-12 items-center rounded-xl bg-white/70 px-3">
                  <span className="w-24 shrink-0 text-xs text-neutral-400">
                    {
                      t.phone
                    }
                  </span>

                  <span className="truncate text-sm">
                    {selectedClient.phone ||
                      "—"}
                  </span>
                </div>

                <div className="flex h-12 items-center rounded-xl bg-white/70 px-3">
                  <span className="w-24 shrink-0 text-xs text-neutral-400">
                    Telegram
                  </span>

                  <span className="truncate text-sm">
                    {selectedClient.telegram ||
                      "—"}
                  </span>
                </div>

                <div className="flex h-12 items-center rounded-xl bg-white/70 px-3">
                  <span className="w-24 shrink-0 text-xs text-neutral-400">
                    Instagram
                  </span>

                  <span className="truncate text-sm">
                    {selectedClient.instagram ||
                      "—"}
                  </span>
                </div>
              </div>

              {selectedClient.note && (
                <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm">
                  {
                    selectedClient.note
                  }
                </p>
              )}

              <div className="mt-4 flex gap-2">
                {selectedClient.phone && (
                  <a
                    href={`tel:${selectedClient.phone.replace(
                      /[^+\d]/g,
                      ""
                    )}`}
                    className="flex h-12 flex-1 items-center justify-center rounded-xl bg-black text-center text-sm font-medium text-white"
                  >
                    {
                      t.call
                    }
                  </a>
                )}

                {selectedClient.telegram && (
                  <button
                    onClick={() =>
                      window.open(
                        getTelegramUrl(
                          selectedClient.telegram
                        ),
                        "_blank"
                      )
                    }
                    className="h-12 flex-1 rounded-xl bg-white text-sm font-medium"
                  >
                    Telegram
                  </button>
                )}

                {selectedClient.instagram && (
                  <button
                    onClick={() =>
                      window.open(
                        getInstagramUrl(
                          selectedClient.instagram
                        ),
                        "_blank"
                      )
                    }
                    className="h-12 flex-1 rounded-xl bg-white text-sm font-medium"
                  >
                    Instagram
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedClientId(
                    String(
                      selectedClient.id
                    )
                  );

                  setAppointmentDate(
                    selectedDateKey
                  );

                  setAppointmentName(
                    ""
                  );

                  setEditingAppointmentId(
                    null
                  );

                  setIsClientDetailsOpen(
                    false
                  );

                  setActiveTab(
                    "calendar"
                  );

                  setIsAppointmentModalOpen(
                    true
                  );
                }}
                className="mt-4 h-12 w-full rounded-xl bg-black font-medium text-white"
              >
                {
                  t.bookClient
                }
              </button>

              <button
                onClick={() =>
                  openEditClient(
                    selectedClient
                  )
                }
                className="mt-2 h-12 w-full rounded-xl bg-white font-medium"
              >
                {
                  t.editClientButton
                }
              </button>

              <h3 className="mt-6 font-semibold">
                {
                  t.futureAppointments
                }
              </h3>

              <div className="mt-2 space-y-2">
                {futureClientAppointments.map(
                  (
                    appointment
                  ) => (
                    <div
                      key={
                        appointment.id
                      }
                      className="rounded-xl bg-white/70 p-3"
                    >
                      <p className="font-medium">
                        {formatFullDate(
                          appointment.date,
                          language
                        )}{" "}
                        ·{" "}
                        {
                          appointment.time
                        }
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {
                          appointment.service
                        }
                      </p>

                      <button
                        onClick={() =>
                          openReminder(
                            appointment
                          )
                        }
                        className="mt-3 h-10 rounded-lg bg-sky-50 px-4 text-sm font-medium text-sky-700"
                      >
                        {
                          t.remind
                        }
                      </button>
                    </div>
                  )
                )}
              </div>

              <h3 className="mt-6 font-semibold">
                {
                  t.history
                }
              </h3>

              <div className="mt-2 space-y-2">
                {pastClientAppointments.map(
                  (
                    appointment
                  ) => (
                    <div
                      key={
                        appointment.id
                      }
                      className="rounded-xl bg-white/70 p-3 text-sm"
                    >
                      {formatFullDate(
                        appointment.date,
                        language
                      )}{" "}
                      ·{" "}
                      {
                        appointment.service
                      }
                    </div>
                  )
                )}
              </div>

              <button
                onClick={() =>
                  deleteClient(
                    selectedClient.id
                  )
                }
                className="mt-6 h-12 w-full rounded-xl bg-red-50 text-red-600"
              >
                {
                  t.deleteClient
                }
              </button>
            </Modal>
          )}

        {isServiceModalOpen && (
          <Modal
            onClose={() =>
              setIsServiceModalOpen(
                false
              )
            }
          >
            <h2 className="text-xl font-semibold">
              {editingServiceId !==
              null
                ? t.editService
                : t.newService}
            </h2>

            <div className="mt-5 space-y-3">
              <input
                value={
                  serviceName
                }
                onChange={(
                  event
                ) =>
                  setServiceName(
                    event.target
                      .value
                  )
                }
                placeholder={
                  t.serviceName
                }
                className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
              />

              <select
                value={
                  serviceDuration
                }
                onChange={(
                  event
                ) =>
                  setServiceDuration(
                    event.target
                      .value
                  )
                }
                className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
              >
                {Array.from(
                  {
                    length:
                      12,
                  },
                  (
                    _,
                    index
                  ) =>
                    (index +
                      1) *
                    30
                ).map(
                  (
                    minutes
                  ) => (
                    <option
                      key={
                        minutes
                      }
                      value={
                        minutes
                      }
                    >
                      {formatDurationLabel(
                        minutes,
                        language
                      )}
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                min="0"
                value={
                  servicePrice
                }
                onChange={(
                  event
                ) =>
                  setServicePrice(
                    event.target
                      .value
                  )
                }
                placeholder={
                  t.servicePrice
                }
                className="h-12 w-full rounded-xl border border-rose-200 bg-white px-3"
              />

              <button
                onClick={
                  saveService
                }
                className="h-12 w-full rounded-xl bg-black font-medium text-white"
              >
                {
                  t.save
                }
              </button>
            </div>
          </Modal>
        )}

        {isReminderModalOpen && (
          <Modal
            onClose={() => {
              setIsReminderModalOpen(
                false
              );

              setReminderClientId(
                null
              );
            }}
          >
            <h2 className="text-xl font-semibold">
              {
                t.reminder
              }
            </h2>

            <textarea
              value={
                reminderText
              }
              onChange={(
                event
              ) => {
                setReminderText(
                  event.target
                    .value
                );

                setReminderCopied(
                  false
                );
              }}
              rows={7}
              className="mt-5 w-full resize-none rounded-xl border border-rose-200 bg-white p-3 text-base"
            />

            {(reminderClient?.telegram ||
              reminderClient?.instagram) && (
              <div className="mt-3 flex gap-2">
                {reminderClient?.telegram && (
                  <button
                    onClick={
                      openTelegramReminder
                    }
                    className="h-12 flex-1 rounded-xl bg-sky-50 text-sm font-semibold text-sky-700"
                  >
                    Telegram
                  </button>
                )}

                {reminderClient?.instagram && (
                  <button
                    onClick={
                      openInstagramReminder
                    }
                    className="h-12 flex-1 rounded-xl bg-rose-100 text-sm font-semibold text-rose-700"
                  >
                    Instagram
                  </button>
                )}
              </div>
            )}

            <button
              onClick={
                copyReminder
              }
              className="mt-2 h-12 w-full rounded-xl bg-black font-medium text-white"
            >
              {reminderCopied
                ? t.copied
                : t.copyText}
            </button>
          </Modal>
        )}
      </div>
    </main>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={
        onClick
      }
      className={`flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border text-[10px] font-medium transition-all ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white shadow-md"
          : "border-white/70 bg-white/65 text-neutral-500 shadow-sm"
      }`}
    >
      <span className="flex h-6 items-center justify-center">
        {
          icon
        }
      </span>

      <span className="max-w-full truncate px-1">
        {
          children
        }
      </span>
    </button>
  );
}

function StatCard({
  label,
  value,
  tone = "white",
}: {
  label: string;
  value: string;

  tone?:
    | "white"
    | "blue"
    | "green"
    | "red"
    | "orange";
}) {
  const tones = {
    white:
      "bg-white/65",

    blue:
      "bg-sky-50/90",

    green:
      "bg-green-50/90",

    red:
      "bg-red-50/90",

    orange:
      "bg-orange-50/90",
  };

  return (
    <div
      className={`rounded-2xl p-4 ${tones[tone]}`}
    >
      <p className="text-xs text-neutral-500">
        {
          label
        }
      </p>

      <p className="mt-2 text-xl font-semibold">
        {
          value
        }
      </p>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-rose-50/95 p-5 backdrop-blur-md">
        <div className="flex justify-end">
          <button
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm text-neutral-500"
          >
            ✕
          </button>
        </div>

        {
          children
        }
      </div>
    </div>
  );
}