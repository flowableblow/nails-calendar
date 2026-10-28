"use client";

import { useEffect, useMemo, useState } from "react";
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

type Tab =
  | "calendar"
  | "clients"
  | "analytics"
  | "settings";

type CalendarView = "day" | "month";

type DatabaseStatus =
  | "connecting"
  | "connected"
  | "error";

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
const MIGRATION_STORAGE_KEY =
  "nails-calendar-supabase-migrated";

const DEFAULT_WORK_SETTINGS: WorkSettings = {
  startHour: 9,
  endHour: 21,
  workDays: [0, 1, 2, 3, 4, 5, 6],
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

    database: "Облачная база",
    databaseConnected: "Supabase подключён",
    databaseConnecting: "Подключение к Supabase...",
    databaseError: "Ошибка подключения к Supabase",

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
    social: "Instagram / Telegram",
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

    reminder: "Напоминание клиенту",
    reminderHint: "Текст всегда формируется на украинском языке",
    copyText: "Скопировать текст",
    copied: "Скопировано",
    openTelegram: "Открыть Telegram",
    openInstagram: "Открыть Instagram",

    newService: "Новая услуга",
    editService: "Редактировать услугу",
    serviceDuration: "Длительность",
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

    databaseSaveError:
      "Не удалось сохранить данные в облако.",
    databaseDeleteError:
      "Не удалось удалить данные из облака.",
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

    database: "Хмарна база",
    databaseConnected: "Supabase підключено",
    databaseConnecting: "Підключення до Supabase...",
    databaseError: "Помилка підключення до Supabase",

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
    social: "Instagram / Telegram",
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

    reminder: "Нагадування клієнту",
    reminderHint: "Текст завжди формується українською мовою",
    copyText: "Скопіювати текст",
    copied: "Скопійовано",
    openTelegram: "Відкрити Telegram",
    openInstagram: "Відкрити Instagram",

    newService: "Нова послуга",
    editService: "Редагувати послугу",
    serviceDuration: "Тривалість",
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

    databaseSaveError:
      "Не вдалося зберегти дані у хмарі.",
    databaseDeleteError:
      "Не вдалося видалити дані з хмари.",
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

function getMonthCalendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let firstWeekday = firstDay.getDay();

  if (firstWeekday === 0) firstWeekday = 7;

  const daysBefore = firstWeekday - 1;
  const daysInMonth = lastDay.getDate();

  const cells: {
    date: Date;
    isCurrentMonth: boolean;
  }[] = [];

  for (let index = daysBefore; index > 0; index--) {
    cells.push({
      date: new Date(year, month, 1 - index),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const nextDay =
      cells.length - daysBefore - daysInMonth + 1;

    cells.push({
      date: new Date(year, month + 1, nextDay),
      isCurrentMonth: false,
    });
  }

  return cells;
}

function sumPrices(appointments: Appointment[]) {
  return appointments.reduce(
    (total, appointment) =>
      total + Number(appointment.price || 0),
    0
  );
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

function safeParseArray<T>(value: string | null): T[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  return "border-blue-200 bg-blue-50 text-blue-700";
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

  return "border-neutral-400 bg-neutral-200/90";
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);

  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);

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

  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [calendarView, setCalendarView] =
    useState<CalendarView>("day");

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [visibleMonth, setVisibleMonth] = useState(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
  );

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [workSettings, setWorkSettings] =
    useState<WorkSettings>(DEFAULT_WORK_SETTINGS);

  const [isLoaded, setIsLoaded] = useState(false);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] =
    useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  const [editingAppointmentId, setEditingAppointmentId] = useState<
    number | null
  >(null);

  const [editingClientId, setEditingClientId] = useState<number | null>(
    null
  );

  const [editingServiceId, setEditingServiceId] = useState<
    number | null
  >(null);

  const [selectedClientDetailsId, setSelectedClientDetailsId] = useState<
    number | null
  >(null);

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
  const [reminderClientId, setReminderClientId] = useState<
    number | null
  >(null);
  const [reminderCopied, setReminderCopied] = useState(false);

  useEffect(() => {
    const localLanguage =
      localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (localLanguage === "ru" || localLanguage === "uk") {
      setLanguage(localLanguage);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthChecked(true);

      if (!nextSession) {
        setIsLoaded(false);
        setClients([]);
        setServices([]);
        setAppointments([]);
        setDatabaseStatus("connecting");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session) return;

    async function loadData() {
      setIsLoaded(false);
      setDatabaseStatus("connecting");

      try {
        const [
          clientsResult,
          servicesResult,
          appointmentsResult,
          settingsResult,
        ] = await Promise.all([
          supabase
            .from("clients")
            .select("*")
            .order("name"),

          supabase
            .from("services")
            .select("*")
            .order("name"),

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

        const databaseIsEmpty =
          databaseClients.length === 0 &&
          databaseServices.length === 0 &&
          databaseAppointments.length === 0;

        const migrationDone =
          localStorage.getItem(MIGRATION_STORAGE_KEY) === "true";

        if (databaseIsEmpty && !migrationDone) {
          const localClients = safeParseArray<Client>(
            localStorage.getItem(CLIENTS_STORAGE_KEY)
          );

          const localServices = safeParseArray<Service>(
            localStorage.getItem(SERVICES_STORAGE_KEY)
          );

          const localAppointments = safeParseArray<Appointment>(
            localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
          );

          if (localClients.length > 0) {
            const { error } = await supabase.from("clients").upsert(
              localClients.map((client) => ({
                id: client.id,
                name: client.name,
                phone: client.phone ?? "",
                social: client.social ?? "",
                note: client.note ?? "",
              })),
              {
                onConflict: "id",
              }
            );

            if (error) throw error;
          }

          if (localServices.length > 0) {
            const { error } = await supabase.from("services").upsert(
              localServices.map((service) => ({
                id: service.id,
                name: service.name,
                duration: Number(service.duration) || 90,
                price: Number(service.price) || 0,
              })),
              {
                onConflict: "id",
              }
            );

            if (error) throw error;
          }

          const validClientIds = new Set(
            localClients.map((client) => client.id)
          );

          const validServiceIds = new Set(
            localServices.map((service) => service.id)
          );

          if (localAppointments.length > 0) {
            const { error } = await supabase
              .from("appointments")
              .upsert(
                localAppointments.map((appointment) => ({
                  id: appointment.id,
                  date: appointment.date,
                  time: appointment.time,

                  client_id:
                    appointment.clientId &&
                    validClientIds.has(appointment.clientId)
                      ? appointment.clientId
                      : null,

                  name: appointment.name,

                  service_id:
                    appointment.serviceId &&
                    validServiceIds.has(appointment.serviceId)
                      ? appointment.serviceId
                      : null,

                  service: appointment.service ?? "",
                  duration: Number(appointment.duration) || 90,
                  price: Number(appointment.price) || 0,

                  status:
                    appointment.status ?? "scheduled",
                })),
                {
                  onConflict: "id",
                }
              );

            if (error) throw error;
          }

          localStorage.setItem(
            MIGRATION_STORAGE_KEY,
            "true"
          );

          setClients(localClients);
          setServices(localServices);

          setAppointments(
            localAppointments.map((appointment) => ({
              ...appointment,
              price: Number(appointment.price ?? 0),
              status: appointment.status ?? "scheduled",
            }))
          );
        } else {
          setClients(databaseClients);
          setServices(databaseServices);
          setAppointments(databaseAppointments);
        }

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

        setDatabaseStatus("connected");
      } catch (error) {
        console.error("Supabase load error:", error);
        setDatabaseStatus("error");
      } finally {
        setIsLoaded(true);
      }
    }

    loadData();
  }, [session, supabase]);

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
  }, [language, workSettings, isLoaded]);

  useEffect(() => {
    if (
      !session ||
      !isLoaded ||
      databaseStatus !== "connected"
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from("settings").upsert(
        {
          id: "main",
          language,
          start_hour: workSettings.startHour,
          end_hour: workSettings.endHour,
          work_days: workSettings.workDays,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (error) {
        console.error("Settings save error:", error);
        setDatabaseStatus("error");
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    session,
    language,
    workSettings,
    isLoaded,
    databaseStatus,
    supabase,
  ]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setLoginError("");
    setLoginLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

    if (error) {
      console.error(error);

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
    await supabase.auth.signOut();

    setActiveTab("calendar");
    setIsClientDetailsOpen(false);
    setIsAppointmentModalOpen(false);
    setIsClientModalOpen(false);
    setIsServiceModalOpen(false);
    setIsReminderModalOpen(false);
  }

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
    (_, index) =>
      workSettings.startHour + index
  );

  const calendarHeight =
    (workSettings.endHour -
      workSettings.startHour) *
    HOUR_HEIGHT;

  const monthDays =
    getMonthCalendarDays(visibleMonth);

  const selectedClientDetails =
    selectedClientDetailsId !== null
      ? clients.find(
          (client) =>
            client.id === selectedClientDetailsId
        )
      : undefined;

  const selectedClientAppointments =
    selectedClientDetailsId !== null
      ? appointments
          .filter(
            (appointment) =>
              appointment.clientId ===
              selectedClientDetailsId
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

  const filteredClients = [...clients]
    .filter((client) => {
      const search =
        clientSearch.trim().toLowerCase();

      if (!search) return true;

      return (
        client.name.toLowerCase().includes(search) ||
        client.phone.toLowerCase().includes(search) ||
        client.social.toLowerCase().includes(search)
      );
    })
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        getLocale(language)
      )
    );

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status === "completed"
    );

  const todayCompletedAppointments =
    completedAppointments.filter(
      (appointment) =>
        appointment.date === todayKey
    );

  const sevenDaysAgo = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6);
    return date;
  }, [today]);

  const sevenDaysAgoKey =
    formatDateKey(sevenDaysAgo);

  const weekCompletedAppointments =
    completedAppointments.filter(
      (appointment) =>
        appointment.date >= sevenDaysAgoKey &&
        appointment.date <= todayKey
    );

  const monthStartKey = formatDateKey(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    )
  );

  const monthEndKey = formatDateKey(
    new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    )
  );

  const currentMonthAppointments =
    appointments.filter(
      (appointment) =>
        appointment.date >= monthStartKey &&
        appointment.date <= monthEndKey
    );

  const currentMonthCompletedAppointments =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status === "completed"
    );

  const todayIncome =
    sumPrices(todayCompletedAppointments);

  const weekIncome =
    sumPrices(weekCompletedAppointments);

  const monthIncome =
    sumPrices(
      currentMonthCompletedAppointments
    );

  const averageCheck =
    currentMonthCompletedAppointments.length > 0
      ? Math.round(
          monthIncome /
            currentMonthCompletedAppointments.length
        )
      : 0;

  const monthScheduledCount =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status === "scheduled"
    ).length;

  const monthCancelledCount =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status === "cancelled"
    ).length;

  const monthNoShowCount =
    currentMonthAppointments.filter(
      (appointment) =>
        appointment.status === "no-show"
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
        const key =
          appointment.service || "Без услуги";

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
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return b.income - a.income;
  });

  const reminderClient =
    reminderClientId !== null
      ? clients.find(
          (client) =>
            client.id === reminderClientId
        )
      : undefined;

  function getStatusLabel(
    status: AppointmentStatus
  ) {
    if (status === "completed") {
      return t.completedStatus;
    }

    if (status === "cancelled") {
      return t.cancelledStatus;
    }

    if (status === "no-show") {
      return t.noShowStatus;
    }

    return t.scheduledStatus;
  }

  function changeDay(amount: number) {
    const newDate = new Date(selectedDate);

    newDate.setDate(
      newDate.getDate() + amount
    );

    setSelectedDate(newDate);

    setVisibleMonth(
      new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        1
      )
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
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      )
    );

    setCalendarView("day");
  }

  function getAppointmentsForDate(date: Date) {
    const dateKey = formatDateKey(date);

    return appointments.filter(
      (appointment) =>
        appointment.date === dateKey
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

  function openNewAppointment(
    prefilledTime = ""
  ) {
    resetAppointmentForm();

    setAppointmentDate(selectedDateKey);
    setAppointmentTime(prefilledTime);

    setIsAppointmentModalOpen(true);
  }

  function openNewAppointmentForClient(
    client: Client
  ) {
    resetAppointmentForm();

    setSelectedClientId(String(client.id));
    setAppointmentDate(selectedDateKey);

    setIsClientDetailsOpen(false);
    setActiveTab("calendar");
    setCalendarView("day");
    setIsAppointmentModalOpen(true);
  }

  function openEditAppointment(
    appointment: Appointment
  ) {
    setEditingAppointmentId(appointment.id);
    setAppointmentDate(appointment.date);
    setAppointmentTime(appointment.time);
    setAppointmentService(appointment.service);

    setAppointmentDuration(
      String(appointment.duration)
    );

    setAppointmentPrice(
      String(appointment.price ?? 0)
    );

    setAppointmentStatus(
      appointment.status ?? "scheduled"
    );

    if (appointment.serviceId) {
      setSelectedServiceId(
        String(appointment.serviceId)
      );
    } else {
      setSelectedServiceId("");
    }

    if (appointment.clientId) {
      setSelectedClientId(
        String(appointment.clientId)
      );

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
      if (appointment.date !== date) {
        return false;
      }

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

      const existingStart =
        timeToMinutes(appointment.time);

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

    const finalName =
      selectedClient?.name ||
      appointmentName.trim();

    const duration =
      Number(appointmentDuration);

    const price =
      Number(appointmentPrice || 0);

    const appointmentId =
      editingAppointmentId ?? Date.now();

    const newAppointment: Appointment = {
      id: appointmentId,
      date: appointmentDate,
      time: appointmentTime,

      clientId: selectedClient?.id,

      name: finalName,

      serviceId: selectedService?.id,

      service:
        selectedService?.name ||
        appointmentService.trim() ||
        (language === "uk"
          ? "Манікюр"
          : "Маникюр"),

      duration,
      price,
      status: appointmentStatus,
    };

    const { error } = await supabase
      .from("appointments")
      .upsert(
        {
          id: newAppointment.id,
          date: newAppointment.date,
          time: newAppointment.time,

          client_id:
            newAppointment.clientId ?? null,

          name: newAppointment.name,

          service_id:
            newAppointment.serviceId ?? null,

          service: newAppointment.service,
          duration: newAppointment.duration,
          price: newAppointment.price,
          status: newAppointment.status,
        },
        {
          onConflict: "id",
        }
      );

    if (error) {
      console.error(error);

      window.alert(t.databaseSaveError);
      setDatabaseStatus("error");
      return;
    }

    if (editingAppointmentId !== null) {
      setAppointments(
        appointments.map((appointment) =>
          appointment.id ===
          editingAppointmentId
            ? newAppointment
            : appointment
        )
      );
    } else {
      setAppointments([
        ...appointments,
        newAppointment,
      ]);
    }

    setDatabaseStatus("connected");
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

    const duration =
      Number(appointmentDuration);

    if (
      appointmentStatus !== "cancelled" &&
      appointmentStatus !== "no-show"
    ) {
      const conflict =
        findConflictingAppointment(
          appointmentDate,
          appointmentTime,
          duration,
          editingAppointmentId
        );

      if (conflict) {
        const conflictStart =
          timeToMinutes(conflict.time);

        const conflictEnd =
          conflictStart +
          conflict.duration;

        setAppointmentError(
          `${t.conflict}: ${conflict.name}, ${
            conflict.time
          }–${minutesToTime(conflictEnd)}.`
        );

        setHasConflict(true);
        return;
      }
    }

    await actuallySaveAppointment();
  }

  async function deleteAppointment(id: number) {
    if (
      !window.confirm(
        t.deleteAppointmentConfirm
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);

      window.alert(t.databaseDeleteError);
      setDatabaseStatus("error");
      return;
    }

    setAppointments(
      appointments.filter(
        (appointment) =>
          appointment.id !== id
      )
    );

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

  function openClientDetails(
    clientId: number
  ) {
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

    const { error } = await supabase
      .from("clients")
      .upsert(
        {
          id: newClient.id,
          name: newClient.name,
          phone: newClient.phone,
          social: newClient.social,
          note: newClient.note,
        },
        {
          onConflict: "id",
        }
      );

    if (error) {
      console.error(error);
      window.alert(t.databaseSaveError);
      return;
    }

    if (editingClientId !== null) {
      await supabase
        .from("appointments")
        .update({
          name: newClient.name,
        })
        .eq(
          "client_id",
          editingClientId
        );

      setClients(
        clients.map((client) =>
          client.id === editingClientId
            ? newClient
            : client
        )
      );

      setAppointments(
        appointments.map((appointment) =>
          appointment.clientId ===
          editingClientId
            ? {
                ...appointment,
                name: newClient.name,
              }
            : appointment
        )
      );
    } else {
      setClients([
        ...clients,
        newClient,
      ]);
    }

    setIsClientModalOpen(false);
    resetClientForm();
  }

  async function deleteClient(id: number) {
    if (
      !window.confirm(
        t.deleteClientConfirm
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      window.alert(t.databaseDeleteError);
      return;
    }

    setClients(
      clients.filter(
        (client) =>
          client.id !== id
      )
    );

    setAppointments(
      appointments.map((appointment) =>
        appointment.clientId === id
          ? {
              ...appointment,
              clientId: undefined,
            }
          : appointment
      )
    );

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

  function openEditService(
    service: Service
  ) {
    setEditingServiceId(service.id);
    setServiceName(service.name);
    setServiceDuration(
      String(service.duration)
    );
    setServicePrice(
      String(service.price)
    );

    setIsServiceModalOpen(true);
  }

  async function saveService() {
    if (!serviceName.trim()) return;

    const serviceId =
      editingServiceId ?? Date.now();

    const newService: Service = {
      id: serviceId,
      name: serviceName.trim(),
      duration: Number(serviceDuration),
      price: Number(servicePrice || 0),
    };

    const { error } = await supabase
      .from("services")
      .upsert(
        {
          id: newService.id,
          name: newService.name,
          duration: newService.duration,
          price: newService.price,
        },
        {
          onConflict: "id",
        }
      );

    if (error) {
      console.error(error);
      window.alert(t.databaseSaveError);
      return;
    }

    if (editingServiceId !== null) {
      setServices(
        services.map((service) =>
          service.id === editingServiceId
            ? newService
            : service
        )
      );
    } else {
      setServices([
        ...services,
        newService,
      ]);
    }

    setIsServiceModalOpen(false);
    resetServiceForm();
  }

  async function deleteService(id: number) {
    if (
      !window.confirm(
        t.deleteServiceConfirm
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      window.alert(t.databaseDeleteError);
      return;
    }

    setServices(
      services.filter(
        (service) =>
          service.id !== id
      )
    );

    setAppointments(
      appointments.map((appointment) =>
        appointment.serviceId === id
          ? {
              ...appointment,
              serviceId: undefined,
            }
          : appointment
      )
    );

    setIsServiceModalOpen(false);
  }

  function getClientAppointmentsCount(
    clientId: number
  ) {
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
          item.id ===
          appointment.clientId
      );

      if (client) return client;
    }

    return clients.find(
      (client) =>
        client.name
          .trim()
          .toLowerCase() ===
        appointment.name
          .trim()
          .toLowerCase()
    );
  }

  function handleCalendarClick(
    event: React.MouseEvent<HTMLDivElement>
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const y =
      event.clientY - rect.top;

    const clickedHour =
      workSettings.startHour +
      Math.floor(
        y / HOUR_HEIGHT
      );

    if (
      clickedHour <
        workSettings.startHour ||
      clickedHour >=
        workSettings.endHour
    ) {
      return;
    }

    openNewAppointment(
      `${String(clickedHour).padStart(
        2,
        "0"
      )}:00`
    );
  }

  function clearAppointmentWarning() {
    setAppointmentError("");
    setHasConflict(false);
  }

  function handleServiceSelection(
    serviceId: string
  ) {
    setSelectedServiceId(serviceId);
    clearAppointmentWarning();

    if (!serviceId) return;

    const service = services.find(
      (item) =>
        item.id === Number(serviceId)
    );

    if (!service) return;

    setAppointmentService(service.name);

    setAppointmentDuration(
      String(service.duration)
    );

    setAppointmentPrice(
      String(service.price)
    );
  }

  function toggleWorkDay(day: number) {
    if (
      workSettings.workDays.includes(
        day
      )
    ) {
      setWorkSettings({
        ...workSettings,

        workDays:
          workSettings.workDays.filter(
            (item) =>
              item !== day
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

  function openReminder(
    appointment: Appointment
  ) {
    const client =
      appointment.clientId !== undefined
        ? clients.find(
            (item) =>
              item.id ===
              appointment.clientId
          )
        : undefined;

    const name =
      client?.name ||
      appointment.name;

    setReminderText(
      `Привіт, ${name}! ` +
        `Нагадую про ваш запис ${formatUkrainianReminderDate(
          appointment.date
        )} о ${appointment.time}. ` +
        `Послуга: ${appointment.service}. ` +
        `Чекаю на вас ❤️`
    );

    setReminderClientId(
      client?.id ?? null
    );

    setReminderCopied(false);
    setIsReminderModalOpen(true);
  }

  async function copyReminder() {
    try {
      await navigator.clipboard.writeText(
        reminderText
      );

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

  /*
   * AUTH LOADING
   */

  if (!authChecked) {
    return (
      <main
        className="flex h-dvh items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url('/background.jpg')",
        }}
      >
        <div className="rounded-3xl bg-white/95 px-8 py-7 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />

          <p className="mt-4 font-semibold">
            Nails Calendar
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Проверка входа...
          </p>
        </div>
      </main>
    );
  }

  /*
   * LOGIN SCREEN
   */

  if (!session) {
    return (
      <main
        className="flex h-dvh items-center justify-center bg-cover bg-center px-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/background.jpg')",
        }}
      >
        <div className="w-full max-w-sm rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur-md">
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
            <div>
              <label className="mb-1 block text-sm text-neutral-500">
                Email
              </label>

              <input
                type="email"
                autoComplete="email"
                required
                value={loginEmail}
                onChange={(event) => {
                  setLoginEmail(
                    event.target.value
                  );

                  setLoginError("");
                }}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-500">
                Пароль
              </label>

              <input
  type="password"
  autoComplete="current-password"
  required
  value={loginPassword}
  onChange={(event) => {
    setLoginPassword(event.target.value);
    setLoginError("");
  }}
  placeholder="••••••••"
  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-black caret-black outline-none placeholder:text-neutral-400 focus:border-black"
/>
            </div>

            {loginError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-black px-4 py-4 font-medium text-white disabled:opacity-50"
            >
              {loginLoading
                ? "Вхід..."
                : "Увійти / Войти"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-neutral-400">
            Доступ только для владельца приложения
          </p>
        </div>
      </main>
    );
  }

  /*
   * DATABASE LOADING
   */

  if (!isLoaded) {
    return (
      <main
        className="flex h-dvh items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.25), rgba(255,255,255,0.25)), url('/background.jpg')",
        }}
      >
        <div className="rounded-2xl bg-white/90 px-6 py-5 text-center shadow-xl backdrop-blur">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />

          <p className="mt-3 text-sm font-medium">
            Supabase
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            {language === "uk"
              ? "Завантаження даних..."
              : "Загрузка данных..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="h-dvh overflow-hidden bg-cover bg-center text-neutral-900"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.25), rgba(255,255,255,0.25)), url('/background.jpg')",
      }}
    >
      <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-white/90 shadow-2xl backdrop-blur-[2px]">
        {activeTab === "calendar" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="z-20 shrink-0 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
              <div className="px-5 pb-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
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
                      {calendarView === "day"
                        ? `${t.records}: ${selectedDayAppointments.length}`
                        : `${t.totalRecords}: ${
                            appointments.filter(
                              (appointment) => {
                                const [year, month] =
                                  appointment.date
                                    .split("-")
                                    .map(Number);

                                return (
                                  year ===
                                    visibleMonth.getFullYear() &&
                                  month - 1 ===
                                    visibleMonth.getMonth()
                                );
                              }
                            ).length
                          }`}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      openNewAppointment()
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-2xl text-white"
                  >
                    +
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 rounded-xl bg-neutral-100 p-1">
                  <button
                    onClick={() =>
                      setCalendarView("day")
                    }
                    className={`rounded-lg px-3 py-2 text-sm ${
                      calendarView === "day"
                        ? "bg-white font-medium shadow-sm"
                        : "text-neutral-500"
                    }`}
                  >
                    {t.day}
                  </button>

                  <button
                    onClick={() => {
                      setVisibleMonth(
                        new Date(
                          selectedDate.getFullYear(),
                          selectedDate.getMonth(),
                          1
                        )
                      );

                      setCalendarView("month");
                    }}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      calendarView === "month"
                        ? "bg-white font-medium shadow-sm"
                        : "text-neutral-500"
                    }`}
                  >
                    {t.month}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[48px_1fr_48px] items-center border-t border-neutral-100 px-3 py-2">
                <button
                  onClick={() =>
                    calendarView === "day"
                      ? changeDay(-1)
                      : changeMonth(-1)
                  }
                  className="flex h-10 items-center justify-center rounded-xl text-2xl hover:bg-neutral-100"
                >
                  ‹
                </button>

                <button
                  onClick={goToToday}
                  className="mx-auto rounded-xl bg-neutral-100 px-4 py-2 text-sm font-medium"
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
                  className="flex h-10 items-center justify-center rounded-xl text-2xl hover:bg-neutral-100"
                >
                  ›
                </button>
              </div>
            </header>

            {calendarView === "day" && (
              <>
                {!selectedDateIsWorkDay && (
                  <div className="shrink-0 border-b border-orange-200 bg-orange-50 px-4 py-3">
                    <p className="text-sm font-medium text-orange-800">
                      {t.dayOff}
                    </p>

                    <p className="mt-1 text-xs text-orange-600">
                      {t.dayOffHint}
                    </p>
                  </div>
                )}

                <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <div
                    className="grid grid-cols-[70px_1fr]"
                    style={{
                      height: `${calendarHeight}px`,
                    }}
                  >
                    <div className="relative border-r border-neutral-200/70">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 w-full px-3 text-sm text-neutral-500"
                          style={{
                            top: `${
                              (hour -
                                workSettings.startHour) *
                              HOUR_HEIGHT
                            }px`,
                          }}
                        >
                          {String(hour).padStart(
                            2,
                            "0"
                          )}
                          :00
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
                          className="absolute left-0 right-0 border-t border-neutral-200/70"
                          style={{
                            top: `${
                              (hour -
                                workSettings.startHour) *
                              HOUR_HEIGHT
                            }px`,
                          }}
                        />
                      ))}

                      {selectedDayAppointments.map(
                        (appointment) => {
                          const client =
                            getClientForAppointment(
                              appointment
                            );

                          const top =
                            getAppointmentTop(
                              appointment.time,
                              workSettings.startHour
                            );

                          const height =
                            getAppointmentHeight(
                              appointment.duration
                            );

                          if (
                            top < 0 ||
                            top > calendarHeight
                          ) {
                            return null;
                          }

                          return (
                            <button
                              key={appointment.id}
                              onClick={(event) => {
                                event.stopPropagation();

                                openEditAppointment(
                                  appointment
                                );
                              }}
                              className={`absolute left-2 right-2 z-10 overflow-hidden rounded-2xl border p-3 text-left shadow-md backdrop-blur-sm ${getAppointmentCardClass(
                                appointment.status
                              )}`}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">
                                  {appointment.time}
                                </p>

                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(
                                    appointment.status
                                  )}`}
                                >
                                  {getStatusLabel(
                                    appointment.status
                                  )}
                                </span>
                              </div>

                              <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="truncate font-semibold">
                                  {appointment.name}
                                </p>

                                {client?.phone && (
                                  <span className="shrink-0 text-xs text-neutral-700">
                                    {client.phone}
                                  </span>
                                )}
                              </div>

                              {height >= 70 && (
                                <p className="mt-1 truncate text-sm text-neutral-600">
                                  {appointment.service}
                                </p>
                              )}

                              {height >= 90 && (
                                <div className="mt-1 flex justify-between text-xs text-neutral-500">
                                  <span>
                                    {appointment.duration}{" "}
                                    {t.minutes}
                                  </span>

                                  <span>
                                    {appointment.price} грн
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {calendarView === "month" && (
              <section className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="rounded-2xl border border-neutral-300 bg-white/85 p-3 shadow-sm">
                  <div className="grid grid-cols-7 gap-1 pb-2">
                    {WEEKDAYS.map((weekday) => (
                      <div
                        key={weekday.value}
                        className="py-2 text-center text-xs text-neutral-400"
                      >
                        {weekday[language]}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map((item) => {
                      const dateKey =
                        formatDateKey(item.date);

                      const dayAppointments =
                        getAppointmentsForDate(
                          item.date
                        );

                      const isToday =
                        dateKey === todayKey;

                      const isSelected =
                        dateKey ===
                        selectedDateKey;

                      const isWorkDay =
                        workSettings.workDays.includes(
                          item.date.getDay()
                        );

                      return (
                        <button
                          key={dateKey}
                          onClick={() =>
                            selectMonthDate(
                              item.date
                            )
                          }
                          className={`relative flex min-h-[64px] flex-col items-center rounded-xl px-1 py-2 ${
                            isSelected
                              ? "bg-black text-white"
                              : isToday
                              ? "border border-neutral-500 bg-neutral-200"
                              : !isWorkDay &&
                                item.isCurrentMonth
                              ? "bg-neutral-100 text-neutral-400"
                              : item.isCurrentMonth
                              ? "hover:bg-neutral-100"
                              : "text-neutral-300"
                          }`}
                        >
                          <span className="text-sm">
                            {item.date.getDate()}
                          </span>

                          {!isWorkDay &&
                            item.isCurrentMonth && (
                              <span className="mt-1 text-[9px] opacity-60">
                                {t.dayOffShort}
                              </span>
                            )}

                          {dayAppointments.length >
                            0 && (
                            <span
                              className={`mt-1 rounded-full px-1.5 text-[10px] ${
                                isSelected
                                  ? "bg-white text-black"
                                  : "bg-black text-white"
                              }`}
                            >
                              {dayAppointments.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {appointments
                    .filter((appointment) => {
                      const [year, month] =
                        appointment.date
                          .split("-")
                          .map(Number);

                      return (
                        year ===
                          visibleMonth.getFullYear() &&
                        month - 1 ===
                          visibleMonth.getMonth()
                      );
                    })
                    .sort((a, b) =>
                      a.date === b.date
                        ? a.time.localeCompare(
                            b.time
                          )
                        : a.date.localeCompare(
                            b.date
                          )
                    )
                    .map((appointment) => (
                      <button
                        key={appointment.id}
                        onClick={() => {
                          setSelectedDate(
                            new Date(
                              `${appointment.date}T12:00:00`
                            )
                          );

                          setCalendarView("day");
                        }}
                        className="w-full rounded-xl border border-neutral-300 bg-white/85 p-3 text-left"
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {formatFullDate(
                                appointment.date,
                                language
                              )}
                            </p>

                            <p className="mt-1 text-sm text-neutral-500">
                              {appointment.time} ·{" "}
                              {appointment.name}
                            </p>

                            <p className="mt-1 text-xs text-neutral-400">
                              {appointment.service}
                            </p>
                          </div>

                          <span
                            className={`h-fit rounded-full border px-2 py-1 text-[10px] ${getStatusBadgeClass(
                              appointment.status
                            )}`}
                          >
                            {getStatusLabel(
                              appointment.status
                            )}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === "clients" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 border-b border-neutral-200 bg-white/90 px-5 py-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-neutral-500">
                    {t.clientBase}
                  </p>

                  <h1 className="text-2xl font-semibold">
                    {t.clients}
                  </h1>

                  <p className="mt-1 text-xs text-neutral-400">
                    {t.total}: {clients.length}
                  </p>
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
                  setClientSearch(
                    event.target.value
                  )
                }
                placeholder={t.searchClient}
                className="mt-4 w-full rounded-xl border border-neutral-300 px-4 py-3"
              />
            </header>

            <section className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {clients.length === 0 && (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/80 p-8 text-center">
                  <p className="font-medium">
                    {t.noClients}
                  </p>

                  <p className="mt-2 text-sm text-neutral-500">
                    {t.addFirstClient}
                  </p>
                </div>
              )}

              {clients.length > 0 &&
                filteredClients.length ===
                  0 && (
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/80 p-8 text-center">
                    {t.nothingFound}
                  </div>
                )}

              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() =>
                    openClientDetails(client.id)
                  }
                  className="w-full rounded-2xl border border-neutral-400 bg-neutral-100/90 p-4 text-left shadow-md"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {client.name}
                      </h2>

                      {client.phone && (
                        <p className="mt-2 text-sm">
                          {client.phone}
                        </p>
                      )}

                      {client.social && (
                        <p className="mt-1 text-sm text-neutral-500">
                          {client.social}
                        </p>
                      )}
                    </div>

                    <span className="h-fit rounded-full bg-white px-3 py-1 text-xs">
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
            <header className="shrink-0 border-b border-neutral-200 bg-white/90 px-5 py-4">
              <p className="text-sm text-neutral-500">
                {t.financeRecords}
              </p>

              <h1 className="text-2xl font-semibold">
                {t.analytics}
              </h1>

              <p className="mt-1 text-xs text-neutral-400">
                {t.completedOnlyIncome}
              </p>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-white/85 p-4">
                  <p className="text-xs text-neutral-500">
                    {t.todayIncome}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {todayIncome} грн
                  </p>

                  <p className="mt-1 text-xs text-neutral-400">
                    {todayCompletedAppointments.length}{" "}
                    {t.completed}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white/85 p-4">
                  <p className="text-xs text-neutral-500">
                    {t.sevenDays}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {weekIncome} грн
                  </p>

                  <p className="mt-1 text-xs text-neutral-400">
                    {weekCompletedAppointments.length}{" "}
                    {t.completed}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-neutral-400 bg-neutral-100 p-5">
                <p className="text-sm text-neutral-500">
                  {t.currentMonthIncome}
                </p>

                <p className="mt-2 text-3xl font-semibold">
                  {monthIncome} грн
                </p>

                <p className="mt-2 text-sm text-neutral-500">
                  {
                    currentMonthCompletedAppointments.length
                  }{" "}
                  {t.completed}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/85 p-4">
                  <p className="text-xs text-neutral-500">
                    {t.averageCheck}
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {averageCheck} грн
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs text-blue-600">
                    {t.scheduled}
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {monthScheduledCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-xs text-red-600">
                    {t.cancelled}
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {monthCancelledCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-orange-50 p-4">
                  <p className="text-xs text-orange-600">
                    {t.noShow}
                  </p>

                  <p className="mt-2 text-xl font-semibold">
                    {monthNoShowCount}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-semibold">
                  {t.topServices}
                </h2>

                <div className="mt-3 space-y-2">
                  {serviceStats.length === 0 && (
                    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">
                      {t.noCompleted}
                    </div>
                  )}

                  {serviceStats.map(
                    (service, index) => (
                      <div
                        key={service.name}
                        className="rounded-2xl border bg-white/85 p-4"
                      >
                        <div className="flex justify-between">
                          <div>
                            <p className="text-xs text-neutral-400">
                              #{index + 1}
                            </p>

                            <p className="font-semibold">
                              {service.name}
                            </p>

                            <p className="mt-1 text-sm text-neutral-500">
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
              </div>
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 border-b border-neutral-200 bg-white/90 px-5 py-4">
              <p className="text-sm text-neutral-500">
                {t.app}
              </p>

              <h1 className="text-2xl font-semibold">
                {t.settings}
              </h1>
            </header>

            <section className="min-h-0 flex-1 overflow-y-auto p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {t.account}
                </h2>

                <div className="mt-3 rounded-2xl border border-neutral-300 bg-white/85 p-4">
                  <p className="text-xs text-neutral-500">
                    {t.signedInAs}
                  </p>

                  <p className="mt-1 break-all text-sm font-medium">
                    {session.user.email}
                  </p>

                  <button
                    onClick={handleLogout}
                    className="mt-4 w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
                  >
                    {t.logout}
                  </button>
                </div>
              </div>

              <div className="mt-7">
                <h2 className="text-lg font-semibold">
                  {t.database}
                </h2>

                <div
                  className={`mt-3 flex items-center gap-3 rounded-2xl border p-4 ${
                    databaseStatus === "connected"
                      ? "border-green-200 bg-green-50"
                      : databaseStatus === "error"
                      ? "border-red-200 bg-red-50"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${
                      databaseStatus === "connected"
                        ? "bg-green-500"
                        : databaseStatus === "error"
                        ? "bg-red-500"
                        : "bg-neutral-400"
                    }`}
                  />

                  <p className="text-sm font-medium">
                    {databaseStatus === "connected"
                      ? t.databaseConnected
                      : databaseStatus === "error"
                      ? t.databaseError
                      : t.databaseConnecting}
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <h2 className="text-lg font-semibold">
                  {t.language}
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {t.languageHint}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-300 bg-white/85 p-2">
                  <button
                    onClick={() =>
                      setLanguage("ru")
                    }
                    className={`rounded-xl px-4 py-3 text-sm font-medium ${
                      language === "ru"
                        ? "bg-black text-white"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    Русский
                  </button>

                  <button
                    onClick={() =>
                      setLanguage("uk")
                    }
                    className={`rounded-xl px-4 py-3 text-sm font-medium ${
                      language === "uk"
                        ? "bg-black text-white"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    Українська
                  </button>
                </div>
              </div>

              <div className="mt-7">
                <h2 className="text-lg font-semibold">
                  {t.workSchedule}
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  {t.workScheduleHint}
                </p>

                <div className="mt-4 rounded-2xl border border-neutral-300 bg-white/85 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-neutral-500">
                        {t.startDay}
                      </label>

                      <select
                        value={workSettings.startHour}
                        onChange={(event) => {
                          const hour = Number(
                            event.target.value
                          );

                          setWorkSettings({
                            ...workSettings,
                            startHour: hour,
                            endHour: Math.max(
                              hour + 1,
                              workSettings.endHour
                            ),
                          });
                        }}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-3"
                      >
                        {Array.from(
                          { length: 18 },
                          (_, index) =>
                            index + 6
                        ).map((hour) => (
                          <option
                            key={hour}
                            value={hour}
                          >
                            {String(
                              hour
                            ).padStart(
                              2,
                              "0"
                            )}
                            :00
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-neutral-500">
                        {t.endDay}
                      </label>

                      <select
                        value={workSettings.endHour}
                        onChange={(event) =>
                          setWorkSettings({
                            ...workSettings,
                            endHour: Number(
                              event.target.value
                            ),
                          })
                        }
                        className="w-full rounded-xl border border-neutral-300 px-3 py-3"
                      >
                        {Array.from(
                          { length: 18 },
                          (_, index) =>
                            index + 7
                        )
                          .filter(
                            (hour) =>
                              hour >
                              workSettings.startHour
                          )
                          .map((hour) => (
                            <option
                              key={hour}
                              value={hour}
                            >
                              {hour === 24
                                ? "24:00"
                                : `${String(
                                    hour
                                  ).padStart(
                                    2,
                                    "0"
                                  )}:00`}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs text-neutral-500">
                      {t.workDays}
                    </p>

                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {WEEKDAYS.map((day) => {
                        const active =
                          workSettings.workDays.includes(
                            day.value
                          );

                        return (
                          <button
                            key={day.value}
                            onClick={() =>
                              toggleWorkDay(
                                day.value
                              )
                            }
                            className={`rounded-xl py-3 text-xs font-medium ${
                              active
                                ? "bg-black text-white"
                                : "bg-neutral-100 text-neutral-400"
                            }`}
                          >
                            {day[language]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {t.services}
                    </h2>

                    <p className="mt-1 text-sm text-neutral-500">
                      {t.servicePriceDuration}
                    </p>
                  </div>

                  <button
                    onClick={openNewService}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-xl text-white"
                  >
                    +
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {services.length === 0 && (
                    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">
                      {t.addFirstService}
                    </div>
                  )}

                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-2xl border border-neutral-300 bg-white/85 p-4"
                    >
                      <p className="font-semibold">
                        {service.name}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {service.duration}{" "}
                        {t.minutes} ·{" "}
                        {service.price} грн
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() =>
                            openEditService(
                              service
                            )
                          }
                          className="rounded-lg border px-3 py-2 text-xs"
                        >
                          {t.edit}
                        </button>

                        <button
                          onClick={() =>
                            deleteService(
                              service.id
                            )
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        <nav className="z-40 grid shrink-0 grid-cols-4 border-t border-neutral-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <button
            onClick={() =>
              setActiveTab("calendar")
            }
            className={`px-1 py-4 text-xs ${
              activeTab === "calendar"
                ? "font-semibold text-neutral-900"
                : "text-neutral-400"
            }`}
          >
            {t.calendar}
          </button>

          <button
            onClick={() =>
              setActiveTab("clients")
            }
            className={`px-1 py-4 text-xs ${
              activeTab === "clients"
                ? "font-semibold text-neutral-900"
                : "text-neutral-400"
            }`}
          >
            {t.clients}
          </button>

          <button
            onClick={() =>
              setActiveTab("analytics")
            }
            className={`px-1 py-4 text-xs ${
              activeTab === "analytics"
                ? "font-semibold text-neutral-900"
                : "text-neutral-400"
            }`}
          >
            {t.analytics}
          </button>

          <button
            onClick={() =>
              setActiveTab("settings")
            }
            className={`px-1 py-4 text-xs ${
              activeTab === "settings"
                ? "font-semibold text-neutral-900"
                : "text-neutral-400"
            }`}
          >
            {t.settings}
          </button>
        </nav>

        {isAppointmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
            <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5">
              <div className="mb-5 flex justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {editingAppointmentId !== null
                      ? t.appointmentEdit
                      : t.appointmentNew}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    {t.appointmentSubtitle}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setIsAppointmentModalOpen(
                      false
                    )
                  }
                  className="text-sm text-neutral-500"
                >
                  {t.close}
                </button>
              </div>

              <div className="space-y-4">
                {clients.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm text-neutral-500">
                      {t.client}
                    </label>

                    <select
                      value={selectedClientId}
                      onChange={(event) => {
                        setSelectedClientId(
                          event.target.value
                        );

                        clearAppointmentWarning();

                        if (
                          event.target.value
                        ) {
                          setAppointmentName("");
                        }
                      }}
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    >
                      <option value="">
                        {t.manualName}
                      </option>

                      {[...clients]
                        .sort((a, b) =>
                          a.name.localeCompare(
                            b.name,
                            getLocale(
                              language
                            )
                          )
                        )
                        .map((client) => (
                          <option
                            key={client.id}
                            value={client.id}
                          >
                            {client.name}
                            {client.phone
                              ? ` — ${client.phone}`
                              : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {!selectedClientId && (
                  <div>
                    <label className="mb-1 block text-sm text-neutral-500">
                      {t.clientName}
                    </label>

                    <input
                      value={appointmentName}
                      onChange={(event) =>
                        setAppointmentName(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    />
                  </div>
                )}

                {services.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm text-neutral-500">
                      {t.service}
                    </label>

                    <select
                      value={selectedServiceId}
                      onChange={(event) =>
                        handleServiceSelection(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    >
                      <option value="">
                        {t.manualService}
                      </option>

                      {services.map((service) => (
                        <option
                          key={service.id}
                          value={service.id}
                        >
                          {service.name} —{" "}
                          {service.price} грн
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!selectedServiceId && (
                  <div>
                    <label className="mb-1 block text-sm text-neutral-500">
                      {t.serviceName}
                    </label>

                    <input
                      value={
                        appointmentService
                      }
                      onChange={(event) =>
                        setAppointmentService(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-neutral-500">
                      {t.date}
                    </label>

                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(event) =>
                        setAppointmentDate(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-neutral-300 px-3 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-neutral-500">
                      {t.time}
                    </label>

                    <input
                      type="time"
                      value={appointmentTime}
                      onChange={(event) =>
                        setAppointmentTime(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-neutral-300 px-3 py-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-neutral-500">
                    {t.duration}
                  </label>

                  <select
                    value={appointmentDuration}
                    onChange={(event) =>
                      setAppointmentDuration(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3"
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
                </div>

                <div>
                  <label className="mb-1 block text-sm text-neutral-500">
                    {t.price}
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={appointmentPrice}
                    onChange={(event) =>
                      setAppointmentPrice(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-neutral-500">
                    {t.status}
                  </label>

                  <select
                    value={appointmentStatus}
                    onChange={(event) =>
                      setAppointmentStatus(
                        event.target
                          .value as AppointmentStatus
                      )
                    }
                    className="w-full rounded-xl border border-neutral-300 px-4 py-3"
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
                </div>

                {appointmentError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {appointmentError}

                    {hasConflict && (
                      <button
                        onClick={
                          actuallySaveAppointment
                        }
                        className="mt-3 w-full rounded-xl bg-white px-4 py-3"
                      >
                        {t.forceSave}
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={saveAppointment}
                  className="w-full rounded-xl bg-black px-4 py-4 font-medium text-white"
                >
                  {editingAppointmentId !== null
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
                    className="w-full rounded-xl bg-red-50 px-4 py-4 text-red-600"
                  >
                    {t.deleteAppointment}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
            <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5">
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold">
                  {editingClientId !== null
                    ? t.editClient
                    : t.newClient}
                </h2>

                <button
                  onClick={() =>
                    setIsClientModalOpen(
                      false
                    )
                  }
                  className="text-sm text-neutral-500"
                >
                  {t.close}
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <input
                  value={clientName}
                  onChange={(event) =>
                    setClientName(
                      event.target.value
                    )
                  }
                  placeholder={t.name}
                  className="w-full rounded-xl border px-4 py-3"
                />

                <input
                  value={clientPhone}
                  onChange={(event) =>
                    setClientPhone(
                      event.target.value
                    )
                  }
                  placeholder={t.phone}
                  className="w-full rounded-xl border px-4 py-3"
                />

                <input
                  value={clientSocial}
                  onChange={(event) =>
                    setClientSocial(
                      event.target.value
                    )
                  }
                  placeholder="@username"
                  className="w-full rounded-xl border px-4 py-3"
                />

                <textarea
                  value={clientNote}
                  onChange={(event) =>
                    setClientNote(
                      event.target.value
                    )
                  }
                  placeholder={t.note}
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3"
                />

                <button
                  onClick={saveClient}
                  className="w-full rounded-xl bg-black px-4 py-4 text-white"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        )}

        {isClientDetailsOpen &&
          selectedClientDetails && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
              <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">
                      {t.clientCard}
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold">
                      {
                        selectedClientDetails.name
                      }
                    </h2>
                  </div>

                  <button
                    onClick={() =>
                      setIsClientDetailsOpen(
                        false
                      )
                    }
                    className="text-sm text-neutral-500"
                  >
                    {t.close}
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-neutral-300 bg-neutral-100 p-4">
                  <p className="font-medium">
                    {selectedClientDetails.phone ||
                      t.phoneMissing}
                  </p>

                  {selectedClientDetails.social && (
                    <p className="mt-2 text-sm text-neutral-500">
                      {
                        selectedClientDetails.social
                      }
                    </p>
                  )}

                  {selectedClientDetails.note && (
                    <p className="mt-3 rounded-xl bg-white p-3 text-sm">
                      {
                        selectedClientDetails.note
                      }
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {selectedClientDetails.phone && (
                      <a
                        href={getPhoneUrl(
                          selectedClientDetails.phone
                        )}
                        className="rounded-xl bg-black px-3 py-3 text-center text-sm font-medium text-white"
                      >
                        {t.call}
                      </a>
                    )}

                    {selectedClientDetails.social &&
                      (getSocialType(
                        selectedClientDetails.social
                      ) === "telegram" ||
                        getSocialType(
                          selectedClientDetails.social
                        ) === "unknown") && (
                        <button
                          onClick={() =>
                            openExternal(
                              getTelegramUrl(
                                selectedClientDetails.social
                              )
                            )
                          }
                          className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm font-medium"
                        >
                          {t.telegram}
                        </button>
                      )}

                    {selectedClientDetails.social &&
                      (getSocialType(
                        selectedClientDetails.social
                      ) === "instagram" ||
                        getSocialType(
                          selectedClientDetails.social
                        ) === "unknown") && (
                        <button
                          onClick={() =>
                            openExternal(
                              getInstagramUrl(
                                selectedClientDetails.social
                              )
                            )
                          }
                          className="rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm font-medium"
                        >
                          {t.instagram}
                        </button>
                      )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-neutral-100 p-4">
                    <p className="text-xs text-neutral-500">
                      {t.totalAppointments}
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                      {
                        selectedClientAppointments.length
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-neutral-100 p-4">
                    <p className="text-xs text-neutral-500">
                      {
                        t.futureAppointmentsCount
                      }
                    </p>

                    <p className="mt-1 text-2xl font-semibold">
                      {
                        futureClientAppointments.length
                      }
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    openNewAppointmentForClient(
                      selectedClientDetails
                    )
                  }
                  className="mt-4 w-full rounded-xl bg-black px-4 py-4 text-white"
                >
                  {t.bookClient}
                </button>

                <button
                  onClick={() =>
                    openEditClient(
                      selectedClientDetails
                    )
                  }
                  className="mt-3 w-full rounded-xl border px-4 py-3"
                >
                  {t.editClientButton}
                </button>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold">
                    {t.futureAppointments}
                  </h3>

                  <div className="mt-3 space-y-2">
                    {futureClientAppointments.length ===
                      0 && (
                      <p className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-500">
                        {
                          t.noFutureAppointments
                        }
                      </p>
                    )}

                    {futureClientAppointments.map(
                      (appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-xl border border-neutral-300 p-3"
                        >
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {formatFullDate(
                                  appointment.date,
                                  language
                                )}
                              </p>

                              <p className="mt-1 text-sm text-neutral-500">
                                {appointment.time} ·{" "}
                                {appointment.service}
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {appointment.price} грн
                              </p>
                            </div>

                            <span
                              className={`h-fit rounded-full border px-2 py-1 text-[10px] ${getStatusBadgeClass(
                                appointment.status
                              )}`}
                            >
                              {getStatusLabel(
                                appointment.status
                              )}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              openReminder(
                                appointment
                              )
                            }
                            className="mt-3 w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm font-medium"
                          >
                            {t.remind}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold">
                    {t.history}
                  </h3>

                  <div className="mt-3 space-y-2">
                    {pastClientAppointments.length ===
                      0 && (
                      <p className="rounded-xl bg-neutral-100 p-4 text-sm text-neutral-500">
                        {t.noHistory}
                      </p>
                    )}

                    {pastClientAppointments.map(
                      (appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-xl border border-neutral-300 p-3"
                        >
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {formatFullDate(
                                  appointment.date,
                                  language
                                )}
                              </p>

                              <p className="mt-1 text-sm text-neutral-500">
                                {appointment.service} ·{" "}
                                {appointment.price} грн
                              </p>
                            </div>

                            <span
                              className={`h-fit rounded-full border px-2 py-1 text-[10px] ${getStatusBadgeClass(
                                appointment.status
                              )}`}
                            >
                              {getStatusLabel(
                                appointment.status
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    deleteClient(
                      selectedClientDetails.id
                    )
                  }
                  className="mt-6 w-full rounded-xl bg-red-50 px-4 py-3 text-red-600"
                >
                  {t.deleteClient}
                </button>
              </div>
            </div>
          )}

        {isServiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
            <div className="w-full max-w-md rounded-t-3xl bg-white p-5">
              <div className="flex justify-between">
                <h2 className="text-xl font-semibold">
                  {editingServiceId !== null
                    ? t.editService
                    : t.newService}
                </h2>

                <button
                  onClick={() =>
                    setIsServiceModalOpen(
                      false
                    )
                  }
                  className="text-sm text-neutral-500"
                >
                  {t.close}
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <input
                  value={serviceName}
                  onChange={(event) =>
                    setServiceName(
                      event.target.value
                    )
                  }
                  placeholder={t.serviceName}
                  className="w-full rounded-xl border px-4 py-3"
                />

                <select
                  value={serviceDuration}
                  onChange={(event) =>
                    setServiceDuration(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border px-4 py-3"
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
                  min="0"
                  value={servicePrice}
                  onChange={(event) =>
                    setServicePrice(
                      event.target.value
                    )
                  }
                  placeholder={t.servicePrice}
                  className="w-full rounded-xl border px-4 py-3"
                />

                <button
                  onClick={saveService}
                  className="w-full rounded-xl bg-black px-4 py-4 text-white"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </div>
        )}

        {isReminderModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <div className="w-full max-w-md rounded-t-3xl bg-white p-5">
              <div className="flex justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {t.reminder}
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    {t.reminderHint}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setIsReminderModalOpen(
                      false
                    )
                  }
                  className="text-sm text-neutral-500"
                >
                  {t.close}
                </button>
              </div>

              <textarea
                value={reminderText}
                onChange={(event) => {
                  setReminderText(
                    event.target.value
                  );

                  setReminderCopied(false);
                }}
                rows={7}
                className="mt-5 w-full resize-none rounded-2xl border border-neutral-300 bg-neutral-50 p-4"
              />

              <button
                onClick={copyReminder}
                className="mt-3 w-full rounded-xl bg-black px-4 py-4 font-medium text-white"
              >
                {reminderCopied
                  ? t.copied
                  : t.copyText}
              </button>

              {reminderClient?.social && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      openExternal(
                        getTelegramUrl(
                          reminderClient.social
                        )
                      )
                    }
                    className="rounded-xl border border-neutral-300 px-3 py-3 text-sm font-medium"
                  >
                    {t.openTelegram}
                  </button>

                  <button
                    onClick={() =>
                      openExternal(
                        getInstagramUrl(
                          reminderClient.social
                        )
                      )
                    }
                    className="rounded-xl border border-neutral-300 px-3 py-3 text-sm font-medium"
                  >
                    {t.openInstagram}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}