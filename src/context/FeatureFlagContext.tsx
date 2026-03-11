"use client";

import React, { createContext, useContext } from "react";
import type { Plugin } from "@/actions/plugin";

const FeatureFlagContext = createContext<Plugin[]>([]);

export function FeatureFlagProvider({
  plugins,
  children,
}: {
  plugins: Plugin[];
  children: React.ReactNode;
}) {
  return (
    <FeatureFlagContext.Provider value={plugins}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): Plugin[] {
  return useContext(FeatureFlagContext);
}
