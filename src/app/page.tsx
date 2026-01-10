import CaptureInput from "@/components/CaptureInput";

export default function Home() {
  return (
    <main className="p-6 bg-brandBlueLight min-h-screen">
      <h1 className="text-2xl font-bold text-brandText">
        helpem — organize your life
      </h1>

      <div className="mt-6 max-w-xl">
        <CaptureInput />
      </div>
    </main>
  );
}
