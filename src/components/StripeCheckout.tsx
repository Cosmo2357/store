"use client";

import { useState, useTransition, useRef } from "react";
import { purchase } from "@/actions/plugin";
import type { Plugin } from "@/actions/plugin";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MdLock, MdCreditCard, MdCheckCircle, MdPayment } from "react-icons/md";

/* ------------------------------------------------------------------ */
/* Utility: format card number as "XXXX XXXX XXXX XXXX"               */
/* ------------------------------------------------------------------ */
function fmtCard(raw: string) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}
function fmtExpiry(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + " / " + d.slice(2) : d;
}

/* ------------------------------------------------------------------ */
/* Field styles                                                        */
/* ------------------------------------------------------------------ */
const fieldCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/40 focus:border-[#635BFF] transition";

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
export function StripeCheckout({ plugin }: { plugin: Plugin }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"form" | "processing" | "success">("form");
  const [cardNum, setCardNum] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12 / 28");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("John Doe");
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setPhase("form");
    setCardNum("4242 4242 4242 4242");
    setExpiry("12 / 28");
    setCvc("123");
    setName("John Doe");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      if (timerRef.current) clearTimeout(timerRef.current);
      reset();
    }
    setOpen(v);
  };

  const handlePay = () => {
    setPhase("processing");
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        await purchase(plugin.id);
        setPhase("success");
        timerRef.current = setTimeout(() => {
          setOpen(false);
          reset();
        }, 1800);
      });
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full">Subscribe</Button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden p-0">
        <DialogTitle>Subscribe to {plugin.label}</DialogTitle>
        {/* ── Sutoraipe header ── */}
        <div className="bg-[#635BFF] px-6 pt-8 pb-6 text-white">
          <div className="flex items-center gap-2 mb-5">
            <MdPayment className="text-2xl" />
            <span className="text-sm font-medium opacity-80">powered by Sutoraipe</span>
          </div>
          <p className="text-sm opacity-70 mb-1">Subscribe to</p>
          <p className="text-xl font-bold">{plugin.label}</p>
          <p className="text-3xl font-bold mt-1">
            {plugin.price}
            <span className="text-base font-normal opacity-70 ml-1">/ month</span>
          </p>
        </div>

        {/* ── Body ── */}
        <div className="bg-white px-6 py-6 space-y-4">
          {phase === "success" ? (
            /* Success screen */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <MdCheckCircle className="text-5xl text-green-500" />
              <p className="text-lg font-semibold text-gray-800">Payment successful!</p>
              <p className="text-sm text-gray-500">
                {plugin.label} has been added to your account.
              </p>
            </div>
          ) : (
            <>
              {/* Card number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Card number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNum}
                    onChange={(e) => setCardNum(fmtCard(e.target.value))}
                    maxLength={19}
                    className={fieldCls + " pr-10"}
                    disabled={phase === "processing"}
                  />
                  <MdCreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                </div>
              </div>

              {/* Expiry + CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Expiry
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={(e) => setExpiry(fmtExpiry(e.target.value))}
                    maxLength={7}
                    className={fieldCls}
                    disabled={phase === "processing"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    className={fieldCls}
                    disabled={phase === "processing"}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Name on card
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldCls}
                  disabled={phase === "processing"}
                />
              </div>

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={phase === "processing"}
                className="w-full rounded-lg bg-[#635BFF] py-3 text-sm font-semibold text-white transition hover:bg-[#5248e0] active:bg-[#4740cc] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {phase === "processing" ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    <MdLock className="text-base" />
                    Pay {plugin.price}
                  </>
                )}
              </button>
            </>
          )}

          {/* Sutoraipe footer */}
          <div className="flex items-center justify-center gap-1 pt-1 text-xs text-gray-400">
            <MdLock className="text-sm" />
            <span>Powered by</span>
            <MdPayment className="text-base text-[#635BFF]" />
            <span className="text-[#635BFF] font-medium">Sutoraipe</span>
            <span>·</span>
            <span>Terms</span>
            <span>·</span>
            <span>Privacy</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
