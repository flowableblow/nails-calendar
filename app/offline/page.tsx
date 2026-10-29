"use client";

export default function OfflinePage() {
  return (
    <main
      className="flex h-dvh items-center justify-center bg-cover bg-center px-6"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,235,243,0.72), rgba(255,235,243,0.72)), url('/publicbg-man.png')",
      }}
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/40 bg-rose-50/80 p-7 text-center shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-3xl text-white">
          💅
        </div>

        <h1 className="mt-5 text-2xl font-semibold">
          Немає інтернету
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Не вдалося підключитися до сервера.
          Перевірте інтернет-з&apos;єднання та спробуйте ще раз.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full rounded-xl bg-black px-4 py-4 font-medium text-white"
        >
          Спробувати ще раз
        </button>

        <p className="mt-4 text-xs text-neutral-400">
          Nails
        </p>
      </div>
    </main>
  );
}