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
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import NotificationSettings from "./notification-settings";

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
  addonServiceIds: number[];
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
  isAddon: boolean;
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

const LOCAL_STORAGE_OWNER_KEY =
  "nails-calendar-local-owner";

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
    weekend: "Выходной",

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
    manualName: "Новый клиент",
    clientName: "Имя клиента",
    clientPhone: "Телефон клиента",

    service: "Услуга",
    mainService: "Основная услуга",
    extraServices: "Доп. услуги",
    noExtraServices: "Дополнительных услуг пока нет",
    manualService: "Ввести вручную",
    serviceName: "Название услуги",

    serviceType: "Тип услуги",
    mainServiceType: "Основная",
    addonServiceType: "Доп. услуга",

    date: "Дата",
    time: "Время",
    duration: "Длительность",
    price: "Цена, грн",
    status: "Статус",
    total: "Итого",

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

    deleteServiceConfirm:
      "Удалить эту услугу?",
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
    weekend: "Вихідний",

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
    manualName: "Новий клієнт",
    clientName: "Ім'я клієнта",
    clientPhone: "Телефон клієнта",

    service: "Послуга",
    mainService: "Основна послуга",
    extraServices: "Дод. послуги",
    noExtraServices: "Додаткових послуг поки немає",
    manualService: "Ввести вручну",
    serviceName: "Назва послуги",

    serviceType: "Тип послуги",
    mainServiceType: "Основна",
    addonServiceType: "Дод. послуга",

    date: "Дата",
    time: "Час",
    duration: "Тривалість",
    price: "Ціна, грн",
    status: "Статус",
    total: "Разом",

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
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function getLocale(
  language: Language
) {
  return language === "uk"
    ? "uk-UA"
    : "ru-RU";
}

function formatDateTitle(
  date: Date,
  language: Language
) {
  return new Intl.DateTimeFormat(
    getLocale(
      language
    ),
    {
      day: "numeric",
      month: "long",
    }
  ).format(
    date
  );
}

function formatMonthTitle(
  date: Date,
  language: Language
) {
  return new Intl.DateTimeFormat(
    getLocale(
      language
    ),
    {
      month: "long",
      year: "numeric",
    }
  ).format(
    date
  );
}

function formatFullDate(
  dateString: string,
  language: Language
) {
  return new Intl.DateTimeFormat(
    getLocale(
      language
    ),
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
    getLocale(
      language
    ),
    {
      weekday: "long",
    }
  ).format(
    date
  );
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

function timeToMinutes(
  time: string
) {
  const [
    hours,
    minutes,
  ] =
    time
      .split(":")
      .map(
        Number
      );

  return (
    hours * 60 +
    minutes
  );
}

function minutesToTime(
  totalMinutes: number
) {
  const hours =
    Math.floor(
      totalMinutes /
        60
    );

  const minutes =
    totalMinutes %
    60;

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )}`;
}

function formatDurationLabel(
  minutes: number,
  language: Language
) {
  if (
    minutes === 30
  ) {
    return language ===
      "uk"
      ? "30 хвилин"
      : "30 минут";
  }

  const hours =
    Math.floor(
      minutes /
        60
    );

  const half =
    minutes %
      60 ===
    30;

  if (half) {
    return `${hours}:30`;
  }

  if (
    language ===
    "uk"
  ) {
    if (
      hours === 1
    ) {
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

  if (
    hours === 1
  ) {
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
    ((timeToMinutes(
      time
    ) -
      startHour *
        60) /
      60) *
    HOUR_HEIGHT
  );
}

function getAppointmentHeight(
  duration: number
) {
  return Math.max(
    (duration /
      60) *
      HOUR_HEIGHT,
    48
  );
}

function safeArray<T>(
  value: string | null
): T[] {
  if (!value) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(
        value
      );

    return Array.isArray(
      parsed
    )
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
  if (!value) {
    return fallback;
  }

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
    .replace(
      /^t\.me\//,
      ""
    )
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
    .replace(
      /^@/,
      ""
    )
    .split("/")[0]
    .split("?")[0];
}

function getTelegramUrl(
  value: string
) {
  const username =
    cleanUsername(
      value
    );

  return username
    ? `https://t.me/${username}`
    : "";
}

function getInstagramUrl(
  value: string
) {
  const username =
    cleanUsername(
      value
    );

  return username
    ? `https://instagram.com/${username}`
    : "";
}

function normalizePhone(
  phone: string
) {
  return phone.replace(
    /\D/g,
    ""
  );
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
    client.social?.trim() ||
    "";

  let legacyTelegram =
    "";

  let legacyInstagram =
    "";

  if (
    legacy.startsWith(
      "@"
    ) ||
    legacy.includes(
      "t.me"
    ) ||
    legacy.includes(
      "telegram"
    )
  ) {
    legacyTelegram =
      legacy;
  } else if (
    legacy
  ) {
    legacyInstagram =
      legacy;
  }

  return {
    id:
      Number(
        client.id
      ),

    name:
      client.name ??
      "",

    phone:
      client.phone ??
      "",

    telegram:
      client.telegram?.trim() ||
      legacyTelegram,

    instagram:
      client.instagram?.trim() ||
      legacyInstagram,

    note:
      client.note ??
      "",
  };
}

function normalizeService(
  service: Partial<Service> & {
    id: number;
  }
): Service {
  return {
    id:
      Number(
        service.id
      ),

    name:
      service.name ??
      "",

    duration:
      Number(
        service.duration ??
          90
      ),

    price:
      Number(
        service.price ??
          0
      ),

    isAddon:
      Boolean(
        service.isAddon
      ),
  };
}

function getWeekDates(
  date: Date
) {
  const current =
    new Date(
      date
    );

  const day =
    current.getDay();

  const diffToMonday =
    day === 0
      ? -6
      : 1 - day;

  const monday =
    new Date(
      current
    );

  monday.setDate(
    current.getDate() +
      diffToMonday
  );

  return Array.from(
    {
      length: 7,
    },
    (
      _,
      index
    ) => {
      const item =
        new Date(
          monday
        );

      item.setDate(
        monday.getDate() +
          index
      );

      return item;
    }
  );
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

  if (
    weekday === 0
  ) {
    weekday = 7;
  }

  const before =
    weekday - 1;

  const cells: {
    date: Date;
    isCurrentMonth: boolean;
  }[] = [];

  for (
    let index =
      before;
    index > 0;
    index--
  ) {
    cells.push({
      date:
        new Date(
          year,
          month,
          1 -
            index
        ),

      isCurrentMonth:
        false,
    });
  }

  for (
    let day = 1;
    day <=
    last.getDate();
    day++
  ) {
    cells.push({
      date:
        new Date(
          year,
          month,
          day
        ),

      isCurrentMonth:
        true,
    });
  }

  while (
    cells.length %
      7 !==
    0
  ) {
    const day =
      cells.length -
      before -
      last.getDate() +
      1;

    cells.push({
      date:
        new Date(
          year,
          month +
            1,
          day
        ),

      isCurrentMonth:
        false,
    });
  }

  return cells;
}

function getStatusBadgeClass(
  status: AppointmentStatus
) {
  if (
    status ===
    "completed"
  ) {
    return "border-emerald-200 bg-emerald-50/90 text-emerald-700";
  }

  if (
    status ===
    "cancelled"
  ) {
    return "border-rose-200 bg-rose-50/90 text-rose-700";
  }

  if (
    status ===
    "no-show"
  ) {
    return "border-amber-200 bg-amber-50/90 text-amber-700";
  }

  return "border-sky-200 bg-sky-50/90 text-sky-700";
}

function getAppointmentAccentClass(
  status: AppointmentStatus
) {
  if (
    status ===
    "completed"
  ) {
    return "bg-emerald-400";
  }

  if (
    status ===
    "cancelled"
  ) {
    return "bg-rose-400";
  }

  if (
    status ===
    "no-show"
  ) {
    return "bg-amber-400";
  }

  return "bg-fuchsia-400";
}

function sumPrices(
  items: Appointment[]
) {
  return items.reduce(
    (
      sum,
      item
    ) =>
      sum +
      Number(
        item.price ||
          0
      ),
    0
  );
}

export default function Home() {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const settingsReadyRef =
    useRef(
      false
    );

  const syncingRef =
    useRef(
      false
    );

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
    useState(
      false
    );

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
    useState(
      false
    );

  const [
    authMode,
    setAuthMode,
  ] =
    useState<
      "login" | "register"
    >(
      "login"
    );

  const [
    registerName,
    setRegisterName,
  ] =
    useState("");

  const [
    language,
    setLanguage,
  ] =
    useState<Language>(
      "uk"
    );

  const t =
    translations[
      language
    ];

  const bottomNavItems = [
    {
      key: "calendar",
      label: t.calendar,
      icon: "/icons/nav-calendar.png",
    },
    {
      key: "clients",
      label: t.clients,
      icon: "/icons/nav-clients.png",
    },
    {
      key: "analytics",
      label: t.analytics,
      icon: "/icons/nav-analytics.png",
    },
    {
      key: "settings",
      label: t.settings,
      icon: "/icons/nav-settings.png",
    },
  ] as const;

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
    useState(
      true
    );

  const [
    pendingCount,
    setPendingCount,
  ] =
    useState(
      0
    );

  const [
    isSyncing,
    setIsSyncing,
  ] =
    useState(
      false
    );

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
    useState<
      Client[]
    >([]);

  const [
    services,
    setServices,
  ] =
    useState<
      Service[]
    >([]);

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
    useState(
      false
    );

  const [
    isAppointmentModalOpen,
    setIsAppointmentModalOpen,
  ] =
    useState(
      false
    );

  const [
    isClientModalOpen,
    setIsClientModalOpen,
  ] =
    useState(
      false
    );

  const [
    isClientDetailsOpen,
    setIsClientDetailsOpen,
  ] =
    useState(
      false
    );

  const [
    isServiceModalOpen,
    setIsServiceModalOpen,
  ] =
    useState(
      false
    );

  const [
    isReminderModalOpen,
    setIsReminderModalOpen,
  ] =
    useState(
      false
    );

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
    selectedAddonServiceIds,
    setSelectedAddonServiceIds,
  ] =
    useState<number[]>(
      []
    );

  const [
    appointmentName,
    setAppointmentName,
  ] =
    useState("");

  const [
    appointmentPhone,
    setAppointmentPhone,
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
    useState(
      "90"
    );

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
    useState(
      false
    );

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
    useState(
      "90"
    );

  const [
    servicePrice,
    setServicePrice,
  ] =
    useState("");

  const [
    serviceIsAddon,
    setServiceIsAddon,
  ] =
    useState(
      false
    );

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
    useState(
      false
    );

  const [
    reminderClientId,
    setReminderClientId,
  ] =
    useState<number | null>(
      null
    );

  function getStorageKey(
    baseKey: string
  ) {
    const userId =
      session?.user.id;

    return userId
      ? `${baseKey}:${userId}`
      : baseKey;
  }

  function migrateLegacyLocalStorage(
    userId: string
  ) {
    const existingOwner =
      localStorage.getItem(
        LOCAL_STORAGE_OWNER_KEY
      );

    if (
      existingOwner
    ) {
      return;
    }

    const keys = [
      APPOINTMENTS_STORAGE_KEY,
      CLIENTS_STORAGE_KEY,
      SERVICES_STORAGE_KEY,
      WORK_SETTINGS_STORAGE_KEY,
      LANGUAGE_STORAGE_KEY,
      OFFLINE_QUEUE_STORAGE_KEY,
    ];

    for (
      const key of keys
    ) {
      const legacyValue =
        localStorage.getItem(
          key
        );

      const scopedKey =
        `${key}:${userId}`;

      if (
        legacyValue !== null &&
        localStorage.getItem(
          scopedKey
        ) === null
      ) {
        localStorage.setItem(
          scopedKey,
          legacyValue
        );
      }

      localStorage.removeItem(
        key
      );
    }

    localStorage.setItem(
      LOCAL_STORAGE_OWNER_KEY,
      userId
    );
  }

  function getQueue() {
    return safeArray<PendingOperation>(
      localStorage.getItem(
        getStorageKey(
          OFFLINE_QUEUE_STORAGE_KEY
        )
      )
    );
  }

  function saveQueue(
    queue: PendingOperation[]
  ) {
    localStorage.setItem(
      getStorageKey(
        OFFLINE_QUEUE_STORAGE_KEY
      ),
      JSON.stringify(
        queue
      )
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
        (
          item
        ) =>
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
          const {
            error,
          } =
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

          if (
            error
          ) {
            throw error;
          }

          return;
        }

        const {
          error,
        } =
          await supabase
            .from(
              operation.table
            )
            .delete()
            .eq(
              operation.column,
              operation.value
            );

        if (
          error
        ) {
          throw error;
        }
      },
      [
        supabase,
      ]
    );

  const syncOfflineQueue =
    useCallback(
      async () => {
        if (
          !session ||
          !navigator.onLine ||
          syncingRef.current
        ) {
          return;
        }

        let queue =
          safeArray<PendingOperation>(
            localStorage.getItem(
              getStorageKey(
                OFFLINE_QUEUE_STORAGE_KEY
              )
            )
          );

        setPendingCount(
          queue.length
        );

        if (
          queue.length ===
          0
        ) {
          setDatabaseStatus(
            "connected"
          );

          return;
        }

        syncingRef.current =
          true;

        setIsSyncing(
          true
        );

        setDatabaseStatus(
          "connecting"
        );

        while (
          queue.length >
          0
        ) {
          const operation =
            queue[0];

          try {
            await executeOperation(
              operation
            );

            queue =
              queue.slice(
                1
              );

            localStorage.setItem(
              getStorageKey(
                OFFLINE_QUEUE_STORAGE_KEY
              ),
              JSON.stringify(
                queue
              )
            );

            setPendingCount(
              queue.length
            );
          } catch (
            error
          ) {
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

        setIsSyncing(
          false
        );

        if (
          queue.length ===
          0
        ) {
          setDatabaseStatus(
            "connected"
          );
        }
      },
      [
        executeOperation,
        session,
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
    } catch (
      error
    ) {
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
          getStorageKey(
            CLIENTS_STORAGE_KEY
          )
        )
      );

    const rawServices =
      safeArray<Service>(
        localStorage.getItem(
          getStorageKey(
            SERVICES_STORAGE_KEY
          )
        )
      );

    const rawAppointments =
      safeArray<Appointment>(
        localStorage.getItem(
          getStorageKey(
            APPOINTMENTS_STORAGE_KEY
          )
        )
      );

    setClients(
      rawClients.map(
        (
          client
        ) =>
          normalizeClient(
            client
          )
      )
    );

    setServices(
      rawServices.map(
        (
          service
        ) =>
          normalizeService(
            service
          )
      )
    );

    setAppointments(
      rawAppointments.map(
        (
          appointment
        ) => ({
          ...appointment,

          addonServiceIds:
            Array.isArray(
              appointment.addonServiceIds
            )
              ? appointment.addonServiceIds.map(
                  Number
                )
              : [],
        })
      )
    );

    setWorkSettings(
      safeObject<WorkSettings>(
        localStorage.getItem(
          getStorageKey(
            WORK_SETTINGS_STORAGE_KEY
          )
        ),
        DEFAULT_WORK_SETTINGS
      )
    );

    const storedLanguage =
      localStorage.getItem(
        getStorageKey(
          LANGUAGE_STORAGE_KEY
        )
      );

    if (
      storedLanguage ===
        "ru" ||
      storedLanguage ===
        "uk"
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

  setIsOnline(
    navigator.onLine
  );

  setPendingCount(
    0
  );

  function handleOnline() {
    setIsOnline(
      true
    );

    void syncOfflineQueue();
  }

  function handleOffline() {
    setIsOnline(
      false
    );

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
}, [
  syncOfflineQueue,
]);

useEffect(() => {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  if (
    appointments.length === 0
  ) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const appointmentId =
    params.get(
      "appointment"
    );

  if (!appointmentId) {
    return;
  }

  const appointment =
    appointments.find(
      (item) =>
        String(item.id) ===
        String(
          appointmentId
        )
    );

  if (!appointment) {
    return;
  }

  setSelectedDate(
  new Date(
    `${appointment.date}T12:00:00`
  )
);

  setVisibleMonth(
    new Date(
      `${appointment.date}T12:00:00`
    )
  );

  setActiveTab(
    "calendar"
  );

  openEditAppointment(
    appointment
  );

  window.history.replaceState(
    {},
    "",
    window.location.pathname
  );
}, [appointments]);

  useEffect(() => {
    const storedLanguage =
      localStorage.getItem(
        LANGUAGE_STORAGE_KEY
      );

    if (
      storedLanguage ===
        "ru" ||
      storedLanguage ===
        "uk"
    ) {
      setLanguage(
        storedLanguage
      );
    }

    supabase.auth
      .getSession()
      .then(
        ({
          data,
        }) => {
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
  }, [
    supabase,
  ]);

  useEffect(() => {
    if (
      !session
    ) {
      return;
    }

    const userId =
      session.user.id;

    async function loadData() {
      migrateLegacyLocalStorage(
        userId
      );

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
              .select(
                "*"
              )
              .order(
                "name"
              ),

            supabase
              .from(
                "services"
              )
              .select(
                "*"
              )
              .order(
                "name"
              ),

            supabase
              .from(
                "appointments"
              )
              .select(
                "*"
              )
              .order(
                "date"
              )
              .order(
                "time"
              ),

            supabase
              .from(
                "settings"
              )
              .select(
                "*"
              )
              .eq(
                "id",
                userId
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
            (
              row
            ) =>
              normalizeClient({
                id:
                  Number(
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
                  "",

                instagram:
                  row.instagram ??
                  "",

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
            (
              row
            ) =>
              normalizeService({
                id:
                  Number(
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

                isAddon:
                  Boolean(
                    row.is_addon
                  ),
              })
          );

        const nextAppointments: Appointment[] =
          (
            appointmentsResult.data ??
            []
          ).map(
            (
              row
            ) => ({
              id:
                Number(
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

              addonServiceIds:
                Array.isArray(
                  row.addon_service_ids
                )
                  ? row.addon_service_ids.map(
                      Number
                    )
                  : [],

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
                (
                  row.status ??
                  "scheduled"
                ) as AppointmentStatus,
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
      } catch (
        error
      ) {
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
    if (
      !isLoaded ||
      !session
    ) {
      return;
    }

    localStorage.setItem(
      getStorageKey(
        CLIENTS_STORAGE_KEY
      ),
      JSON.stringify(
        clients
      )
    );
  }, [
    clients,
    isLoaded,
    session,
  ]);

  useEffect(() => {
    if (
      !isLoaded ||
      !session
    ) {
      return;
    }

    localStorage.setItem(
      getStorageKey(
        SERVICES_STORAGE_KEY
      ),
      JSON.stringify(
        services
      )
    );
  }, [
    services,
    isLoaded,
    session,
  ]);

  useEffect(() => {
    if (
      !isLoaded ||
      !session
    ) {
      return;
    }

    localStorage.setItem(
      getStorageKey(
        APPOINTMENTS_STORAGE_KEY
      ),
      JSON.stringify(
        appointments
      )
    );
  }, [
    appointments,
    isLoaded,
    session,
  ]);

  useEffect(() => {
    if (
      !isLoaded ||
      !session
    ) {
      return;
    }

    localStorage.setItem(
      getStorageKey(
        LANGUAGE_STORAGE_KEY
      ),
      language
    );

    localStorage.setItem(
      getStorageKey(
        WORK_SETTINGS_STORAGE_KEY
      ),
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
              session.user.id,

            payload: {
              id:
                session.user.id,

              user_id:
                session.user.id,

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
    session,
  ]);

  async function handleLogin(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !navigator.onLine
    ) {
      setLoginError(
        language ===
          "uk"
          ? "Для входу потрібен інтернет."
          : "Для входа нужен интернет."
      );

      return;
    }

    setLoginLoading(
      true
    );

    setLoginError(
      ""
    );

    const {
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email:
            loginEmail.trim(),

          password:
            loginPassword,
        }
      );

    if (
      error
    ) {
      setLoginError(
        language ===
          "uk"
          ? "Невірний email або пароль."
          : "Неверный email или пароль."
      );
    }

    setLoginLoading(
      false
    );
  }

  async function handleRegister(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !navigator.onLine
    ) {
      setLoginError(
        language ===
          "uk"
          ? "Для реєстрації потрібен інтернет."
          : "Для регистрации нужен интернет."
      );

      return;
    }

    if (
      !registerName.trim()
    ) {
      setLoginError(
        language ===
          "uk"
          ? "Вкажи ім'я."
          : "Укажи имя."
      );

      return;
    }

    if (
      !loginEmail.trim()
    ) {
      setLoginError(
        "Email обязателен."
      );

      return;
    }

    if (
      loginPassword.length < 6
    ) {
      setLoginError(
        language ===
          "uk"
          ? "Пароль має містити щонайменше 6 символів."
          : "Пароль должен содержать минимум 6 символов."
      );

      return;
    }

    setLoginLoading(
      true
    );

    setLoginError(
      ""
    );

    const {
      data,
      error,
    } =
      await supabase.auth.signUp({
        email:
          loginEmail.trim(),

        password:
          loginPassword,

        options: {
          data: {
            name:
              registerName.trim(),
          },
        },
      });

    if (
      error
    ) {
      setLoginError(
        error.message
      );

      setLoginLoading(
        false
      );

      return;
    }

    if (
      !data.session
    ) {
      setLoginError(
        language ===
          "uk"
          ? "Акаунт створено. Підтвердь email, а потім увійди."
          : "Аккаунт создан. Подтверди email, затем войди."
      );

      setAuthMode(
        "login"
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

    settingsReadyRef.current =
      false;

    setClients(
      []
    );

    setServices(
      []
    );

    setAppointments(
      []
    );

    setPendingCount(
      0
    );

    setIsLoaded(
      false
    );

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

  const selectedDateIsWorkDay =
    workSettings.workDays.includes(
      selectedDate.getDay()
    );

  const selectedDayAppointments =
    appointments
      .filter(
        (
          appointment
        ) =>
          appointment.date ===
          selectedDateKey
      )
      .sort(
        (
          a,
          b
        ) =>
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
    (
      workSettings.endHour -
      workSettings.startHour
    ) *
    HOUR_HEIGHT;

  const monthDays =
    getMonthCalendarDays(
      visibleMonth
    );

  const weekDates =
    getWeekDates(
      selectedDate
    );

  const mainServices =
    services.filter(
      (
        service
      ) =>
        !service.isAddon
    );

  const addonServices =
    services.filter(
      (
        service
      ) =>
        service.isAddon
    );

  const filteredClients =
    [
      ...clients,
    ]
      .filter(
        (
          client
        ) => {
          const search =
            clientSearch
              .trim()
              .toLowerCase();

          if (
            !search
          ) {
            return true;
          }

          return (
            client.name
              .toLowerCase()
              .includes(
                search
              ) ||
            client.phone
              .toLowerCase()
              .includes(
                search
              ) ||
            client.telegram
              .toLowerCase()
              .includes(
                search
              ) ||
            client.instagram
              .toLowerCase()
              .includes(
                search
              )
          );
        }
      )
      .sort(
        (
          a,
          b
        ) =>
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
          (
            client
          ) =>
            client.id ===
            selectedClientDetailsId
        )
      : undefined;

  const reminderClient =
    reminderClientId !==
    null
      ? clients.find(
          (
            client
          ) =>
            client.id ===
            reminderClientId
        )
      : undefined;

  const clientAppointments =
    selectedClientDetailsId !==
    null
      ? appointments.filter(
          (
            appointment
          ) =>
            appointment.clientId ===
            selectedClientDetailsId
        )
      : [];

  const futureClientAppointments =
    clientAppointments
      .filter(
        (
          appointment
        ) =>
          appointment.date >=
            todayKey &&
          appointment.status ===
            "scheduled"
      )
      .sort(
        (
          a,
          b
        ) => {
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
        (
          appointment
        ) =>
          appointment.date <
            todayKey ||
          appointment.status !==
            "scheduled"
      )
      .sort(
        (
          a,
          b
        ) => {
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
    useMemo(
      () => {
        const date =
          new Date(
            today
          );

        date.setDate(
          date.getDate() -
            6
        );

        return date;
      },
      [
        today,
      ]
    );

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
      (
        appointment
      ) =>
        appointment.status ===
        "completed"
    );

  const todayIncome =
    sumPrices(
      completedAppointments.filter(
        (
          appointment
        ) =>
          appointment.date ===
          todayKey
      )
    );

  const weekIncome =
    sumPrices(
      completedAppointments.filter(
        (
          appointment
        ) =>
          appointment.date >=
            sevenDaysAgoKey &&
          appointment.date <=
            todayKey
      )
    );

  const currentMonthAppointments =
    appointments.filter(
      (
        appointment
      ) =>
        appointment.date >=
          monthStartKey &&
        appointment.date <=
          monthEndKey
    );

  const currentMonthCompleted =
    currentMonthAppointments.filter(
      (
        appointment
      ) =>
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
      (
        appointment
      ) =>
        appointment.status ===
        "scheduled"
    ).length;

  const monthCompletedCount =
    currentMonthAppointments.filter(
      (
        appointment
      ) =>
        appointment.status ===
        "completed"
    ).length;

  const monthCancelledCount =
    currentMonthAppointments.filter(
      (
        appointment
      ) =>
        appointment.status ===
        "cancelled"
    ).length;

  const monthNoShowCount =
    currentMonthAppointments.filter(
      (
        appointment
      ) =>
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
            !result[
              key
            ]
          ) {
            result[
              key
            ] = {
              name:
                key,
              count:
                0,
              income:
                0,
            };
          }

          result[
            key
          ].count +=
            1;

          result[
            key
          ].income +=
            Number(
              appointment.price ||
                0
            );

          return result;
        },
        {}
      )
    ).sort(
      (
        a,
        b
      ) =>
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
      pendingCount >
        0
    ) {
      return `${t.syncing}: ${pendingCount}`;
    }

    return t.online;
  }

  function connectionClass() {
    if (
      !isOnline
    ) {
      return "border-orange-300 bg-orange-50/90 text-orange-700";
    }

    if (
      isSyncing ||
      pendingCount >
        0
    ) {
      return "border-amber-300 bg-amber-50/90 text-amber-700";
    }

    return "border-emerald-300 bg-emerald-50/90 text-emerald-700";
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

  function getAppointmentClient(
    appointment: Appointment
  ) {
    if (
      appointment.clientId ===
      undefined
    ) {
      return undefined;
    }

    return clients.find(
      (
        client
      ) =>
        client.id ===
        appointment.clientId
    );
  }

  function getAppointmentServiceLabel(
    appointment: Appointment
  ) {
    const addons =
      appointment.addonServiceIds
        .map(
          (
            id
          ) =>
            services.find(
              (
                service
              ) =>
                service.id ===
                id
            )
        )
        .filter(
          (
            service
          ): service is Service =>
            Boolean(
              service
            )
        );

    if (
      addons.length ===
      0
    ) {
      return appointment.service;
    }

    return `${appointment.service} + ${addons
      .map(
        (
          addon
        ) =>
          addon.name
      )
      .join(" + ")}`;
  }

  function calculateServiceTotals(
    mainId: string,
    addonIds: number[]
  ) {
    let duration =
      0;

    let price =
      0;

    const main =
      services.find(
        (
          service
        ) =>
          service.id ===
          Number(
            mainId
          )
      );

    if (
      main
    ) {
      duration +=
        Number(
          main.duration ||
            0
        );

      price +=
        Number(
          main.price ||
            0
        );
    }

    for (
      const addonId of
      addonIds
    ) {
      const addon =
        services.find(
          (
            service
          ) =>
            service.id ===
            addonId
        );

      if (
        addon
      ) {
        duration +=
          Number(
            addon.duration ||
              0
          );

        price +=
          Number(
            addon.price ||
              0
          );
      }
    }

    return {
      duration,
      price,
    };
  }

  function applyServiceTotals(
    mainId: string,
    addonIds: number[]
  ) {
    const totals =
      calculateServiceTotals(
        mainId,
        addonIds
      );

    if (
      totals.duration >
      0
    ) {
      setAppointmentDuration(
        String(
          totals.duration
        )
      );
    }

    setAppointmentPrice(
      String(
        totals.price
      )
    );
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

    setSelectedAddonServiceIds(
      []
    );

    setAppointmentName(
      ""
    );

    setAppointmentPhone(
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

    setSelectedAddonServiceIds(
      appointment.addonServiceIds ??
        []
    );

    setSelectedClientId(
      appointment.clientId
        ? String(
            appointment.clientId
          )
        : ""
    );

    const linkedClient =
      appointment.clientId
        ? clients.find(
            (
              client
            ) =>
              client.id ===
              appointment.clientId
          )
        : undefined;

    setAppointmentPhone(
      linkedClient?.phone ??
        ""
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
      (
        appointment
      ) => {
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

  async function ensureAppointmentClient() {
    if (
      selectedClientId
    ) {
      return clients.find(
        (
          client
        ) =>
          client.id ===
          Number(
            selectedClientId
          )
      );
    }

    const name =
      appointmentName.trim();

    const phone =
      appointmentPhone.trim();

    if (
      !name
    ) {
      return undefined;
    }

    const normalizedPhone =
      normalizePhone(
        phone
      );

    let existingClient:
      | Client
      | undefined;

    if (
      normalizedPhone
    ) {
      existingClient =
        clients.find(
          (
            client
          ) =>
            normalizePhone(
              client.phone
            ) ===
            normalizedPhone
        );
    }

    if (
      !existingClient
    ) {
      existingClient =
        clients.find(
          (
            client
          ) =>
            client.name
              .trim()
              .toLowerCase() ===
            name.toLowerCase()
        );
    }

    if (
      existingClient
    ) {
      if (
        phone &&
        !existingClient.phone
      ) {
        const updatedClient: Client =
          {
            ...existingClient,
            phone,
          };

        setClients(
          (
            current
          ) =>
            current.map(
              (
                client
              ) =>
                client.id ===
                updatedClient.id
                  ? updatedClient
                  : client
            )
        );

        await saveOrQueue({
          queueId:
            createQueueId(),

          type:
            "upsert",

          table:
            "clients",

          recordId:
            updatedClient.id,

          payload: {
            id:
              updatedClient.id,

            name:
              updatedClient.name,

            phone:
              updatedClient.phone,

            telegram:
              updatedClient.telegram,

            instagram:
              updatedClient.instagram,

            note:
              updatedClient.note,
          },
        });

        return updatedClient;
      }

      return existingClient;
    }

    const newClient: Client =
      {
        id:
          Date.now(),

        name,

        phone,

        telegram:
          "",

        instagram:
          "",

        note:
          "",
      };

    setClients(
      (
        current
      ) => [
        ...current,
        newClient,
      ]
    );

    await saveOrQueue({
      queueId:
        createQueueId(),

      type:
        "upsert",

      table:
        "clients",

      recordId:
        newClient.id,

      payload: {
        id:
          newClient.id,

        name:
          newClient.name,

        phone:
          newClient.phone,

        telegram:
          "",

        instagram:
          "",

        note:
          "",
      },
    });

    return newClient;
  }

  async function actuallySaveAppointment() {
    const client =
      await ensureAppointmentClient();

    const service =
      services.find(
        (
          item
        ) =>
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
          (
            language ===
            "uk"
              ? "Манікюр"
              : "Маникюр"
          ),

        addonServiceIds:
          selectedAddonServiceIds,

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
      (
        current
      ) => {
        if (
          editingAppointmentId !==
          null
        ) {
          return current.map(
            (
              item
            ) =>
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

        addon_service_ids:
          appointment.addonServiceIds,

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
    const selectedClient =
      clients.find(
        (
          item
        ) =>
          item.id ===
          Number(
            selectedClientId
          )
      );

    const finalName =
      selectedClient?.name ||
      appointmentName.trim();

    if (
      !finalName
    ) {
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
      (
        current
      ) =>
        current.filter(
          (
            item
          ) =>
            item.id !==
            id
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
      (
        current
      ) => {
        if (
          editingClientId !==
          null
        ) {
          return current.map(
            (
              item
            ) =>
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
        (
          current
        ) =>
          current.map(
            (
              appointment
            ) => {
              const changed =
                changedAppointments.find(
                  (
                    item
                  ) =>
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

            addon_service_ids:
              appointment.addonServiceIds,

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
      (
        current
      ) =>
        current.filter(
          (
            client
          ) =>
            client.id !==
            id
        )
    );

    setAppointments(
      (
        current
      ) =>
        current.map(
          (
            appointment
          ) =>
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

    setServiceIsAddon(
      false
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

    setServiceIsAddon(
      service.isAddon
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

        isAddon:
          serviceIsAddon,
      };

    setServices(
      (
        current
      ) => {
        if (
          editingServiceId !==
          null
        ) {
          return current.map(
            (
              item
            ) =>
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

        is_addon:
          service.isAddon,
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
      (
        current
      ) =>
        current.filter(
          (
            service
          ) =>
            service.id !==
            id
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

    const minutesFromStart =
      Math.max(
        0,
        Math.round(
          (
            y /
            HOUR_HEIGHT
          ) *
            2
        ) *
          30
      );

    const totalMinutes =
      workSettings.startHour *
        60 +
      minutesFromStart;

    const endMinutes =
      workSettings.endHour *
      60;

    if (
      totalMinutes >=
      endMinutes
    ) {
      return;
    }

    openNewAppointment(
      minutesToTime(
        totalMinutes
      )
    );
  }

  function handleServiceSelection(
    value: string
  ) {
    setSelectedServiceId(
      value
    );

    if (
      !value
    ) {
      return;
    }

    const service =
      services.find(
        (
          item
        ) =>
          item.id ===
          Number(
            value
          )
      );

    if (
      !service
    ) {
      return;
    }

    setAppointmentService(
      service.name
    );

    applyServiceTotals(
      value,
      selectedAddonServiceIds
    );
  }

  function toggleAddonService(
    id: number
  ) {
    const next =
      selectedAddonServiceIds.includes(
        id
      )
        ? selectedAddonServiceIds.filter(
            (
              item
            ) =>
              item !==
              id
          )
        : [
            ...selectedAddonServiceIds,
            id,
          ];

    setSelectedAddonServiceIds(
      next
    );

    applyServiceTotals(
      selectedServiceId,
      next
    );
  }

  function toggleWorkDay(
    day: number
  ) {
    setWorkSettings(
      (
        current
      ) => ({
        ...current,

        workDays:
          current.workDays.includes(
            day
          )
            ? current.workDays.filter(
                (
                  item
                ) =>
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
    const serviceLabel =
      getAppointmentServiceLabel(
        appointment
      );

    const text =
      `Привіт, ${appointment.name}! ` +
      `Нагадую про ваш запис ${formatUkrainianReminderDate(
        appointment.date
      )} о ${appointment.time}. ` +
      `Послуга: ${serviceLabel}. ` +
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

    if (
      url
    ) {
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

    if (
      url
    ) {
      window.open(
        url,
        "_blank"
      );
    }
  }

  if (
    !authChecked
  ) {
    return (
      <main
        className="flex h-dvh items-center justify-center"
        style={
          APP_BACKGROUND_STYLE
        }
      >
        <div className="rounded-[28px] border border-white/70 bg-white/60 px-8 py-7 shadow-xl backdrop-blur-xl">
          Nails
        </div>
      </main>
    );
  }

  if (
    !session
  ) {
    return (
      <main
        className="flex h-dvh items-center justify-center px-5"
        style={
          APP_BACKGROUND_STYLE
        }
      >
        <form
          onSubmit={
            authMode ===
              "login"
              ? handleLogin
              : handleRegister
          }
          className="w-full max-w-sm rounded-[30px] border border-white/70 bg-white/60 p-6 shadow-[0_20px_60px_rgba(110,70,90,0.18)] backdrop-blur-xl"
        >
          <h1 className="text-center text-2xl font-semibold">
            Nails
          </h1>

          <div className="mt-5 grid grid-cols-2 rounded-2xl bg-white/45 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  "login"
                );

                setLoginError(
                  ""
                );
              }}
              className={`h-10 rounded-xl text-sm font-medium transition ${
                authMode ===
                "login"
                  ? "bg-white/90 text-rose-600 shadow-[0_5px_14px_rgba(190,110,140,0.14)]"
                  : "text-neutral-500"
              }`}
            >
              Войти
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  "register"
                );

                setLoginError(
                  ""
                );
              }}
              className={`h-10 rounded-xl text-sm font-medium transition ${
                authMode ===
                "register"
                  ? "bg-white/90 text-rose-600 shadow-[0_5px_14px_rgba(190,110,140,0.14)]"
                  : "text-neutral-500"
              }`}
            >
              Регистрация
            </button>
          </div>

          {authMode ===
            "register" && (
            <input
              type="text"
              value={
                registerName
              }
              onChange={(
                event
              ) =>
                setRegisterName(
                  event.target.value
                )
              }
              placeholder={
                language ===
                  "uk"
                  ? "Ваше ім'я"
                  : "Ваше имя"
              }
              className="mt-4 h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-black shadow-sm"
            />
          )}

          <input
            type="email"
            value={
              loginEmail
            }
            onChange={(
              event
            ) =>
              setLoginEmail(
                event.target.value
              )
            }
            placeholder="Email"
            autoComplete="email"
            className={`${
              authMode ===
              "register"
                ? "mt-3"
                : "mt-4"
            } h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-black shadow-sm`}
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
                event.target.value
              )
            }
            placeholder="Пароль"
            autoComplete={
              authMode ===
                "login"
                ? "current-password"
                : "new-password"
            }
            className="mt-3 h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-4 text-black shadow-sm"
          />

          {loginError && (
            <div className="mt-3 rounded-2xl bg-white/70 p-3 text-sm text-neutral-700">
              {loginError}
            </div>
          )}

          <button
            disabled={
              loginLoading
            }
            className="mt-4 h-12 w-full rounded-2xl bg-neutral-900 font-medium text-white shadow-lg disabled:opacity-60"
          >
            {loginLoading
              ? "..."
              : authMode ===
                "login"
                ? "Войти"
                : "Создать аккаунт"}
          </button>
        </form>
      </main>
    );
  }

  if (
    !isLoaded
  ) {
    return (
      <main
        className="flex h-dvh items-center justify-center"
        style={
          APP_BACKGROUND_STYLE
        }
      >
        <div className="rounded-[28px] border border-white/70 bg-white/60 px-8 py-7 shadow-xl backdrop-blur-xl">
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
      <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-rose-50/20 backdrop-blur-[1px]">
        {activeTab ===
          "calendar" && (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 px-3 pb-2 pt-3">
              <div className="rounded-[28px] border border-white/70 bg-white/55 p-4 shadow-[0_12px_40px_rgba(120,80,95,0.12)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
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
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-white/75 bg-white/72 text-[24px] font-light text-neutral-700 shadow-[0_8px_18px_rgba(110,75,90,0.10)] backdrop-blur-md transition active:scale-95"
                  >
                    ‹
                  </button>

                  <button
                    onClick={
                      goToday
                    }
                    className="min-w-0 px-3 text-center"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      {calendarView ===
                      "day"
                        ? selectedDateIsToday
                          ? t.today
                          : formatWeekday(
                              selectedDate,
                              language
                            )
                        : t.calendar}
                    </p>

                    <h1 className="mt-0.5 truncate text-[22px] font-semibold capitalize tracking-tight">
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
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-white/75 bg-white/72 text-[24px] font-light text-neutral-700 shadow-[0_8px_18px_rgba(110,75,90,0.10)] backdrop-blur-md transition active:scale-95"
                  >
                    ›
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex rounded-[18px] border border-white/55 bg-white/35 p-1 shadow-inner backdrop-blur-md">
                    <button
                      onClick={() =>
                        setCalendarView(
                          "day"
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-xs font-medium transition ${
                        calendarView ===
                        "day"
                          ? "bg-white/90 text-rose-600 shadow-[0_5px_14px_rgba(190,110,140,0.14)]"
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
                      className={`rounded-xl px-4 py-2 text-xs font-medium transition ${
                        calendarView ===
                        "month"
                          ? "bg-white/90 text-rose-600 shadow-[0_5px_14px_rgba(190,110,140,0.14)]"
                          : "text-neutral-500"
                      }`}
                    >
                      {t.month}
                    </button>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-medium ${connectionClass()}`}
                  >
                    {connectionLabel()}
                  </span>
                </div>

                {calendarView ===
                  "day" && (
                  <div className="mt-4 grid grid-cols-7 gap-1">
                    {weekDates.map(
                      (
                        date
                      ) => {
                        const dateKey =
                          formatDateKey(
                            date
                          );

                        const selected =
                          dateKey ===
                          selectedDateKey;

                        const count =
                          appointments.filter(
                            (
                              appointment
                            ) =>
                              appointment.date ===
                              dateKey
                          ).length;

                        const isWorkDay =
                          workSettings.workDays.includes(
                            date.getDay()
                          );

                        return (
                          <button
                            key={
                              dateKey
                            }
                            onClick={() => {
                              setSelectedDate(
                                date
                              );

                              setVisibleMonth(
                                new Date(
                                  date.getFullYear(),
                                  date.getMonth(),
                                  1
                                )
                              );
                            }}
                            className={`relative flex min-w-0 flex-col items-center rounded-[18px] px-1 py-2 transition-all duration-200 ${
                              selected
                                ? isWorkDay
                                  ? "bg-gradient-to-b from-rose-100 to-rose-200/80 shadow-[0_6px_16px_rgba(225,120,160,0.16)] ring-1 ring-white/70"
                                  : "bg-neutral-300/75 shadow-sm"
                                : isWorkDay
                                ? "bg-white/15"
                                : "bg-neutral-200/35 opacity-70"
                            }`}
                          >
                            <span className="text-[9px] font-medium capitalize text-neutral-500">
                              {new Intl.DateTimeFormat(
                                getLocale(
                                  language
                                ),
                                {
                                  weekday:
                                    "short",
                                }
                              ).format(
                                date
                              )}
                            </span>

                            <span
                              className={`mt-1 text-base font-semibold ${
                                selected
                                  ? "text-neutral-950"
                                  : "text-neutral-600"
                              }`}
                            >
                              {date.getDate()}
                            </span>

                            {!isWorkDay && (
                              <span className="mt-0.5 text-[7px] font-medium text-neutral-500">
                                {t.weekend}
                              </span>
                            )}

                            {count >
                              0 && (
                              <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-500" />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </header>

            {calendarView ===
              "day" && (
              <section className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                <div
  className={`relative min-h-full overflow-hidden rounded-[30px] border shadow-[0_12px_45px_rgba(105,75,90,0.10)] backdrop-blur-md ${
    selectedDateIsWorkDay
      ? "border-white/70 bg-white/42"
      : "border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,155,170,0.20)_0%,rgba(255,120,140,0.11)_45%,rgba(255,145,160,0.16)_100%)]"
  }`}
>
                  {!selectedDateIsWorkDay && (
                    <div className="pointer-events-none absolute right-4 top-3 z-20 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] font-semibold text-neutral-500 shadow-sm backdrop-blur-md">
                      {t.weekend}
                    </div>
                  )}

                  <div
                    className="grid grid-cols-[62px_1fr]"
                    style={{
                      height: `${calendarHeight}px`,
                    }}
                  >
                    <div className="relative bg-white/10">
                      {hours.map(
                        (
                          hour
                        ) => {
                          const isFirst =
                            hour ===
                            workSettings.startHour;

                          const isLast =
                            hour ===
                            workSettings.endHour;

                          let top =
                            (
                              hour -
                              workSettings.startHour
                            ) *
                              HOUR_HEIGHT -
                            7;

                          if (
                            isFirst
                          ) {
                            top =
                              8;
                          }

                          if (
                            isLast
                          ) {
                            top =
                              calendarHeight -
                              22;
                          }

                          return (
                            <div
                              key={
                                hour
                              }
                              className="absolute left-0 right-0 pr-3 text-right text-[11px] font-medium text-neutral-500"
                              style={{
                                top: `${top}px`,
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
                          );
                        }
                      )}
                    </div>

                    <div
                      className="relative"
                      onClick={
                        handleCalendarClick
                      }
                    >
                      <div className="absolute bottom-0 left-0 top-0 w-px bg-white/80 shadow-[1px_0_2px_rgba(110,90,100,0.18)]" />

                      {hours.map(
                        (
                          hour
                        ) => (
                          <div
                            key={
                              hour
                            }
                            className="absolute left-0 right-0 h-px bg-white/80 shadow-[0_1px_1px_rgba(110,90,100,0.18)]"
                            style={{
                              top: `${
                                (
                                  hour -
                                  workSettings.startHour
                                ) *
                                HOUR_HEIGHT
                              }px`,
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

                          const endTime =
                            minutesToTime(
                              timeToMinutes(
                                appointment.time
                              ) +
                                appointment.duration
                            );

                          const linkedClient =
                            getAppointmentClient(
                              appointment
                            );

                          const phone =
                            linkedClient?.phone ??
                            "";

                          const serviceLabel =
                            getAppointmentServiceLabel(
                              appointment
                            );

                          return (
                            <button
  key={appointment.id}
  onClick={(event) => {
    event.stopPropagation();

    openEditAppointment(
      appointment
    );
  }}
  className="absolute left-3 right-3 z-10 overflow-hidden text-left"
  style={{
    top: `${top + 6}px`,
    height: `${Math.max(
      height - 12,
      54
    )}px`,
  }}
>
  <div className="absolute inset-0">
    <Image
      src="/icons/appointment-card.png"
      alt=""
      fill
      className="object-fill"
    />
  </div>

  <div className="relative z-10 flex h-full flex-col justify-center px-5 pl-7">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-neutral-900">
          {appointment.name}
        </p>

        {phone && (
          <p className="mt-0.5 truncate text-[10px] font-medium text-neutral-500">
            {phone}
          </p>
        )}

        {height >= 82 && (
          <p className="mt-1 truncate text-[11px] text-neutral-500">
            {serviceLabel}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[10px] font-medium text-neutral-500">
          {appointment.time} – {endTime}
        </p>

        {height >= 76 && (
          <span
            className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[8px] ${getStatusBadgeClass(
              appointment.status
            )}`}
          >
            {statusLabel(
              appointment.status
            )}
          </span>
        )}
      </div>
    </div>
  </div>
</button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {calendarView ===
              "month" && (
              <section className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                <div className="rounded-[30px] border border-white/70 bg-white/50 p-3 shadow-[0_12px_45px_rgba(105,75,90,0.10)] backdrop-blur-xl">
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map(
                      (
                        day
                      ) => (
                        <div
                          key={
                            day.value
                          }
                          className="py-2 text-center text-[10px] font-medium text-neutral-400"
                        >
                          {day[
                            language
                          ]}
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

                        const isWorkDay =
                          workSettings.workDays.includes(
                            item.date.getDay()
                          );

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
                            className={`relative min-h-[58px] rounded-2xl p-2 transition ${
                              selected
                                ? isWorkDay
                                  ? "bg-rose-200/90 shadow-sm"
                                  : "bg-neutral-300/80 shadow-sm"
                                : !item.isCurrentMonth
                                ? "text-neutral-300"
                                : isWorkDay
                                ? "bg-white/40"
                                : "bg-neutral-200/40 text-neutral-400"
                            }`}
                          >
                            <div className="text-sm font-medium">
                              {item.date.getDate()}
                            </div>

                            {!isWorkDay &&
                              item.isCurrentMonth && (
                                <div className="mt-1 text-[7px]">
                                  {t.weekend}
                                </div>
                              )}

                            {count >
                              0 && (
                              <div className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-rose-500" />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </section>
            )}

            <button
              onClick={() =>
                openNewAppointment()
              }
              className="absolute bottom-4 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/70 bg-gradient-to-br from-rose-300 via-rose-400 to-pink-500 text-[30px] font-light text-white shadow-[0_14px_30px_rgba(225,100,145,0.30)] backdrop-blur-md transition-all active:scale-95"
            >
              +
            </button>
          </div>
        )}

        {activeTab ===
          "clients" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 px-4 pb-2 pt-4">
              <div className="rounded-[28px] border border-white/70 bg-white/55 p-4 shadow-[0_12px_40px_rgba(120,80,95,0.12)] backdrop-blur-xl">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs font-medium text-neutral-400">
                      {t.clientBase}
                    </p>

                    <h1 className="mt-1 text-2xl font-semibold">
                      {t.clients}
                    </h1>
                  </div>

                  <button
                    onClick={
                      openNewClient
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-2xl text-white shadow-lg"
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
                      event.target.value
                    )
                  }
                  placeholder={
                    t.searchClient
                  }
                  className="mt-4 h-12 w-full rounded-2xl border border-white/80 bg-white/75 px-4 shadow-sm outline-none"
                />
              </div>
            </header>

            <section className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {filteredClients.length ===
                0 && (
                <div className="rounded-[24px] border border-white/70 bg-white/55 p-6 text-center text-neutral-500 backdrop-blur-lg">
                  {t.noClients}
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
                    className="w-full rounded-[22px] border border-white/80 bg-white/65 p-4 text-left shadow-[0_6px_20px_rgba(120,85,100,0.10)] backdrop-blur-lg"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {client.name}
                        </p>

                        {client.phone && (
                          <p className="mt-1 truncate text-sm text-neutral-500">
                            {client.phone}
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

                      <span className="h-fit shrink-0 rounded-full bg-rose-100/90 px-3 py-1 text-xs text-rose-600">
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
            <header className="shrink-0 px-4 pb-2 pt-4">
              <div className="rounded-[28px] border border-white/70 bg-white/55 p-4 shadow-[0_12px_40px_rgba(120,80,95,0.12)] backdrop-blur-xl">
                <p className="text-xs font-medium text-neutral-400">
                  {t.financeRecords}
                </p>

                <h1 className="mt-1 text-2xl font-semibold">
                  {t.analytics}
                </h1>
              </div>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
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
                {t.topServices}
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
                      className="rounded-[22px] border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur-lg"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold">
                            {service.name}
                          </p>

                          <p className="text-sm text-neutral-500">
                            {service.count}
                          </p>
                        </div>

                        <p className="font-semibold">
                          {service.income} грн
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
            <header className="shrink-0 px-4 pb-2 pt-4">
              <div className="rounded-[28px] border border-white/70 bg-white/55 p-4 shadow-[0_12px_40px_rgba(120,80,95,0.12)] backdrop-blur-xl">
                <h1 className="text-2xl font-semibold">
                  {t.settings}
                </h1>
              </div>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <div className="rounded-[24px] border border-white/70 bg-white/55 p-4 backdrop-blur-lg">
                <h2 className="font-semibold">
                  {t.sync}
                </h2>

                <div
                  className={`mt-3 rounded-2xl border p-4 ${connectionClass()}`}
                >
                  <p className="font-medium">
                    {connectionLabel()}
                  </p>

                  {pendingCount >
                    0 && (
                    <p className="mt-1 text-xs">
                      В очереди: {pendingCount}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-[24px] border border-white/70 bg-white/55 p-4 backdrop-blur-lg">
                <h2 className="font-semibold">
                  {t.language}
                </h2>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setLanguage(
                        "ru"
                      )
                    }
                    className={`h-12 rounded-2xl ${
                      language ===
                      "ru"
                        ? "bg-neutral-900 text-white"
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
                    className={`h-12 rounded-2xl ${
                      language ===
                      "uk"
                        ? "bg-neutral-900 text-white"
                        : "bg-white/70"
                    }`}
                  >
                    Українська
                  </button>
                </div>
              </div>

<NotificationSettings
  language={language}
/>

<div className="mt-3 rounded-[24px] border border-white/70 bg-white/55 p-4 backdrop-blur-lg">
  <h2 className="font-semibold">
    {t.workSchedule}
  </h2>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-neutral-500">
                      {t.startDay}
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
                      className="h-12 w-full rounded-2xl border border-white/70 bg-white/75 px-3"
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
                      {t.endDay}
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
                      className="h-12 w-full rounded-2xl border border-white/70 bg-white/75 px-3"
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
                  {t.workDays}
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
                            ? "bg-neutral-900 text-white"
                            : "bg-white/65 text-neutral-400"
                        }`}
                      >
                        {day[
                          language
                        ]}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-3 rounded-[24px] border border-white/70 bg-white/55 p-4 backdrop-blur-lg">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">
                    {t.services}
                  </h2>

                  <button
                    onClick={
                      openNewService
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-xl text-white shadow-md"
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
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {service.name}
                            </p>

                            <p className="mt-1 text-sm text-neutral-500">
                              {formatDurationLabel(
                                service.duration,
                                language
                              )}{" "}
                              · {service.price} грн
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                              service.isAddon
                                ? "bg-violet-100 text-violet-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {service.isAddon
                              ? t.addonServiceType
                              : t.mainServiceType}
                          </span>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() =>
                              openEditService(
                                service
                              )
                            }
                            className="h-10 rounded-xl bg-white px-3 text-xs"
                          >
                            {t.edit}
                          </button>

                          <button
                            onClick={() =>
                              deleteService(
                                service.id
                              )
                            }
                            className="h-10 rounded-xl bg-red-50 px-3 text-xs text-red-600"
                          >
                            {t.delete}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <button
                onClick={
                  handleLogout
                }
                className="mt-3 h-12 w-full rounded-2xl bg-red-50/90 text-red-600"
              >
                {t.logout}
              </button>
            </section>
          </div>
        )}

        <nav className="shrink-0 px-3 pb-3 pt-2">
          <div className="grid grid-cols-4 gap-1 rounded-[30px] border border-white/80 bg-white/66 p-2 shadow-[0_14px_38px_rgba(110,75,90,0.14)] backdrop-blur-2xl">
            {bottomNavItems.map(
              (item) => {
                const active =
                  activeTab ===
                  item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        item.key
                      )
                    }
                    className={`flex h-[66px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-1 transition-all ${
                      active
                        ? "bg-gradient-to-b from-rose-50 to-rose-100/90 shadow-[0_6px_16px_rgba(225,120,160,0.16)] ring-1 ring-white/70"
                        : "bg-transparent"
                    }`}
                  >
                    <div
                      className={`relative h-8 w-8 transition-all duration-200 ${
                        active
                          ? "scale-110 opacity-100 drop-shadow-[0_4px_8px_rgba(220,110,150,0.22)]"
                          : "opacity-65"
                      }`}
                    >
                      <Image
                        src={
                          item.icon
                        }
                        alt={
                          item.label
                        }
                        fill
                        sizes="32px"
                        className="object-contain"
                      />
                    </div>

                    <span
                      className={`max-w-full truncate text-[10px] font-medium ${
                        active
                          ? "text-rose-600"
                          : "text-neutral-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              }
            )}
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
                    {t.client}
                  </label>

                  <select
                    value={
                      selectedClientId
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        event.target.value;

                      setSelectedClientId(
                        value
                      );

                      if (
                        value
                      ) {
                        const client =
                          clients.find(
                            (
                              item
                            ) =>
                              item.id ===
                              Number(
                                value
                              )
                          );

                        setAppointmentName(
                          ""
                        );

                        setAppointmentPhone(
                          client?.phone ??
                            ""
                        );
                      } else {
                        setAppointmentName(
                          ""
                        );

                        setAppointmentPhone(
                          ""
                        );
                      }
                    }}
                    className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
                  >
                    <option value="">
                      {t.manualName}
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
                          {client.name}
                          {client.phone
                            ? ` · ${client.phone}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              {!selectedClientId && (
                <>
                  <FieldLabel
                    label={
                      t.clientName
                    }
                  >
                    <input
                      value={
                        appointmentName
                      }
                      onChange={(
                        event
                      ) =>
                        setAppointmentName(
                          event.target.value
                        )
                      }
                      placeholder={
                        t.clientName
                      }
                      className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
                    />
                  </FieldLabel>

                  <FieldLabel
                    label={
                      t.clientPhone
                    }
                  >
                    <input
                      value={
                        appointmentPhone
                      }
                      onChange={(
                        event
                      ) =>
                        setAppointmentPhone(
                          event.target.value
                        )
                      }
                      placeholder="+380..."
                      inputMode="tel"
                      className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
                    />
                  </FieldLabel>
                </>
              )}

              {mainServices.length >
                0 && (
                <div>
                  <label className="mb-1 block text-sm text-neutral-500">
                    {t.mainService}
                  </label>

                  <select
                    value={
                      selectedServiceId
                    }
                    onChange={(
                      event
                    ) =>
                      handleServiceSelection(
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
                  >
                    <option value="">
                      {t.manualService}
                    </option>

                    {mainServices.map(
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
                          {service.name} — {service.price} грн ·{" "}
                          {formatDurationLabel(
                            service.duration,
                            language
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

              {!selectedServiceId && (
                <FieldLabel
                  label={
                    t.mainService
                  }
                >
                  <input
                    value={
                      appointmentService
                    }
                    onChange={(
                      event
                    ) =>
                      setAppointmentService(
                        event.target.value
                      )
                    }
                    placeholder={
                      t.serviceName
                    }
                    className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
                  />
                </FieldLabel>
              )}

              <div>
                <label className="mb-2 block text-sm text-neutral-500">
                  {t.extraServices}
                </label>

                {addonServices.length >
                0 ? (
                  <div className="space-y-2">
                    {addonServices.map(
                      (
                        service
                      ) => {
                        const checked =
                          selectedAddonServiceIds.includes(
                            service.id
                          );

                        return (
                          <button
                            type="button"
                            key={
                              service.id
                            }
                            onClick={() =>
                              toggleAddonService(
                                service.id
                              )
                            }
                            className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                              checked
                                ? "border-violet-300 bg-violet-50/90 shadow-sm"
                                : "border-white/80 bg-white/70"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {service.name}
                              </p>

                              <p className="mt-0.5 text-[11px] text-neutral-500">
                                +{service.price} грн ·{" "}
                                +{formatDurationLabel(
                                  service.duration,
                                  language
                                )}
                              </p>
                            </div>

                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                                checked
                                  ? "border-violet-500 bg-violet-500 text-white"
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
                ) : (
                  <div className="rounded-2xl bg-white/45 p-3 text-sm text-neutral-400">
                    {t.noExtraServices}
                  </div>
                )}
              </div>

              <div className="flex min-w-0 items-start gap-5">
                <div className="w-[40%] min-w-0">
                  <label className="mb-1 block text-sm text-neutral-500">
                    {t.date}
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
                        event.target.value
                      )
                    }
                    className="block h-12 w-full min-w-0 appearance-none rounded-2xl border border-white/80 bg-white/80 px-3 py-0 text-base leading-[48px] text-black shadow-sm"
                  />
                </div>

                <div className="w-[40%] min-w-0">
                  <label className="mb-1 block text-sm text-neutral-500">
                    {t.time}
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
                        event.target.value
                      )
                    }
                    className="block h-12 w-full min-w-0 appearance-none rounded-2xl border border-white/80 bg-white/80 px-3 py-0 text-base leading-[48px] text-black shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldLabel
                  label={
                    t.duration
                  }
                >
                  <select
                    value={
                      appointmentDuration
                    }
                    onChange={(
                      event
                    ) =>
                      setAppointmentDuration(
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
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
                        (
                          index +
                          1
                        ) *
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
                </FieldLabel>

                <FieldLabel
                  label={
                    t.price
                  }
                >
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
                        event.target.value
                      )
                    }
                    className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
                  />
                </FieldLabel>
              </div>

              {(selectedServiceId ||
                selectedAddonServiceIds.length >
                  0) && (
                <div className="rounded-2xl border border-white/70 bg-white/55 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                    {t.total}
                  </p>

                  <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="font-semibold">
                      {appointmentPrice ||
                        0}{" "}
                      грн
                    </p>

                    <p className="text-sm text-neutral-500">
                      {formatDurationLabel(
                        Number(
                          appointmentDuration
                        ),
                        language
                      )}
                    </p>
                  </div>
                </div>
              )}

              <select
                value={
                  appointmentStatus
                }
                onChange={(
                  event
                ) =>
                  setAppointmentStatus(
                    event.target.value as AppointmentStatus
                  )
                }
                className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
              >
                <option value="scheduled">
                  {t.scheduledStatus}
                </option>

                <option value="completed">
                  {t.completedStatus}
                </option>

                <option value="no-show">
                  {t.noShowStatus}
                </option>

                <option value="cancelled">
                  {t.cancelledStatus}
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
                    className="h-12 w-full rounded-2xl bg-sky-50 font-medium text-sky-700"
                  >
                    {t.remindClient}
                  </button>
                )}

              {appointmentError && (
                <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                  {appointmentError}

                  {hasConflict && (
                    <button
                      onClick={
                        actuallySaveAppointment
                      }
                      className="mt-3 h-12 w-full rounded-2xl bg-white"
                    >
                      {t.forceSave}
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={
                  saveAppointment
                }
                className="h-12 w-full rounded-2xl bg-neutral-900 font-medium text-white shadow-lg"
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
                  className="h-12 w-full rounded-2xl bg-red-50 text-red-600"
                >
                  {t.deleteAppointment}
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
              <FieldLabel
                label={
                  t.name
                }
              >
                <input
                  value={
                    clientName
                  }
                  onChange={(
                    event
                  ) =>
                    setClientName(
                      event.target.value
                    )
                  }
                  placeholder={
                    t.name
                  }
                  className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 text-base shadow-sm"
                />
              </FieldLabel>

              <FieldLabel
                label={
                  t.phone
                }
              >
                <input
                  value={
                    clientPhone
                  }
                  onChange={(
                    event
                  ) =>
                    setClientPhone(
                      event.target.value
                    )
                  }
                  placeholder="+380..."
                  inputMode="tel"
                  className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 text-base shadow-sm"
                />
              </FieldLabel>

              <FieldLabel label="Telegram">
                <input
                  value={
                    clientTelegram
                  }
                  onChange={(
                    event
                  ) =>
                    setClientTelegram(
                      event.target.value
                    )
                  }
                  placeholder="@user"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 text-base shadow-sm"
                />
              </FieldLabel>

              <FieldLabel label="Instagram">
                <input
                  value={
                    clientInstagram
                  }
                  onChange={(
                    event
                  ) =>
                    setClientInstagram(
                      event.target.value
                    )
                  }
                  placeholder="user"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 text-base shadow-sm"
                />
              </FieldLabel>

              <FieldLabel
                label={
                  t.note
                }
              >
                <textarea
                  value={
                    clientNote
                  }
                  onChange={(
                    event
                  ) =>
                    setClientNote(
                      event.target.value
                    )
                  }
                  placeholder={
                    t.note
                  }
                  rows={
                    3
                  }
                  className="w-full resize-none rounded-2xl border border-white/80 bg-white/80 p-3 text-base shadow-sm"
                />
              </FieldLabel>

              <button
                onClick={
                  saveClient
                }
                className="h-12 w-full rounded-2xl bg-neutral-900 font-medium text-white shadow-lg"
              >
                {t.save}
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
                {selectedClient.name}
              </h2>

              <div className="mt-4 space-y-2">
                <InfoRow
                  label={
                    t.phone
                  }
                  value={
                    selectedClient.phone ||
                    "—"
                  }
                />

                <InfoRow
                  label="Telegram"
                  value={
                    selectedClient.telegram ||
                    "—"
                  }
                />

                <InfoRow
                  label="Instagram"
                  value={
                    selectedClient.instagram ||
                    "—"
                  }
                />
              </div>

              {selectedClient.note && (
                <p className="mt-3 rounded-2xl bg-white/70 p-3 text-sm">
                  {selectedClient.note}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                {selectedClient.phone && (
                  <a
                    href={`tel:${selectedClient.phone.replace(
                      /[^+\d]/g,
                      ""
                    )}`}
                    className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-neutral-900 text-center text-sm font-medium text-white"
                  >
                    {t.call}
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
                    className="h-12 flex-1 rounded-2xl bg-white/80 text-sm font-medium shadow-sm"
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
                    className="h-12 flex-1 rounded-2xl bg-white/80 text-sm font-medium shadow-sm"
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

                  setAppointmentPhone(
                    selectedClient.phone
                  );

                  setAppointmentDate(
                    selectedDateKey
                  );

                  setAppointmentName(
                    ""
                  );

                  setSelectedServiceId(
                    ""
                  );

                  setSelectedAddonServiceIds(
                    []
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
                className="mt-4 h-12 w-full rounded-2xl bg-neutral-900 font-medium text-white shadow-lg"
              >
                {t.bookClient}
              </button>

              <button
                onClick={() =>
                  openEditClient(
                    selectedClient
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl bg-white/80 font-medium shadow-sm"
              >
                {t.editClientButton}
              </button>

              <h3 className="mt-6 font-semibold">
                {t.futureAppointments}
              </h3>

              <div className="mt-2 space-y-2">
                {futureClientAppointments.map((appointment) => (
  <div
    key={appointment.id}
    onClick={() => {
      setIsClientDetailsOpen(false);

      setSelectedDate(
        new Date(
          `${appointment.date}T12:00:00`
        )
      );

      setVisibleMonth(
        new Date(
          Number(
            appointment.date.slice(
              0,
              4
            )
          ),
          Number(
            appointment.date.slice(
              5,
              7
            )
          ) - 1,
          1
        )
      );

      setActiveTab("calendar");

      openEditAppointment(
        appointment
      );
    }}
    className="cursor-pointer rounded-2xl bg-white/70 p-3 shadow-sm transition active:scale-[0.99]"
  >
    <p className="font-medium">
      {formatFullDate(
        appointment.date,
        language
      )}{" "}
      · {appointment.time}
    </p>

    <p className="mt-1 text-sm text-neutral-500">
      {getAppointmentServiceLabel(
        appointment
      )}
    </p>

    <button
      onClick={(event) => {
        event.stopPropagation();

        openReminder(
          appointment
        );
      }}
      className="mt-3 h-10 rounded-xl bg-sky-50 px-4 text-sm font-medium text-sky-700"
    >
      {t.remind}
    </button>
  </div>
))}
              </div>

              <h3 className="mt-6 font-semibold">
                {t.history}
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
                      className="rounded-2xl bg-white/70 p-3 text-sm shadow-sm"
                    >
                      {formatFullDate(
                        appointment.date,
                        language
                      )}{" "}
                      ·{" "}
                      {getAppointmentServiceLabel(
                        appointment
                      )}
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
                className="mt-6 h-12 w-full rounded-2xl bg-red-50 text-red-600"
              >
                {t.deleteClient}
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
              <FieldLabel
                label={
                  t.serviceName
                }
              >
                <input
                  value={
                    serviceName
                  }
                  onChange={(
                    event
                  ) =>
                    setServiceName(
                      event.target.value
                    )
                  }
                  placeholder={
                    t.serviceName
                  }
                  className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
                />
              </FieldLabel>

              <FieldLabel
                label={
                  t.serviceType
                }
              >
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setServiceIsAddon(
                        false
                      )
                    }
                    className={`h-12 rounded-2xl ${
                      !serviceIsAddon
                        ? "bg-neutral-900 text-white"
                        : "bg-white/70 text-neutral-600"
                    }`}
                  >
                    {t.mainServiceType}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setServiceIsAddon(
                        true
                      )
                    }
                    className={`h-12 rounded-2xl ${
                      serviceIsAddon
                        ? "bg-violet-500 text-white"
                        : "bg-white/70 text-neutral-600"
                    }`}
                  >
                    {t.addonServiceType}
                  </button>
                </div>
              </FieldLabel>

              <FieldLabel
                label={
                  t.duration
                }
              >
                <select
                  value={
                    serviceDuration
                  }
                  onChange={(
                    event
                  ) =>
                    setServiceDuration(
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
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
                      (
                        index +
                        1
                      ) *
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
              </FieldLabel>

              <FieldLabel
                label={
                  t.servicePrice
                }
              >
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
                      event.target.value
                    )
                  }
                  placeholder={
                    t.servicePrice
                  }
                  className="h-12 w-full rounded-2xl border border-white/80 bg-white/80 px-3 shadow-sm"
                />
              </FieldLabel>

              <button
                onClick={
                  saveService
                }
                className="h-12 w-full rounded-2xl bg-neutral-900 font-medium text-white shadow-lg"
              >
                {t.save}
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
              {t.reminder}
            </h2>

            <textarea
              value={
                reminderText
              }
              onChange={(
                event
              ) => {
                setReminderText(
                  event.target.value
                );

                setReminderCopied(
                  false
                );
              }}
              rows={
                7
              }
              className="mt-5 w-full resize-none rounded-2xl border border-white/80 bg-white/80 p-3 text-base shadow-sm"
            />

            {(reminderClient?.telegram ||
              reminderClient?.instagram) && (
              <div className="mt-3 flex gap-2">
                {reminderClient?.telegram && (
                  <button
                    onClick={
                      openTelegramReminder
                    }
                    className="h-12 flex-1 rounded-2xl bg-sky-50 text-sm font-semibold text-sky-700"
                  >
                    Telegram
                  </button>
                )}

                {reminderClient?.instagram && (
                  <button
                    onClick={
                      openInstagramReminder
                    }
                    className="h-12 flex-1 rounded-2xl bg-rose-100 text-sm font-semibold text-rose-700"
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
              className="mt-2 h-12 w-full rounded-2xl bg-neutral-900 font-medium text-white shadow-lg"
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
      className={`flex h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] text-[10px] font-medium transition-all ${
        active
          ? "bg-rose-100/90 text-rose-500 shadow-sm"
          : "text-neutral-500"
      }`}
    >
      <span className="flex h-6 items-center justify-center">
        {icon}
      </span>

      <span className="max-w-full truncate px-1">
        {children}
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
      "bg-sky-50/80",

    green:
      "bg-emerald-50/80",

    red:
      "bg-rose-50/80",

    orange:
      "bg-amber-50/80",
  };

  return (
    <div
      className={`rounded-[22px] border border-white/75 p-4 shadow-[0_6px_20px_rgba(120,85,100,0.08)] backdrop-blur-lg ${tones[tone]}`}
    >
      <p className="text-xs text-neutral-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-neutral-500">
        {label}
      </label>

      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex h-12 items-center rounded-2xl bg-white/70 px-3 shadow-sm">
      <span className="w-24 shrink-0 text-xs text-neutral-400">
        {label}
      </span>

      <span className="truncate text-sm">
        {value}
      </span>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] border-t border-white/80 bg-rose-50/90 p-5 shadow-[0_-20px_60px_rgba(80,50,65,0.18)] backdrop-blur-xl">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-neutral-300/80" />

        <div className="flex justify-end">
          <button
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-sm text-neutral-500"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}