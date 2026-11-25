import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex min-h-app items-center justify-center bg-[var(--fondo)] px-6">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo-3d.png"
          alt=""
          width={534}
          height={554}
          priority
          className="logo-carga h-auto w-40 sm:w-48"
        />
      </div>
    </main>
  );
}
