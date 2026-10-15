"use client";

import DeliveryMap from "@/components/DeliveryMap";

export default function TestMapPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Delivery Map Test</h1>
        <DeliveryMap />
      </div>
    </main>
  );
}
