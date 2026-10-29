"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  social: string;
  note: string;
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

type Tab = "calendar" | "clients" | "analytics" | "settings";
type CalendarView = "day" | "month";
type DatabaseStatus = "connecting" | "connected" | "offline" | "error";

type QueueTable = "appointments" | "clients" | "services" | "settings";

type PendingOperation =
  | {
      id: string;
      type: "upsert";
      table: QueueTable;
      payload: Record<string, unknown>;
    }
  | {
      id: string;
      type: "delete";
      table: QueueTable;
      column: string;
      value: string | number;
    };

const HOUR_HEIGHT = 96;

const APPOINTMENTS_STORAGE_KEY = "nails-calendar-appointments";
const CLIENTS_STORAGE_KEY = "nails-calendar-clients";
const SERVICES_STORAGE_KEY = "nails-calendar-services";
const WORK_SETTINGS_STORAGE_KEY = "nails-calendar-work-settings";
const LANGUAGE_STORAGE_KEY = "nails-calendar-language";
const MIGRATION_STORAGE_KEY = "nails-calendar-supabase-migrated";
const OFFLINE_QUEUE_STORAGE_KEY = "nails-calendar-offline-queue";

const DEFAULT_WORK_SETTINGS: WorkSettings = {
  startHour: 9,
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
    returnToday: "Вернуться на сегодня",
    currentMonth: "Текущий месяц",
    returnCurrentMonth: "Вернуться на текущий месяц",

    day: "День",
    month: "Месяц",
    records: "Записей",
    totalRecords: "Всего записей",

    clientBase: "База клиентов",
    total: "Всего",
    searchClient: "Поиск по имени, телефону...",
    noClients: "Клиентов пока нет",
    addFirstClient: "Нажми +, чтобы добавить первого клиента",
    nothingFound: "Никого не нашли",

    financeRecords: "Финансы и записи",
    completedOnlyIncome: "Доход только по завершённым записям",
    todayIncome: "Сегодня",
    sevenDays: "7 дней",
    currentMonthIncome: "Текущий месяц",
    averageCheck: "Средний чек",
    scheduled: "Запланировано",
    cancelled: "Отменено",
    noShow: "Не пришли",
    topServices: "Топ услуг",
    noCompleted: "Пока нет завершённых записей",

    app: "Приложение",
    language: "Язык приложения",
    languageHint: "Изменяется весь интерфейс приложения",

    workSchedule: "Рабочий график",
    workScheduleHint: "Эти настройки меняют дневной календарь",
    startDay: "Начало дня",
    endDay: "Конец дня",
    workDays: "Рабочие дни",

    database: "Синхронизация",
    databaseConnected: "Данные синхронизированы",
    databaseConnecting: "Синхронизация...",
    databaseOffline: "Офлайн — изменения сохраняются на устройстве",
    databaseError: "Ожидается синхронизация",

    online: "Онлайн",
    offline: "Офлайн",
    syncing: "Синхронизация",

    account: "Аккаунт",
    signedInAs: "Выполнен вход",
    logout: "Выйти",

    services: "Услуги",
    servicePriceDuration: "Цена и длительность",
    addFirstService: "Добавь первую услугу",
    edit: "Изменить",
    delete: "Удалить",

    dayOff: "Выходной день",
    dayOffHint: "Запись всё равно можно создать, если нужно.",
    dayOffShort: "выходной",

    appointmentNew: "Новая запись",
    appointmentEdit: "Редактировать запись",
    appointmentSubtitle: "Клиент, услуга, время и статус",
    close: "Закрыть",

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
    note: "Заметка",
    save: "Сохранить",

    clientCard: "Карточка клиента",
    phoneMissing: "Телефон не указан",
    totalAppointments: "Всего записей",
    futureAppointmentsCount: "Будущих",
    bookClient: "Записать клиента",
    editClientButton: "Редактировать",

    futureAppointments: "Ближайшие записи",
    noFutureAppointments: "Будущих записей нет",
    history: "История",
    noHistory: "Прошлых записей нет",
    deleteClient: "Удалить клиента",

    call: "Позвонить",
    telegram: "Telegram",
    instagram: "Instagram",
    remind: "Напомнить",
    remindClient: "Напомнить клиенту",

    reminder: "Напоминание клиенту",
    reminderHint: "Текст всегда формируется на украинском языке",
    copyText: "Скопировать текст",
    copied: "Скопировано",
    openTelegram: "Открыть Telegram",
    openInstagram: "Открыть Instagram",

    newService: "Новая услуга",
    editService: "Редактировать услугу",
    servicePrice: "Цена, грн",

    minutes: "мин.",
    completed: "завершено",

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
    returnToday: "Повернутися на сьогодні",
    currentMonth: "Поточний місяць",
    returnCurrentMonth: "Повернутися на поточний місяць",

    day: "День",
    month: "Місяць",
    records: "Записів",
    totalRecords: "Усього записів",

    clientBase: "База клієнтів",
    total: "Усього",
    searchClient: "Пошук за ім'ям, телефоном...",
    noClients: "Клієнтів поки немає",
    addFirstClient: "Натисни +, щоб додати першого клієнта",
    nothingFound: "Нічого не знайдено",

    financeRecords: "Фінанси та записи",
    completedOnlyIncome: "Дохід лише за завершеними записами",
    todayIncome: "Сьогодні",
    sevenDays: "7 днів",
    currentMonthIncome: "Поточний місяць",
    averageCheck: "Середній чек",
    scheduled: "Заплановано",
    cancelled: "Скасовано",
    noShow: "Не прийшли",
    topServices: "Топ послуг",
    noCompleted: "Поки немає завершених записів",

    app: "Застосунок",
    language: "Мова застосунку",
    languageHint: "Змінюється весь інтерфейс застосунку",

    workSchedule: "Робочий графік",
    workScheduleHint: "Ці налаштування змінюють денний календар",
    startDay: "Початок дня",
    endDay: "Кінець дня",
    workDays: "Робочі дні",

    database: "Синхронізація",
    databaseConnected: "Дані синхронізовано",
    databaseConnecting: "Синхронізація...",
    databaseOffline: "Офлайн — зміни зберігаються на пристрої",
    databaseError: "Очікується синхронізація",

    online: "Онлайн",
    offline: "Офлайн",
    syncing: "Синхронізація",

    account: "Акаунт",
    signedInAs: "Виконано вхід",
    logout: "Вийти",

    services: "Послуги",
    servicePriceDuration: "Ціна та тривалість",
    addFirstService: "Додай першу послугу",
    edit: "Змінити",
    delete: "Видалити",

    dayOff: "Вихідний день",
    dayOffHint: "Запис усе одно можна створити, якщо потрібно.",
    dayOffShort: "вихідний",

    appointmentNew: "Новий запис",
    appointmentEdit: "Редагувати запис",
    appointmentSubtitle: "Клієнт, послуга, час і статус",
    close: "Закрити",

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
    note: "Нотатка",
    save: "Зберегти",

    clientCard: "Картка клієнта",
    phoneMissing: "Телефон не вказано",
    totalAppointments: "Усього записів",
    futureAppointmentsCount: "Майбутніх",
    bookClient: "Записати клієнта",
    editClientButton: "Редагувати",

    futureAppointments: "Найближчі записи",
    noFutureAppointments: "Майбутніх записів немає",
    history: "Історія",
    noHistory: "Минулих записів немає",
    deleteClient: "Видалити клієнта",

    call: "Подзвонити",
    telegram: "Telegram",
    instagram: "Instagram",
    remind: "Нагадати",
    remindClient: "Нагадати клієнту",

    reminder: "Нагадування клієнту",
    reminderHint: "Текст завжди формується українською мовою",
    copyText: "Скопіювати текст",
    copied: "Скопійовано",
    openTelegram: "Відкрити Telegram",
    openInstagram: "Відкрити Instagram",

    newService: "Нова послуга",
    editService: "Редагувати послугу",
    servicePrice: "Ціна, грн",

    minutes: "хв.",
    completed: "завершено",

    clientRequired: "Вкажи клієнта.",
    dateRequired: "Вкажи дату.",
    timeRequired: "Вкажи час.",
    conflict: "Цей час перетинається із записом",

    deleteAppointmentConfirm: "Видалити цей запис?",
    deleteClientConfirm:
      "Видалити клієнта? Його записи залишаться в календарі.",
    deleteServiceConfirm: "Видалити цю послугу?",
  },
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocale(language: Language) {
  return language === "uk" ? "uk-UA" : "ru-RU";
}

function formatDateTitle(date: Date, language: Language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatMonthTitle(date: Date, language: Language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatFullDate(dateString: string, language: Language) {
  const date = new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat(getLocale(language), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekday(date: Date, language: Language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    weekday: "long",
  }).format(date);
}

function formatUkrainianReminderDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
  }).format(date);
}

function isSameDay(first: Date, second: Date) {
  return formatDateKey(first) === formatDateKey(second);
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function getAppointmentTop(time: string, startHour: number) {
  const startMinutes = startHour * 60;
  const appointmentMinutes = timeToMinutes(time);

  return ((appointmentMinutes - startMinutes) / 60) * HOUR_HEIGHT;
}

function getAppointmentHeight(duration: number) {
  return Math.max((duration / 60) * HOUR_HEIGHT, 48);
}

function sumPrices(items: Appointment[]) {
  return items.reduce(
    (total, item) => total + Number(item.price || 0),
    0
  );
}

function safeParseArray<T>(value: string | null): T[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalObject<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function createQueueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanUsername(value: string) {
  let username = value.trim();

  username = username.replace(/^https?:\/\/(www\.)?/, "");
  username = username.replace(/^t\.me\//, "");
  username = username.replace(/^telegram\.me\//, "");
  username = username.replace(/^instagram\.com\//, "");
  username = username.replace(/^www\.instagram\.com\//, "");
  username = username.replace(/^@/, "");
  username = username.split("/")[0];
  username = username.split("?")[0];

  return username;
}

function getTelegramUrl(social: string) {
  const username = cleanUsername(social);

  return username ? `https://t.me/${username}` : "";
}

function getInstagramUrl(social: string) {
  const username = cleanUsername(social);

  return username ? `https://instagram.com/${username}` : "";
}

function getSocialType(social: string) {
  const normalized = social.toLowerCase();

  if (
    normalized.includes("t.me") ||
    normalized.includes("telegram")
  ) {
    return "telegram";
  }

  if (normalized.includes("instagram")) {
    return "instagram";
  }

  return "unknown";
}

function getPhoneUrl(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

function getStatusBadgeClass(status: AppointmentStatus) {
  if (status === "completed") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "cancelled") {
    return "border-red-200 bg-red-50 text-red-600";
  }

  if (status === "no-show") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getAppointmentCardClass(status: AppointmentStatus) {
  if (status === "completed") {
    return "border-green-400 bg-green-50/95";
  }

  if (status === "cancelled") {
    return "border-red-300 bg-red-50/90";
  }

  if (status === "no-show") {
    return "border-orange-300 bg-orange-50/90";
  }

  return "border-sky-300 bg-sky-50/95";
}

function getMonthCalendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let firstWeekday = firstDay.getDay();

  if (firstWeekday === 0) firstWeekday = 7;

  const daysBefore = firstWeekday - 1;
  const daysInMonth = lastDay.getDate();

  const result: {
    date: Date;
    isCurrentMonth: boolean;
  }[] = [];

  for (let index = daysBefore; index > 0; index--) {
    result.push({
      date: new Date(year, month, 1 - index),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    result.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  while (result.length % 7 !== 0) {
    const nextDay =
      result.length - daysBefore - daysInMonth + 1;

    result.push({
      date: new Date(year, month + 1, nextDay),
      isCurrentMonth: false,
    });
  }

  return result;
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);

  const [today, setToday] = useState(
    new Date("2000-01-01T12:00:00")
  );

  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [language, setLanguage] = useState<Language>("uk");

  const t = translations[language];

  const [databaseStatus, setDatabaseStatus] =
    useState<DatabaseStatus>("connecting");

  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("calendar");

  const [calendarView, setCalendarView] =
    useState<CalendarView>("day");

  const [selectedDate, setSelectedDate] = useState(
    new Date("2000-01-01T12:00:00")
  );

  const [visibleMonth, setVisibleMonth] = useState(
    new Date("2000-01-01T12:00:00")
  );

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [workSettings, setWorkSettings] =
    useState<WorkSettings>(DEFAULT_WORK_SETTINGS);

  const [isLoaded, setIsLoaded] = useState(false);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] =
    useState(false);

  const [isClientModalOpen, setIsClientModalOpen] =
    useState(false);

  const [isClientDetailsOpen, setIsClientDetailsOpen] =
    useState(false);

  const [isServiceModalOpen, setIsServiceModalOpen] =
    useState(false);

  const [isReminderModalOpen, setIsReminderModalOpen] =
    useState(false);

  const [editingAppointmentId, setEditingAppointmentId] =
    useState<number | null>(null);

  const [editingClientId, setEditingClientId] =
    useState<number | null>(null);

  const [editingServiceId, setEditingServiceId] =
    useState<number | null>(null);

  const [selectedClientDetailsId, setSelectedClientDetailsId] =
    useState<number | null>(null);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");

  const [appointmentName, setAppointmentName] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentService, setAppointmentService] = useState("");
  const [appointmentDuration, setAppointmentDuration] = useState("90");
  const [appointmentPrice, setAppointmentPrice] = useState("");

  const [appointmentStatus, setAppointmentStatus] =
    useState<AppointmentStatus>("scheduled");

  const [appointmentError, setAppointmentError] = useState("");
  const [hasConflict, setHasConflict] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientSocial, setClientSocial] = useState("");
  const [clientNote, setClientNote] = useState("");

  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState("90");
  const [servicePrice, setServicePrice] = useState("");

  const [clientSearch, setClientSearch] = useState("");

  const [reminderText, setReminderText] = useState("");
  const [reminderClientId, setReminderClientId] =
    useState<number | null>(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  const getQueue = useCallback(() => {
    return safeParseArray<PendingOperation>(
      localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)
    );
  }, []);

  const saveQueue = useCallback((queue: PendingOperation[]) => {
    localStorage.setItem(
      OFFLINE_QUEUE_STORAGE_KEY,
      JSON.stringify(queue)
    );

    setPendingCount(queue.length);
  }, []);

  const enqueueOperation = useCallback(
    (operation: PendingOperation) => {
      let queue = getQueue();

      if (operation.type === "upsert") {
        const recordId = operation.payload.id;

        if (recordId !== undefined) {
          queue = queue.filter((item) => {
            if (
              item.type !== "upsert" ||
              item.table !== operation.table
            ) {
              return true;
            }

            return item.payload.id !== recordId;
          });
        }
      }

      if (operation.type === "delete") {
        queue = queue.filter((item) => {
          if (
            item.type === "upsert" &&
            item.table === operation.table &&
            item.payload[operation.column] === operation.value
          ) {
            return false;
          }

          return true;
        });
      }

      queue.push(operation);

      saveQueue(queue);
    },
    [getQueue, saveQueue]
  );

  const executeOperation = useCallback(
    async (operation: PendingOperation) => {
      if (operation.type === "upsert") {
        const { error } = await supabase
          .from(operation.table)
          .upsert(operation.payload, {
            onConflict: "id",
          });

        if (error) {
          throw error;
        }

        return;
      }

      const { error } = await supabase
        .from(operation.table)
        .delete()
        .eq(operation.column, operation.value);

      if (error) {
        throw error;
      }
    },
    [supabase]
  );

  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setDatabaseStatus("offline");
      return;
    }

    const queue = getQueue();

    setPendingCount(queue.length);

    if (queue.length === 0) {
      setDatabaseStatus("connected");
      return;
    }

    setIsSyncing(true);
    setDatabaseStatus("connecting");

    const remaining = [...queue];

    while (remaining.length > 0) {
      const operation = remaining[0];

      try {
        await executeOperation(operation);

        remaining.shift();

        saveQueue(remaining);
      } catch (error) {
        console.error("Offline sync failed:", error);

        setDatabaseStatus("error");
        break;
      }
    }

    setIsSyncing(false);

    if (remaining.length === 0) {
      setDatabaseStatus("connected");
    }
  }, [executeOperation, getQueue, saveQueue]);

  const saveOrQueue = useCallback(
    async (operation: PendingOperation) => {
      if (!navigator.onLine) {
        enqueueOperation(operation);
        setDatabaseStatus("offline");
        return;
      }

      try {
        await executeOperation(operation);

        setDatabaseStatus("connected");
      } catch (error) {
        console.error("Cloud save failed, queued locally:", error);

        enqueueOperation(operation);

        setDatabaseStatus("error");
      }
    },
    [enqueueOperation, executeOperation]
  );

  useEffect(() => {
    const current = new Date();

    setToday(current);
    setSelectedDate(current);

    setVisibleMonth(
      new Date(current.getFullYear(), current.getMonth(), 1)
    );

    const online = navigator.onLine;

    setIsOnline(online);

    const queue = safeParseArray<PendingOperation>(
      localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)
    );

    setPendingCount(queue.length);

    function handleOnline() {
      setIsOnline(true);

      syncOfflineQueue();
    }

    function handleOffline() {
      setIsOnline(false);
      setDatabaseStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineQueue]);

  useEffect(() => {
    const localLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (localLanguage === "ru" || localLanguage === "uk") {
      setLanguage(localLanguage);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthChecked(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session) return;

    async function loadData() {
      setIsLoaded(false);

      if (!navigator.onLine) {
        const localClients = safeParseArray<Client>(
          localStorage.getItem(CLIENTS_STORAGE_KEY)
        );

        const localServices = safeParseArray<Service>(
          localStorage.getItem(SERVICES_STORAGE_KEY)
        );

        const localAppointments = safeParseArray<Appointment>(
          localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
        );

        const localSettings = loadLocalObject<WorkSettings>(
          WORK_SETTINGS_STORAGE_KEY,
          DEFAULT_WORK_SETTINGS
        );

        const localLanguage =
          localStorage.getItem(LANGUAGE_STORAGE_KEY);

        setClients(localClients);
        setServices(localServices);
        setAppointments(localAppointments);
        setWorkSettings(localSettings);

        if (localLanguage === "ru" || localLanguage === "uk") {
          setLanguage(localLanguage);
        }

        setDatabaseStatus("offline");
        setIsLoaded(true);

        return;
      }

      setDatabaseStatus("connecting");

      try {
        const [
          clientsResult,
          servicesResult,
          appointmentsResult,
          settingsResult,
        ] = await Promise.all([
          supabase.from("clients").select("*").order("name"),

          supabase.from("services").select("*").order("name"),

          supabase
            .from("appointments")
            .select("*")
            .order("date")
            .order("time"),

          supabase
            .from("settings")
            .select("*")
            .eq("id", "main")
            .maybeSingle(),
        ]);

        if (clientsResult.error) throw clientsResult.error;
        if (servicesResult.error) throw servicesResult.error;
        if (appointmentsResult.error) throw appointmentsResult.error;
        if (settingsResult.error) throw settingsResult.error;

        const databaseClients: Client[] =
          (clientsResult.data ?? []).map((row) => ({
            id: Number(row.id),
            name: row.name ?? "",
            phone: row.phone ?? "",
            social: row.social ?? "",
            note: row.note ?? "",
          }));

        const databaseServices: Service[] =
          (servicesResult.data ?? []).map((row) => ({
            id: Number(row.id),
            name: row.name ?? "",
            duration: Number(row.duration ?? 90),
            price: Number(row.price ?? 0),
          }));

        const databaseAppointments: Appointment[] =
          (appointmentsResult.data ?? []).map((row) => ({
            id: Number(row.id),
            date: row.date ?? "",
            time: String(row.time ?? "").slice(0, 5),

            clientId:
              row.client_id !== null &&
              row.client_id !== undefined
                ? Number(row.client_id)
                : undefined,

            name: row.name ?? "",

            serviceId:
              row.service_id !== null &&
              row.service_id !== undefined
                ? Number(row.service_id)
                : undefined,

            service: row.service ?? "",
            duration: Number(row.duration ?? 90),
            price: Number(row.price ?? 0),

            status: (row.status ??
              "scheduled") as AppointmentStatus,
          }));

        setClients(databaseClients);
        setServices(databaseServices);
        setAppointments(databaseAppointments);

        if (settingsResult.data) {
          const row = settingsResult.data;

          const nextLanguage: Language =
            row.language === "ru" ? "ru" : "uk";

          setLanguage(nextLanguage);

          setWorkSettings({
            startHour: Number(row.start_hour ?? 9),
            endHour: Number(row.end_hour ?? 21),

            workDays: Array.isArray(row.work_days)
              ? row.work_days.map(Number)
              : DEFAULT_WORK_SETTINGS.workDays,
          });
        }

        localStorage.setItem(MIGRATION_STORAGE_KEY, "true");

        setDatabaseStatus("connected");

        await syncOfflineQueue();
      } catch (error) {
        console.error("Supabase load error:", error);

        const localClients = safeParseArray<Client>(
          localStorage.getItem(CLIENTS_STORAGE_KEY)
        );

        const localServices = safeParseArray<Service>(
          localStorage.getItem(SERVICES_STORAGE_KEY)
        );

        const localAppointments = safeParseArray<Appointment>(
          localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
        );

        setClients(localClients);
        setServices(localServices);
        setAppointments(localAppointments);

        setDatabaseStatus("offline");
      } finally {
        setIsLoaded(true);
      }
    }

    loadData();
  }, [session, supabase, syncOfflineQueue]);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(
      CLIENTS_STORAGE_KEY,
      JSON.stringify(clients)
    );
  }, [clients, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(
      SERVICES_STORAGE_KEY,
      JSON.stringify(services)
    );
  }, [services, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(
      APPOINTMENTS_STORAGE_KEY,
      JSON.stringify(appointments)
    );
  }, [appointments, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

    localStorage.setItem(
      WORK_SETTINGS_STORAGE_KEY,
      JSON.stringify(workSettings)
    );

    const timer = window.setTimeout(() => {
      const operation: PendingOperation = {
        id: createQueueId(),
        type: "upsert",
        table: "settings",
        payload: {
          id: "main",
          language,
          start_hour: workSettings.startHour,
          end_hour: workSettings.endHour,
          work_days: workSettings.workDays,
          updated_at: new Date().toISOString(),
        },
      };

      saveOrQueue(operation);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [language, workSettings, isLoaded, saveOrQueue]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    if (!navigator.onLine) {
      setLoginError(
        language === "uk"
          ? "Для першого входу потрібен інтернет."
          : "Для первого входа нужен интернет."
      );

      return;
    }

    setLoginError("");
    setLoginLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (error) {
      setLoginError(
        language === "uk"
          ? "Невірний email або пароль."
          : "Неверный email или пароль."
      );

      setLoginLoading(false);
      return;
    }

    setLoginPassword("");
    setLoginLoading(false);
  }

  async function handleLogout() {
    if (navigator.onLine) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setActiveTab("calendar");
  }

  const todayKey = formatDateKey(today);
  const selectedDateKey = formatDateKey(selectedDate);

  const selectedDayAppointments = appointments
    .filter((appointment) => appointment.date === selectedDateKey)
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectedDateIsToday = isSameDay(selectedDate, today);

  const visibleMonthIsCurrent =
    visibleMonth.getFullYear() === today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();

  const selectedDateIsWorkDay =
    workSettings.workDays.includes(selectedDate.getDay());

  const hours = Array.from(
    {
      length:
        workSettings.endHour -
        workSettings.startHour +
        1,
    },
    (_, index) => workSettings.startHour + index
  );

  const calendarHeight =
    (workSettings.endHour - workSettings.startHour) *
    HOUR_HEIGHT;

  const monthDays = getMonthCalendarDays(visibleMonth);

  const filteredClients = [...clients]
    .filter((client) => {
      const search = clientSearch.trim().toLowerCase();

      if (!search) return true;

      return (
        client.name.toLowerCase().includes(search) ||
        client.phone.toLowerCase().includes(search) ||
        client.social.toLowerCase().includes(search)
      );
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, getLocale(language))
    );

  const selectedClientDetails =
    selectedClientDetailsId !== null
      ? clients.find(
          (client) => client.id === selectedClientDetailsId
        )
      : undefined;

  const selectedClientAppointments =
    selectedClientDetailsId !== null
      ? appointments
          .filter(
            (appointment) =>
              appointment.clientId === selectedClientDetailsId
          )
          .sort((a, b) => {
            if (a.date !== b.date) {
              return a.date.localeCompare(b.date);
            }

            return a.time.localeCompare(b.time);
          })
      : [];

  const futureClientAppointments =
    selectedClientAppointments.filter(
      (appointment) =>
        appointment.date >= todayKey &&
        appointment.status === "scheduled"
    );

  const pastClientAppointments =
    selectedClientAppointments
      .filter(
        (appointment) =>
          appointment.date < todayKey ||
          appointment.status !== "scheduled"
      )
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }

        return b.time.localeCompare(a.time);
      });

  const completedAppointments = appointments.filter(
    (appointment) => appointment.status === "completed"
  );

  const todayCompletedAppointments =
    completedAppointments.filter(
      (appointment) => appointment.date === todayKey
    );

  const sevenDaysAgo = useMemo(() => {
    const date = new Date(today);

    date.setDate(date.getDate() - 6);

    return date;
  }, [today]);

  const sevenDaysAgoKey = formatDateKey(sevenDaysAgo);

  const weekCompletedAppointments =
    completedAppointments.filter(
      (appointment) =>
        appointment.date >= sevenDaysAgoKey &&
        appointment.date <= todayKey
    );

  const monthStartKey = formatDateKey(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const monthEndKey = formatDateKey(
    new Date(today.getFullYear(), today.getMonth() + 1, 0)
  );

  const currentMonthAppointments = appointments.filter(
    (appointment) =>
      appointment.date >= monthStartKey &&
      appointment.date <= monthEndKey
  );

  const currentMonthCompletedAppointments =
    currentMonthAppointments.filter(
      (appointment) => appointment.status === "completed"
    );

  const todayIncome = sumPrices(todayCompletedAppointments);
  const weekIncome = sumPrices(weekCompletedAppointments);
  const monthIncome = sumPrices(currentMonthCompletedAppointments);

  const averageCheck =
    currentMonthCompletedAppointments.length > 0
      ? Math.round(
          monthIncome /
            currentMonthCompletedAppointments.length
        )
      : 0;

  const monthScheduledCount =
    currentMonthAppointments.filter(
      (appointment) => appointment.status === "scheduled"
    ).length;

  const monthCancelledCount =
    currentMonthAppointments.filter(
      (appointment) => appointment.status === "cancelled"
    ).length;

  const monthNoShowCount =
    currentMonthAppointments.filter(
      (appointment) => appointment.status === "no-show"
    ).length;

  const serviceStats = Object.values(
    currentMonthCompletedAppointments.reduce(
      (
        accumulator: Record<
          string,
          {
            name: string;
            count: number;
            income: number;
          }
        >,
        appointment
      ) => {
        const key = appointment.service || "Без услуги";

        if (!accumulator[key]) {
          accumulator[key] = {
            name: key,
            count: 0,
            income: 0,
          };
        }

        accumulator[key].count += 1;
        accumulator[key].income += Number(
          appointment.price || 0
        );

        return accumulator;
      },
      {}
    )
  ).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;

    return b.income - a.income;
  });

  const reminderClient =
    reminderClientId !== null
      ? clients.find(
          (client) => client.id === reminderClientId
        )
      : undefined;

  function getStatusLabel(status: AppointmentStatus) {
    if (status === "completed") return t.completedStatus;
    if (status === "cancelled") return t.cancelledStatus;
    if (status === "no-show") return t.noShowStatus;

    return t.scheduledStatus;
  }

  function getConnectionLabel() {
    if (!isOnline) return t.offline;

    if (isSyncing || pendingCount > 0) {
      return `${t.syncing}: ${pendingCount}`;
    }

    return t.online;
  }

  function getConnectionClass() {
    if (!isOnline) {
      return "border-orange-200 bg-orange-50 text-orange-700";
    }

    if (isSyncing || pendingCount > 0) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-green-200 bg-green-50 text-green-700";
  }

  function changeDay(amount: number) {
    const newDate = new Date(selectedDate);

    newDate.setDate(newDate.getDate() + amount);

    setSelectedDate(newDate);

    setVisibleMonth(
      new Date(newDate.getFullYear(), newDate.getMonth(), 1)
    );
  }

  function changeMonth(amount: number) {
    setVisibleMonth(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + amount,
        1
      )
    );
  }

  function goToToday() {
    const current = new Date();

    setSelectedDate(current);

    setVisibleMonth(
      new Date(
        current.getFullYear(),
        current.getMonth(),
        1
      )
    );
  }

  function selectMonthDate(date: Date) {
    setSelectedDate(date);

    setVisibleMonth(
      new Date(date.getFullYear(), date.getMonth(), 1)
    );

    setCalendarView("day");
  }

  function getAppointmentsForDate(date: Date) {
    const dateKey = formatDateKey(date);

    return appointments.filter(
      (appointment) => appointment.date === dateKey
    );
  }

  function resetAppointmentForm() {
    setEditingAppointmentId(null);
    setSelectedClientId("");
    setSelectedServiceId("");
    setAppointmentName("");
    setAppointmentDate(selectedDateKey);
    setAppointmentTime("");
    setAppointmentService("");
    setAppointmentDuration("90");
    setAppointmentPrice("");
    setAppointmentStatus("scheduled");
    setAppointmentError("");
    setHasConflict(false);
  }

  function openNewAppointment(prefilledTime = "") {
    resetAppointmentForm();

    setAppointmentDate(selectedDateKey);
    setAppointmentTime(prefilledTime);

    setIsAppointmentModalOpen(true);
  }

  function openNewAppointmentForClient(client: Client) {
    resetAppointmentForm();

    setSelectedClientId(String(client.id));
    setAppointmentDate(selectedDateKey);

    setIsClientDetailsOpen(false);
    setActiveTab("calendar");
    setCalendarView("day");

    setIsAppointmentModalOpen(true);
  }

  function openEditAppointment(appointment: Appointment) {
    setEditingAppointmentId(appointment.id);
    setAppointmentDate(appointment.date);
    setAppointmentTime(appointment.time);
    setAppointmentService(appointment.service);
    setAppointmentDuration(String(appointment.duration));
    setAppointmentPrice(String(appointment.price ?? 0));
    setAppointmentStatus(appointment.status ?? "scheduled");

    setSelectedServiceId(
      appointment.serviceId
        ? String(appointment.serviceId)
        : ""
    );

    if (appointment.clientId) {
      setSelectedClientId(String(appointment.clientId));
      setAppointmentName("");
    } else {
      setSelectedClientId("");
      setAppointmentName(appointment.name);
    }

    setAppointmentError("");
    setHasConflict(false);
    setIsAppointmentModalOpen(true);
  }

  function findConflictingAppointment(
    date: string,
    time: string,
    duration: number,
    ignoreId: number | null
  ) {
    const newStart = timeToMinutes(time);
    const newEnd = newStart + duration;

    return appointments.find((appointment) => {
      if (appointment.date !== date) return false;

      if (
        appointment.status === "cancelled" ||
        appointment.status === "no-show"
      ) {
        return false;
      }

      if (
        ignoreId !== null &&
        appointment.id === ignoreId
      ) {
        return false;
      }

      const existingStart = timeToMinutes(appointment.time);
      const existingEnd =
        existingStart + appointment.duration;

      return (
        newStart < existingEnd &&
        newEnd > existingStart
      );
    });
  }

  async function actuallySaveAppointment() {
    const selectedClient = clients.find(
      (client) =>
        client.id === Number(selectedClientId)
    );

    const selectedService = services.find(
      (service) =>
        service.id === Number(selectedServiceId)
    );

    const newAppointment: Appointment = {
      id: editingAppointmentId ?? Date.now(),
      date: appointmentDate,
      time: appointmentTime,

      clientId: selectedClient?.id,

      name:
        selectedClient?.name ||
        appointmentName.trim(),

      serviceId: selectedService?.id,

      service:
        selectedService?.name ||
        appointmentService.trim() ||
        (language === "uk"
          ? "Манікюр"
          : "Маникюр"),

      duration: Number(appointmentDuration),
      price: Number(appointmentPrice || 0),
      status: appointmentStatus,
    };

    if (editingAppointmentId !== null) {
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === editingAppointmentId
            ? newAppointment
            : appointment
        )
      );
    } else {
      setAppointments((current) => [
        ...current,
        newAppointment,
      ]);
    }

    const operation: PendingOperation = {
      id: createQueueId(),
      type: "upsert",
      table: "appointments",
      payload: {
        id: newAppointment.id,
        date: newAppointment.date,
        time: newAppointment.time,
        client_id: newAppointment.clientId ?? null,
        name: newAppointment.name,
        service_id: newAppointment.serviceId ?? null,
        service: newAppointment.service,
        duration: newAppointment.duration,
        price: newAppointment.price,
        status: newAppointment.status,
      },
    };

    await saveOrQueue(operation);

    setIsAppointmentModalOpen(false);
    resetAppointmentForm();
  }

  async function saveAppointment() {
    setAppointmentError("");
    setHasConflict(false);

    const selectedClient = clients.find(
      (client) =>
        client.id === Number(selectedClientId)
    );

    const finalName =
      selectedClient?.name ||
      appointmentName.trim();

    if (!finalName) {
      setAppointmentError(t.clientRequired);
      return;
    }

    if (!appointmentDate) {
      setAppointmentError(t.dateRequired);
      return;
    }

    if (!appointmentTime) {
      setAppointmentError(t.timeRequired);
      return;
    }

    if (
      appointmentStatus !== "cancelled" &&
      appointmentStatus !== "no-show"
    ) {
      const conflict = findConflictingAppointment(
        appointmentDate,
        appointmentTime,
        Number(appointmentDuration),
        editingAppointmentId
      );

      if (conflict) {
        const conflictEnd =
          timeToMinutes(conflict.time) +
          conflict.duration;

        setAppointmentError(
          `${t.conflict}: ${
            conflict.name
          }, ${conflict.time}–${minutesToTime(
            conflictEnd
          )}.`
        );

        setHasConflict(true);

        return;
      }
    }

    await actuallySaveAppointment();
  }

  async function deleteAppointment(id: number) {
    if (!window.confirm(t.deleteAppointmentConfirm)) {
      return;
    }

    setAppointments((current) =>
      current.filter(
        (appointment) =>
          appointment.id !== id
      )
    );

    await saveOrQueue({
      id: createQueueId(),
      type: "delete",
      table: "appointments",
      column: "id",
      value: id,
    });

    setIsAppointmentModalOpen(false);
  }

  function resetClientForm() {
    setEditingClientId(null);
    setClientName("");
    setClientPhone("");
    setClientSocial("");
    setClientNote("");
  }

  function openNewClient() {
    resetClientForm();
    setIsClientModalOpen(true);
  }

  function openClientDetails(clientId: number) {
    setSelectedClientDetailsId(clientId);
    setIsClientDetailsOpen(true);
  }

  function openEditClient(client: Client) {
    setEditingClientId(client.id);

    setClientName(client.name);
    setClientPhone(client.phone);
    setClientSocial(client.social);
    setClientNote(client.note);

    setIsClientDetailsOpen(false);
    setIsClientModalOpen(true);
  }

  async function saveClient() {
    if (!clientName.trim()) return;

    const clientId =
      editingClientId ?? Date.now();

    const newClient: Client = {
      id: clientId,
      name: clientName.trim(),
      phone: clientPhone.trim(),
      social: clientSocial.trim(),
      note: clientNote.trim(),
    };

    if (editingClientId !== null) {
      setClients((current) =>
        current.map((client) =>
          client.id === editingClientId
            ? newClient
            : client
        )
      );

      const affectedAppointments =
        appointments.filter(
          (appointment) =>
            appointment.clientId === editingClientId
        );

      const updatedAppointments =
        affectedAppointments.map((appointment) => ({
          ...appointment,
          name: newClient.name,
        }));

      setAppointments((current) =>
        current.map((appointment) => {
          const updated = updatedAppointments.find(
            (item) => item.id === appointment.id
          );

          return updated ?? appointment;
        })
      );

      for (const appointment of updatedAppointments) {
        await saveOrQueue({
          id: createQueueId(),
          type: "upsert",
          table: "appointments",
          payload: {
            id: appointment.id,
            date: appointment.date,
            time: appointment.time,
            client_id: appointment.clientId ?? null,
            name: appointment.name,
            service_id: appointment.serviceId ?? null,
            service: appointment.service,
            duration: appointment.duration,
            price: appointment.price,
            status: appointment.status,
          },
        });
      }
    } else {
      setClients((current) => [
        ...current,
        newClient,
      ]);
    }

    await saveOrQueue({
      id: createQueueId(),
      type: "upsert",
      table: "clients",
      payload: {
        id: newClient.id,
        name: newClient.name,
        phone: newClient.phone,
        social: newClient.social,
        note: newClient.note,
      },
    });

    setIsClientModalOpen(false);
    resetClientForm();
  }

  async function deleteClient(id: number) {
    if (!window.confirm(t.deleteClientConfirm)) {
      return;
    }

    setClients((current) =>
      current.filter(
        (client) => client.id !== id
      )
    );

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.clientId === id
          ? {
              ...appointment,
              clientId: undefined,
            }
          : appointment
      )
    );

    await saveOrQueue({
      id: createQueueId(),
      type: "delete",
      table: "clients",
      column: "id",
      value: id,
    });

    setIsClientDetailsOpen(false);
    setSelectedClientDetailsId(null);
  }

  function resetServiceForm() {
    setEditingServiceId(null);
    setServiceName("");
    setServiceDuration("90");
    setServicePrice("");
  }

  function openNewService() {
    resetServiceForm();
    setIsServiceModalOpen(true);
  }

  function openEditService(service: Service) {
    setEditingServiceId(service.id);
    setServiceName(service.name);
    setServiceDuration(String(service.duration));
    setServicePrice(String(service.price));

    setIsServiceModalOpen(true);
  }

  async function saveService() {
    if (!serviceName.trim()) return;

    const newService: Service = {
      id: editingServiceId ?? Date.now(),
      name: serviceName.trim(),
      duration: Number(serviceDuration),
      price: Number(servicePrice || 0),
    };

    if (editingServiceId !== null) {
      setServices((current) =>
        current.map((service) =>
          service.id === editingServiceId
            ? newService
            : service
        )
      );
    } else {
      setServices((current) => [
        ...current,
        newService,
      ]);
    }

    await saveOrQueue({
      id: createQueueId(),
      type: "upsert",
      table: "services",
      payload: {
        id: newService.id,
        name: newService.name,
        duration: newService.duration,
        price: newService.price,
      },
    });

    setIsServiceModalOpen(false);
    resetServiceForm();
  }

  async function deleteService(id: number) {
    if (!window.confirm(t.deleteServiceConfirm)) {
      return;
    }

    setServices((current) =>
      current.filter(
        (service) => service.id !== id
      )
    );

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.serviceId === id
          ? {
              ...appointment,
              serviceId: undefined,
            }
          : appointment
      )
    );

    await saveOrQueue({
      id: createQueueId(),
      type: "delete",
      table: "services",
      column: "id",
      value: id,
    });
  }

  function getClientAppointmentsCount(clientId: number) {
    return appointments.filter(
      (appointment) =>
        appointment.clientId === clientId
    ).length;
  }

  function getClientForAppointment(
    appointment: Appointment
  ) {
    if (appointment.clientId) {
      const client = clients.find(
        (item) =>
          item.id === appointment.clientId
      );

      if (client) return client;
    }

    return clients.find(
      (client) =>
        client.name.trim().toLowerCase() ===
        appointment.name.trim().toLowerCase()
    );
  }

  function handleCalendarClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const y = event.clientY - rect.top;

    const clickedHour =
      workSettings.startHour +
      Math.floor(y / HOUR_HEIGHT);

    if (
      clickedHour < workSettings.startHour ||
      clickedHour >= workSettings.endHour
    ) {
      return;
    }

    openNewAppointment(
      `${String(clickedHour).padStart(2, "0")}:00`
    );
  }

  function clearAppointmentWarning() {
    setAppointmentError("");
    setHasConflict(false);
  }

  function handleServiceSelection(serviceId: string) {
    setSelectedServiceId(serviceId);

    clearAppointmentWarning();

    if (!serviceId) return;

    const service = services.find(
      (item) => item.id === Number(serviceId)
    );

    if (!service) return;

    setAppointmentService(service.name);
    setAppointmentDuration(String(service.duration));
    setAppointmentPrice(String(service.price));
  }

  function toggleWorkDay(day: number) {
    if (workSettings.workDays.includes(day)) {
      setWorkSettings({
        ...workSettings,
        workDays: workSettings.workDays.filter(
          (item) => item !== day
        ),
      });
    } else {
      setWorkSettings({
        ...workSettings,
        workDays: [
          ...workSettings.workDays,
          day,
        ],
      });
    }
  }

  function openReminder(appointment: Appointment) {
    const client =
      appointment.clientId !== undefined
        ? clients.find(
            (item) =>
              item.id === appointment.clientId
          )
        : undefined;

    const name =
      client?.name ||
      appointment.name;

    const text =
      `Привіт, ${name}! ` +
      `Нагадую про ваш запис ${formatUkrainianReminderDate(
        appointment.date
      )} о ${appointment.time}. ` +
      `Послуга: ${appointment.service}. ` +
      `Чекаю на вас ❤️`;

    setReminderText(text);
    setReminderClientId(client?.id ?? null);
    setReminderCopied(false);
    setIsReminderModalOpen(true);
  }

  function openReminderForEditingAppointment() {
    if (editingAppointmentId === null) return;

    const appointment = appointments.find(
      (item) =>
        item.id === editingAppointmentId
    );

    if (!appointment) return;

    setIsAppointmentModalOpen(false);

    openReminder(appointment);
  }

  async function copyReminder() {
    try {
      await navigator.clipboard.writeText(reminderText);

      setReminderCopied(true);
    } catch {
      window.alert(reminderText);
    }
  }

  function openExternal(url: string) {
    if (!url) return;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (!authChecked) {
    return (
      <main
        className="flex h-dvh items-center justify-center"
        style={APP_BACKGROUND_STYLE}
      >
        <div className="rounded-3xl bg-rose-50/80 px-8 py-7 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-black" />

          <p className="mt-4 font-semibold">
            Nails Calendar
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main
        className="flex h-dvh items-center justify-center px-5"
        style={APP_BACKGROUND_STYLE}
      >
        <div className="w-full max-w-sm rounded-3xl bg-rose-50/75 p-6 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-2xl text-white">
              ✦
            </div>

            <h1 className="mt-4 text-2xl font-semibold">
              Nails Calendar
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              Вхід до календаря / Вход в календарь
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="mt-7 space-y-4"
          >
            <input
              type="email"
              autoComplete="email"
              required
              value={loginEmail}
              onChange={(event) => {
                setLoginEmail(event.target.value);
                setLoginError("");
              }}
              placeholder="Email"
              className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-black"
            />

            <input
              type="password"
              autoComplete="current-password"
              required
              value={loginPassword}
              onChange={(event) => {
                setLoginPassword(event.target.value);
                setLoginError("");
              }}
              placeholder="Пароль"
              className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-black"
            />

            {loginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-black px-4 py-4 font-medium text-white"
            >
              Увійти / Войти
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main
        className="flex h-dvh items-center justify-center"
        style={APP_BACKGROUND_STYLE}
      >
        <div className="rounded-2xl bg-rose-50/80 px-6 py-5 text-center shadow-xl">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-rose-200 border-t-black" />

          <p className="mt-3 text-sm font-medium">
            Nails
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="h-dvh overflow-hidden text-neutral-900"
      style={APP_BACKGROUND_STYLE}
    >
      <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-rose-50/45 shadow-2xl backdrop-blur-[1px]">

        {activeTab === "calendar" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="z-20 shrink-0 border-b border-neutral-600/65 bg-rose-50/70 backdrop-blur-md">
              <div className="px-5 pb-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm capitalize text-neutral-500">
                        {calendarView === "day"
                          ? selectedDateIsToday
                            ? t.today
                            : formatWeekday(
                                selectedDate,
                                language
                              )
                          : t.calendar}
                      </p>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getConnectionClass()}`}
                      >
                        {getConnectionLabel()}
                      </span>
                    </div>

                    <h1 className="text-2xl font-semibold capitalize">
                      {calendarView === "day"
                        ? formatDateTitle(
                            selectedDate,
                            language
                          )
                        : formatMonthTitle(
                            visibleMonth,
                            language
                          )}
                    </h1>

                    <p className="mt-1 text-xs text-neutral-400">
                      {t.records}:{" "}
                      {selectedDayAppointments.length}
                    </p>
                  </div>

                  <button
                    onClick={() => openNewAppointment()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-2xl text-white"
                  >
                    +
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 rounded-xl bg-rose-100/70 p-1">
                  <button
                    onClick={() => setCalendarView("day")}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      calendarView === "day"
                        ? "bg-white/90 font-medium shadow-sm"
                        : "text-neutral-500"
                    }`}
                  >
                    {t.day}
                  </button>

                  <button
                    onClick={() => setCalendarView("month")}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      calendarView === "month"
                        ? "bg-white/90 font-medium shadow-sm"
                        : "text-neutral-500"
                    }`}
                  >
                    {t.month}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[48px_1fr_48px] items-center border-t border-neutral-600/65 px-3 py-2">
                <button
                  onClick={() =>
                    calendarView === "day"
                      ? changeDay(-1)
                      : changeMonth(-1)
                  }
                  className="text-2xl"
                >
                  ‹
                </button>

                <button
                  onClick={goToToday}
                  className="mx-auto rounded-xl bg-rose-100/70 px-4 py-2 text-sm font-medium"
                >
                  {calendarView === "day"
                    ? selectedDateIsToday
                      ? t.today
                      : t.returnToday
                    : visibleMonthIsCurrent
                    ? t.currentMonth
                    : t.returnCurrentMonth}
                </button>

                <button
                  onClick={() =>
                    calendarView === "day"
                      ? changeDay(1)
                      : changeMonth(1)
                  }
                  className="text-2xl"
                >
                  ›
                </button>
              </div>
            </header>

            {calendarView === "day" && (
              <section className="min-h-0 flex-1 overflow-y-auto">
                <div
                  className="grid grid-cols-[70px_1fr]"
                  style={{
                    height: `${calendarHeight}px`,
                  }}
                >
                  <div className="relative border-r border-neutral-600/65">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 w-full px-3 text-sm text-neutral-600"
                        style={{
                          top: `${
                            (hour - workSettings.startHour) *
                            HOUR_HEIGHT
                          }px`,
                        }}
                      >
                        {String(hour).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>

                  <div
                    className="relative cursor-pointer"
                    onClick={handleCalendarClick}
                  >
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-neutral-600/65"
                        style={{
                          top: `${
                            (hour - workSettings.startHour) *
                            HOUR_HEIGHT
                          }px`,
                        }}
                      />
                    ))}

                    {selectedDayAppointments.map(
                      (appointment) => {
                        const top = getAppointmentTop(
                          appointment.time,
                          workSettings.startHour
                        );

                        const height = getAppointmentHeight(
                          appointment.duration
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
                            className={`absolute left-2 right-2 z-10 overflow-hidden rounded-2xl border p-3 text-left shadow-md ${getAppointmentCardClass(
                              appointment.status
                            )}`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                          >
                            <div className="flex justify-between gap-2">
                              <p className="text-sm font-medium">
                                {appointment.time}
                              </p>

                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] ${getStatusBadgeClass(
                                  appointment.status
                                )}`}
                              >
                                {getStatusLabel(
                                  appointment.status
                                )}
                              </span>
                            </div>

                            <p className="mt-1 truncate font-semibold">
                              {appointment.name}
                            </p>

                            {height >= 70 && (
                              <p className="mt-1 truncate text-sm text-neutral-600">
                                {appointment.service}
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

            {calendarView === "month" && (
              <section className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="rounded-2xl bg-white/65 p-3">
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day.value}
                        className="py-2 text-center text-xs text-neutral-500"
                      >
                        {day[language]}
                      </div>
                    ))}

                    {monthDays.map((item) => {
                      const dateKey = formatDateKey(item.date);

                      const count =
                        getAppointmentsForDate(item.date).length;

                      return (
                        <button
                          key={dateKey}
                          onClick={() =>
                            selectMonthDate(item.date)
                          }
                          className={`min-h-[60px] rounded-xl p-2 ${
                            dateKey === selectedDateKey
                              ? "bg-black text-white"
                              : item.isCurrentMonth
                              ? "bg-white/40"
                              : "text-neutral-300"
                          }`}
                        >
                          <div>
                            {item.date.getDate()}
                          </div>

                          {count > 0 && (
                            <div className="mt-1 text-xs">
                              {count}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "clients" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 bg-rose-50/70 px-5 py-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-neutral-500">
                    {t.clientBase}
                  </p>

                  <h1 className="text-2xl font-semibold">
                    {t.clients}
                  </h1>
                </div>

                <button
                  onClick={openNewClient}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-2xl text-white"
                >
                  +
                </button>
              </div>

              <input
                value={clientSearch}
                onChange={(event) =>
                  setClientSearch(event.target.value)
                }
                placeholder={t.searchClient}
                className="mt-4 w-full rounded-xl border bg-white px-4 py-3"
              />
            </header>

            <section className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() =>
                    openClientDetails(client.id)
                  }
                  className="w-full rounded-2xl bg-white/70 p-4 text-left shadow"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">
                        {client.name}
                      </p>

                      <p className="text-sm text-neutral-500">
                        {client.phone}
                      </p>
                    </div>

                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs">
                      {getClientAppointmentsCount(
                        client.id
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </section>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 bg-rose-50/70 px-5 py-4">
              <p className="text-sm text-neutral-500">
                {t.financeRecords}
              </p>

              <h1 className="text-2xl font-semibold">
                {t.analytics}
              </h1>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={t.todayIncome}
                  value={`${todayIncome} грн`}
                />

                <StatCard
                  label={t.sevenDays}
                  value={`${weekIncome} грн`}
                />

                <StatCard
                  label={t.currentMonthIncome}
                  value={`${monthIncome} грн`}
                />

                <StatCard
                  label={t.averageCheck}
                  value={`${averageCheck} грн`}
                />

                <StatCard
                  label={t.scheduled}
                  value={String(monthScheduledCount)}
                />

                <StatCard
                  label={t.cancelled}
                  value={String(monthCancelledCount)}
                />

                <StatCard
                  label={t.noShow}
                  value={String(monthNoShowCount)}
                />
              </div>

              <h2 className="mt-6 text-lg font-semibold">
                {t.topServices}
              </h2>

              <div className="mt-3 space-y-2">
                {serviceStats.map((service) => (
                  <div
                    key={service.name}
                    className="rounded-2xl bg-white/70 p-4"
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
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 bg-rose-50/70 px-5 py-4">
              <h1 className="text-2xl font-semibold">
                {t.settings}
              </h1>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto p-5">
              <h2 className="font-semibold">
                {t.database}
              </h2>

              <div
                className={`mt-3 rounded-2xl border p-4 ${getConnectionClass()}`}
              >
                <p className="font-medium">
                  {getConnectionLabel()}
                </p>

                {pendingCount > 0 && (
                  <p className="mt-1 text-xs">
                    {pendingCount} pending
                  </p>
                )}
              </div>

              <h2 className="mt-7 font-semibold">
                {t.language}
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLanguage("ru")}
                  className={`rounded-xl p-3 ${
                    language === "ru"
                      ? "bg-black text-white"
                      : "bg-white/70"
                  }`}
                >
                  Русский
                </button>

                <button
                  onClick={() => setLanguage("uk")}
                  className={`rounded-xl p-3 ${
                    language === "uk"
                      ? "bg-black text-white"
                      : "bg-white/70"
                  }`}
                >
                  Українська
                </button>
              </div>

              <h2 className="mt-7 font-semibold">
                {t.workSchedule}
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <select
                  value={workSettings.startHour}
                  onChange={(event) =>
                    setWorkSettings({
                      ...workSettings,
                      startHour: Number(event.target.value),
                    })
                  }
                  className="rounded-xl bg-white p-3"
                >
                  {Array.from(
                    { length: 18 },
                    (_, index) => index + 6
                  ).map((hour) => (
                    <option
                      key={hour}
                      value={hour}
                    >
                      {hour}:00
                    </option>
                  ))}
                </select>

                <select
                  value={workSettings.endHour}
                  onChange={(event) =>
                    setWorkSettings({
                      ...workSettings,
                      endHour: Number(event.target.value),
                    })
                  }
                  className="rounded-xl bg-white p-3"
                >
                  {Array.from(
                    { length: 18 },
                    (_, index) => index + 7
                  ).map((hour) => (
                    <option
                      key={hour}
                      value={hour}
                    >
                      {hour}:00
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() =>
                      toggleWorkDay(day.value)
                    }
                    className={`rounded-xl py-3 text-xs ${
                      workSettings.workDays.includes(
                        day.value
                      )
                        ? "bg-black text-white"
                        : "bg-white/60"
                    }`}
                  >
                    {day[language]}
                  </button>
                ))}
              </div>

              <div className="mt-7 flex items-center justify-between">
                <h2 className="font-semibold">
                  {t.services}
                </h2>

                <button
                  onClick={openNewService}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"
                >
                  +
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-2xl bg-white/70 p-4"
                  >
                    <p className="font-semibold">
                      {service.name}
                    </p>

                    <p className="text-sm text-neutral-500">
                      {service.duration} {t.minutes} ·{" "}
                      {service.price} грн
                    </p>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() =>
                          openEditService(service)
                        }
                        className="rounded-lg bg-white px-3 py-2 text-xs"
                      >
                        {t.edit}
                      </button>

                      <button
                        onClick={() =>
                          deleteService(service.id)
                        }
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-2xl bg-white/65 p-4">
                <p className="text-sm">
                  {session.user.email}
                </p>

                <button
                  onClick={handleLogout}
                  className="mt-3 w-full rounded-xl bg-red-50 p-3 text-red-600"
                >
                  {t.logout}
                </button>
              </div>
            </section>
          </div>
        )}

        <nav className="grid shrink-0 grid-cols-4 border-t border-neutral-600/50 bg-rose-50/80 backdrop-blur-md">
          <NavButton
            active={activeTab === "calendar"}
            onClick={() => setActiveTab("calendar")}
          >
            {t.calendar}
          </NavButton>

          <NavButton
            active={activeTab === "clients"}
            onClick={() => setActiveTab("clients")}
          >
            {t.clients}
          </NavButton>

          <NavButton
            active={activeTab === "analytics"}
            onClick={() => setActiveTab("analytics")}
          >
            {t.analytics}
          </NavButton>

          <NavButton
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          >
            {t.settings}
          </NavButton>
        </nav>

        {isAppointmentModalOpen && (
          <Modal
            onClose={() =>
              setIsAppointmentModalOpen(false)
            }
          >
            <h2 className="text-xl font-semibold">
              {editingAppointmentId !== null
                ? t.appointmentEdit
                : t.appointmentNew}
            </h2>

            <div className="mt-5 space-y-4">
              {clients.length > 0 && (
                <select
                  value={selectedClientId}
                  onChange={(event) => {
                    setSelectedClientId(event.target.value);

                    if (event.target.value) {
                      setAppointmentName("");
                    }
                  }}
                  className="w-full rounded-xl border bg-white p-3"
                >
                  <option value="">
                    {t.manualName}
                  </option>

                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name}
                    </option>
                  ))}
                </select>
              )}

              {!selectedClientId && (
                <input
                  value={appointmentName}
                  onChange={(event) =>
                    setAppointmentName(event.target.value)
                  }
                  placeholder={t.clientName}
                  className="w-full rounded-xl border bg-white p-3"
                />
              )}

              {services.length > 0 && (
                <select
                  value={selectedServiceId}
                  onChange={(event) =>
                    handleServiceSelection(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border bg-white p-3"
                >
                  <option value="">
                    {t.manualService}
                  </option>

                  {services.map((service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.name}
                    </option>
                  ))}
                </select>
              )}

              {!selectedServiceId && (
                <input
                  value={appointmentService}
                  onChange={(event) =>
                    setAppointmentService(event.target.value)
                  }
                  placeholder={t.serviceName}
                  className="w-full rounded-xl border bg-white p-3"
                />
              )}

              <div className="flex min-w-0 items-start gap-5">
                <div className="w-[40%] min-w-0">
                  <label className="mb-1 block text-sm text-neutral-500">
                    {t.date}
                  </label>

                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(event) =>
                      setAppointmentDate(event.target.value)
                    }
                    className="block w-full min-w-0 rounded-xl border bg-white px-2 py-3 text-base"
                  />
                </div>

                <div className="w-[40%] min-w-0">
                  <label className="mb-1 block text-sm text-neutral-500">
                    {t.time}
                  </label>

                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(event) =>
                      setAppointmentTime(event.target.value)
                    }
                    className="block w-full min-w-0 rounded-xl border bg-white px-2 py-3 text-base"
                  />
                </div>
              </div>

              <select
                value={appointmentDuration}
                onChange={(event) =>
                  setAppointmentDuration(event.target.value)
                }
                className="w-full rounded-xl border bg-white p-3"
              >
                {[30, 60, 90, 120, 150, 180].map(
                  (minutes) => (
                    <option
                      key={minutes}
                      value={minutes}
                    >
                      {minutes} {t.minutes}
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                value={appointmentPrice}
                onChange={(event) =>
                  setAppointmentPrice(event.target.value)
                }
                placeholder={t.price}
                className="w-full rounded-xl border bg-white p-3"
              />

              <select
                value={appointmentStatus}
                onChange={(event) =>
                  setAppointmentStatus(
                    event.target
                      .value as AppointmentStatus
                  )
                }
                className="w-full rounded-xl border bg-white p-3"
              >
                <option value="scheduled">
                  {t.scheduledStatus}
                </option>

                <option value="completed">
                  {t.completedStatus}
                </option>

                <option value="cancelled">
                  {t.cancelledStatus}
                </option>

                <option value="no-show">
                  {t.noShowStatus}
                </option>
              </select>

              {editingAppointmentId !== null &&
                appointmentStatus === "scheduled" && (
                  <button
                    onClick={
                      openReminderForEditingAppointment
                    }
                    className="w-full rounded-xl bg-sky-50 p-3 font-medium text-sky-700"
                  >
                    {t.remindClient}
                  </button>
                )}

              {appointmentError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {appointmentError}

                  {hasConflict && (
                    <button
                      onClick={actuallySaveAppointment}
                      className="mt-3 w-full rounded-xl bg-white p-3"
                    >
                      {t.forceSave}
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={saveAppointment}
                className="w-full rounded-xl bg-black p-4 text-white"
              >
                {editingAppointmentId !== null
                  ? t.saveChanges
                  : t.createAppointment}
              </button>

              {editingAppointmentId !== null && (
                <button
                  onClick={() =>
                    deleteAppointment(
                      editingAppointmentId
                    )
                  }
                  className="w-full rounded-xl bg-red-50 p-4 text-red-600"
                >
                  {t.deleteAppointment}
                </button>
              )}
            </div>
          </Modal>
        )}

        {isClientModalOpen && (
          <Modal
            onClose={() => setIsClientModalOpen(false)}
          >
            <h2 className="text-xl font-semibold">
              {editingClientId !== null
                ? t.editClient
                : t.newClient}
            </h2>

            <div className="mt-5 space-y-4">
              <input
                value={clientName}
                onChange={(event) =>
                  setClientName(event.target.value)
                }
                placeholder={t.name}
                className="w-full rounded-xl border bg-white p-3"
              />

              <input
                value={clientPhone}
                onChange={(event) =>
                  setClientPhone(event.target.value)
                }
                placeholder={t.phone}
                className="w-full rounded-xl border bg-white p-3"
              />

              <input
                value={clientSocial}
                onChange={(event) =>
                  setClientSocial(event.target.value)
                }
                placeholder="Instagram / Telegram"
                className="w-full rounded-xl border bg-white p-3"
              />

              <textarea
                value={clientNote}
                onChange={(event) =>
                  setClientNote(event.target.value)
                }
                placeholder={t.note}
                className="w-full rounded-xl border bg-white p-3"
              />

              <button
                onClick={saveClient}
                className="w-full rounded-xl bg-black p-4 text-white"
              >
                {t.save}
              </button>
            </div>
          </Modal>
        )}

        {isClientDetailsOpen &&
          selectedClientDetails && (
            <Modal
              onClose={() =>
                setIsClientDetailsOpen(false)
              }
            >
              <h2 className="text-2xl font-semibold">
                {selectedClientDetails.name}
              </h2>

              <p className="mt-2 text-sm">
                {selectedClientDetails.phone ||
                  t.phoneMissing}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {selectedClientDetails.phone && (
                  <a
                    href={getPhoneUrl(
                      selectedClientDetails.phone
                    )}
                    className="rounded-xl bg-black p-3 text-center text-sm text-white"
                  >
                    {t.call}
                  </a>
                )}

                {selectedClientDetails.social && (
                  <>
                    <button
                      onClick={() =>
                        openExternal(
                          getTelegramUrl(
                            selectedClientDetails.social
                          )
                        )
                      }
                      className="rounded-xl bg-white p-3 text-sm"
                    >
                      {t.telegram}
                    </button>

                    <button
                      onClick={() =>
                        openExternal(
                          getInstagramUrl(
                            selectedClientDetails.social
                          )
                        )
                      }
                      className="rounded-xl bg-white p-3 text-sm"
                    >
                      {t.instagram}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() =>
                  openNewAppointmentForClient(
                    selectedClientDetails
                  )
                }
                className="mt-4 w-full rounded-xl bg-black p-4 text-white"
              >
                {t.bookClient}
              </button>

              <button
                onClick={() =>
                  openEditClient(selectedClientDetails)
                }
                className="mt-2 w-full rounded-xl bg-white p-3"
              >
                {t.editClientButton}
              </button>

              <h3 className="mt-6 font-semibold">
                {t.futureAppointments}
              </h3>

              <div className="mt-2 space-y-2">
                {futureClientAppointments.map(
                  (appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-xl bg-white/70 p-3"
                    >
                      <p className="font-medium">
                        {formatFullDate(
                          appointment.date,
                          language
                        )}{" "}
                        · {appointment.time}
                      </p>

                      <button
                        onClick={() =>
                          openReminder(appointment)
                        }
                        className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700"
                      >
                        {t.remind}
                      </button>
                    </div>
                  )
                )}
              </div>

              <h3 className="mt-6 font-semibold">
                {t.history}
              </h3>

              <div className="mt-2 space-y-2">
                {pastClientAppointments.map(
                  (appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-xl bg-white/70 p-3 text-sm"
                    >
                      {formatFullDate(
                        appointment.date,
                        language
                      )}{" "}
                      · {appointment.service}
                    </div>
                  )
                )}
              </div>

              <button
                onClick={() =>
                  deleteClient(selectedClientDetails.id)
                }
                className="mt-6 w-full rounded-xl bg-red-50 p-3 text-red-600"
              >
                {t.deleteClient}
              </button>
            </Modal>
          )}

        {isServiceModalOpen && (
          <Modal
            onClose={() => setIsServiceModalOpen(false)}
          >
            <h2 className="text-xl font-semibold">
              {editingServiceId !== null
                ? t.editService
                : t.newService}
            </h2>

            <div className="mt-5 space-y-4">
              <input
                value={serviceName}
                onChange={(event) =>
                  setServiceName(event.target.value)
                }
                placeholder={t.serviceName}
                className="w-full rounded-xl border bg-white p-3"
              />

              <select
                value={serviceDuration}
                onChange={(event) =>
                  setServiceDuration(event.target.value)
                }
                className="w-full rounded-xl border bg-white p-3"
              >
                {[30, 60, 90, 120, 150, 180].map(
                  (minutes) => (
                    <option
                      key={minutes}
                      value={minutes}
                    >
                      {minutes} {t.minutes}
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                value={servicePrice}
                onChange={(event) =>
                  setServicePrice(event.target.value)
                }
                placeholder={t.servicePrice}
                className="w-full rounded-xl border bg-white p-3"
              />

              <button
                onClick={saveService}
                className="w-full rounded-xl bg-black p-4 text-white"
              >
                {t.save}
              </button>
            </div>
          </Modal>
        )}

        {isReminderModalOpen && (
          <Modal
            onClose={() =>
              setIsReminderModalOpen(false)
            }
          >
            <h2 className="text-xl font-semibold">
              {t.reminder}
            </h2>

            <textarea
              value={reminderText}
              onChange={(event) => {
                setReminderText(event.target.value);
                setReminderCopied(false);
              }}
              rows={7}
              className="mt-5 w-full rounded-xl border bg-white p-3"
            />

            <button
              onClick={copyReminder}
              className="mt-3 w-full rounded-xl bg-black p-4 text-white"
            >
              {reminderCopied
                ? t.copied
                : t.copyText}
            </button>

            {reminderClient?.social && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(getSocialType(reminderClient.social) ===
                  "telegram" ||
                  getSocialType(reminderClient.social) ===
                    "unknown") && (
                  <button
                    onClick={() =>
                      openExternal(
                        getTelegramUrl(
                          reminderClient.social
                        )
                      )
                    }
                    className="rounded-xl bg-white p-3"
                  >
                    {t.openTelegram}
                  </button>
                )}

                {(getSocialType(reminderClient.social) ===
                  "instagram" ||
                  getSocialType(reminderClient.social) ===
                    "unknown") && (
                  <button
                    onClick={() =>
                      openExternal(
                        getInstagramUrl(
                          reminderClient.social
                        )
                      )
                    }
                    className="rounded-xl bg-white p-3"
                  >
                    {t.openInstagram}
                  </button>
                )}
              </div>
            )}
          </Modal>
        )}
      </div>
    </main>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-1 py-4 text-xs ${
        active
          ? "font-semibold text-neutral-900"
          : "text-neutral-400"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/65 p-4 backdrop-blur-sm">
      <p className="text-xs text-neutral-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-rose-50/94 p-5 backdrop-blur-md">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-neutral-500"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}