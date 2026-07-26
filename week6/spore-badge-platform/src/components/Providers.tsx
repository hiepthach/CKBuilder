"use client";
import React from "react";
import { Provider } from "@ckb-ccc/connector-react";
import * as ccc from "@ckb-ccc/core";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider defaultClient={new ccc.ClientPublicTestnet()}>
      {children}
    </Provider>
  );
}
