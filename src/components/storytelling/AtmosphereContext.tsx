"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { StoryAtmosphere } from "@/stories/schemas/manifest";
import type { AtmosphereRole } from "@/stories/schemas/atmosphereAllowlist";

type AtmosphereContextValue = {
  atmosphere: StoryAtmosphere | null;
  hasRole: (role: AtmosphereRole) => boolean;
};

const AtmosphereContext = createContext<AtmosphereContextValue>({
  atmosphere: null,
  hasRole: () => false,
});

export function AtmosphereProvider({
  atmosphere,
  children,
}: {
  atmosphere?: StoryAtmosphere | null;
  children: ReactNode;
}) {
  const hasRole = (role: AtmosphereRole) => {
    if (!atmosphere) return false;
    return atmosphere.roles.includes(role);
  };

  return (
    <AtmosphereContext.Provider
      value={{ atmosphere: atmosphere ?? null, hasRole }}
    >
      {children}
    </AtmosphereContext.Provider>
  );
}

export function useStoryAtmosphere() {
  return useContext(AtmosphereContext);
}
