"use client";

/**
 * @fileoverview CCC SDK Provider wrapper for the xUDT Token Manager dApp.
 * Wraps the application with CCC Provider connected to CKB Public Testnet.
 * Reference: https://docs.ckbccc.com/en/docs/guides/connect-wallets
 */

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
