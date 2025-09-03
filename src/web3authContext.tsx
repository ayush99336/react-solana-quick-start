// IMP START - Quick Start
import { WEB3AUTH_NETWORK } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";
// IMP END - Quick Start

// IMP START - Dashboard Registration
const clientId = "BDqfORSmhrjMkIb7t2nDdnWlOdZ545IQczAbzPQDOthXH0B-j8eCs7J4QHNS-HIrvntVSJoJjWefpM6WTVC2ZsY"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

// IMP START - Instantiate SDK
const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  }
};
// IMP END - Instantiate SDK

export default web3AuthContextConfig;
