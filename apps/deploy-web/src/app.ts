import {
  generateEs256BootstrapKey,
  generateKs256BootstrapKey,
  type BootstrapAlg,
  type ImutableBytecode,
} from "@univocity-tools/deploy-core";
import {
  getDefaultDeployChain,
  getSupportedDeployChain,
  SUPPORTED_DEPLOY_CHAINS,
} from "./lib/supported-deploy-chains.js";
import {
  buildDeploymentTxData,
  deployImutableContract,
  downloadGenesisJson,
  readWalletChainId,
  type DeployResult,
} from "./lib/deploy.js";
import { ensureWalletChain } from "./lib/wallet-chain.js";
import { getDefaultReleaseTag, getPrivyAppId, isE2ePrivyMock } from "./env.js";
import { fetchVerifiedManifest, verifyManifestFiles } from "./lib/manifest.js";
import { bootstrapAckRequired } from "./lib/bootstrap-guards.js";
import {
  getInjectedProvider,
  getPrivyEthereumProvider,
  getPrivyWalletAddress,
  loginWithPrivyEmail,
  logoutPrivy,
  requestInjectedAccounts,
  type EthereumProvider,
} from "./lib/privy.js";

type WalletMode = "privy" | "injected";

type AppState = {
  walletMode: WalletMode;
  walletAddress: string | null;
  releaseTag: string;
  manifestLoaded: boolean;
  manifestError: string | null;
  artifact: ImutableBytecode | null;
  bootstrapAlg: BootstrapAlg;
  ks256Signer: string;
  ks256PrivateKey: string | null;
  es256Pem: string;
  bootstrapBackedUp: boolean;
  chainId: number;
  rpcUrl: string;
  walletChainId: number | null;
  deployError: string | null;
  deployResult: DeployResult | null;
  busy: boolean;
};

const state: AppState = {
  walletMode: "privy",
  walletAddress: null,
  releaseTag: getDefaultReleaseTag(),
  manifestLoaded: false,
  manifestError: null,
  artifact: null,
  bootstrapAlg: "ks256",
  ks256Signer: "",
  ks256PrivateKey: null,
  es256Pem: "",
  bootstrapBackedUp: false,
  chainId: getDefaultDeployChain().chainId,
  rpcUrl: getDefaultDeployChain().rpcUrl,
  walletChainId: null,
  deployError: null,
  deployResult: null,
  busy: false,
};

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <main>
      <h1>Univocity deploy</h1>
      <p class="lead">Step 1 — deploy ImutableUnivocity (EOA). Save genesis JSON for onboard (Step 2).</p>
      <section id="wallet-section"></section>
      <section id="manifest-section"></section>
      <section id="bootstrap-section"></section>
      <section id="deploy-section"></section>
      <section id="result-section"></section>
    </main>
  `;
  render();
}

function el(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function render(): void {
  renderWallet();
  renderManifest();
  renderBootstrap();
  renderDeploy();
  renderResult();
}

function renderWallet(): void {
  const privyConfigured = Boolean(getPrivyAppId()) || isE2ePrivyMock();
  const walletChainLine =
    state.walletChainId !== null
      ? `<p class="hint">Wallet network: chainId ${state.walletChainId}${
          state.walletChainId === state.chainId
            ? " (matches deploy target)"
            : " — will switch on deploy"
        }</p>`
      : "";
  const section = el("wallet-section");
  section.innerHTML = `
    <h2>1. Connect wallet</h2>
    <div class="wallet-tabs">
      <button type="button" data-mode="privy" class="${state.walletMode === "privy" ? "active" : ""}" ${privyConfigured ? "" : "disabled"}>Privy</button>
      <button type="button" data-mode="injected" class="${state.walletMode === "injected" ? "active" : ""}">Injected (MetaMask)</button>
    </div>
    ${privyConfigured ? "" : '<p class="hint">Privy not configured — use injected wallet or set TESTING_PRIVY_APP_ID.</p>'}
    <div class="row">
      ${
        state.walletAddress
          ? `<span class="ok">Connected: ${state.walletAddress}</span>
             <button type="button" class="secondary" id="disconnect-btn">Disconnect</button>`
          : `<button type="button" id="connect-btn">Connect</button>`
      }
    </div>
    ${walletChainLine}
  `;
  section.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.walletMode = (btn as HTMLElement).dataset.mode as WalletMode;
      state.walletAddress = null;
      render();
    });
  });
  section.querySelector("#connect-btn")?.addEventListener("click", () => {
    void connectWallet();
  });
  section.querySelector("#disconnect-btn")?.addEventListener("click", () => {
    void disconnectWallet();
  });
}

function renderManifest(): void {
  const section = el("manifest-section");
  section.innerHTML = `
    <h2>2. Verify release manifest</h2>
    <p class="hint">Fetches deploy-manifest via this site's API proxy (GitHub release CDN blocks direct browser fetch) or drag-drop both files offline.</p>
    <label for="release-tag">Release tag</label>
    <input id="release-tag" value="${state.releaseTag}" />
    <div class="row">
      <button type="button" id="fetch-manifest-btn" ${state.busy ? "disabled" : ""}>Fetch & verify</button>
    </div>
    <div class="drop-zone" id="drop-zone">Drop manifest.json + .sha256 sidecar here</div>
    <input type="file" id="manifest-file" accept=".json,application/json" hidden />
    <input type="file" id="sidecar-file" accept=".sha256,text/plain" hidden />
    ${
      state.manifestLoaded
        ? `<p class="ok">Manifest verified for ${state.releaseTag}</p>`
        : ""
    }
    ${state.manifestError ? `<p class="error">${state.manifestError}</p>` : ""}
  `;
  section.querySelector("#release-tag")?.addEventListener("change", (e) => {
    state.releaseTag = (e.target as HTMLInputElement).value.trim();
  });
  section
    .querySelector("#fetch-manifest-btn")
    ?.addEventListener("click", () => {
      void loadManifestFromRelease();
    });
  setupDropZone(section.querySelector("#drop-zone") as HTMLElement);
}

function setupDropZone(zone: HTMLElement): void {
  let manifestFile: File | null = null;
  let sidecarFile: File | null = null;

  const tryVerify = async (): Promise<void> => {
    if (!manifestFile || !sidecarFile) {
      return;
    }
    state.busy = true;
    state.manifestError = null;
    render();
    try {
      const verified = await verifyManifestFiles(
        manifestFile,
        sidecarFile,
        state.releaseTag || undefined,
      );
      state.artifact = verified.artifact;
      state.releaseTag = verified.releaseTag;
      state.manifestLoaded = true;
    } catch (error) {
      state.manifestError = (error as Error).message;
      state.manifestLoaded = false;
      state.artifact = null;
    } finally {
      state.busy = false;
      render();
    }
  };

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const files = [...(e.dataTransfer?.files ?? [])];
    for (const file of files) {
      if (file.name.endsWith(".sha256")) {
        sidecarFile = file;
      } else if (file.name.endsWith(".json")) {
        manifestFile = file;
      }
    }
    void tryVerify();
  });
}

function renderBootstrap(): void {
  const section = el("bootstrap-section");
  const ackRequired = bootstrapAckRequired({
    bootstrapAlg: state.bootstrapAlg,
    es256Pem: state.es256Pem,
    ks256PrivateKey: state.ks256PrivateKey,
  });
  section.innerHTML = `
    <h2>3. Bootstrap key (genesis-critical)</h2>
    <p class="hint">The bootstrap key is baked into genesis and is separate from your deploy wallet. Store it before deploying.</p>
    <label for="bootstrap-alg">Algorithm</label>
    <select id="bootstrap-alg">
      <option value="ks256" ${state.bootstrapAlg === "ks256" ? "selected" : ""}>KS256 (EOA signer)</option>
      <option value="es256" ${state.bootstrapAlg === "es256" ? "selected" : ""}>ES256 (P-256 PEM)</option>
    </select>
    <div id="bootstrap-fields"></div>
    <div class="row">
      <button type="button" id="generate-bootstrap-btn">Generate ephemeral key</button>
    </div>
    ${
      ackRequired
        ? `<div class="warning">
            <p><strong>Save bootstrap material before deploy.</strong> Loss is unrecoverable after the contract is created.</p>
            <label class="ack">
              <input type="checkbox" id="bootstrap-acked" ${state.bootstrapBackedUp ? "checked" : ""} />
              I have stored the bootstrap key material safely
            </label>
          </div>`
        : ""
    }
  `;
  const fields = section.querySelector("#bootstrap-fields")!;
  if (state.bootstrapAlg === "ks256") {
    fields.innerHTML = `
      <label for="ks256-signer">KS256 signer address</label>
      <input id="ks256-signer" value="${state.ks256Signer}" placeholder="0x…" />
      ${
        state.ks256PrivateKey
          ? `<label for="ks256-private-key">Generated private key (save now)</label>
             <textarea id="ks256-private-key" rows="2" readonly>${state.ks256PrivateKey}</textarea>`
          : ""
      }
    `;
    fields.querySelector("#ks256-signer")?.addEventListener("input", (e) => {
      state.ks256Signer = (e.target as HTMLInputElement).value.trim();
      state.ks256PrivateKey = null;
      state.bootstrapBackedUp = false;
    });
  } else {
    fields.innerHTML = `
      <label for="es256-pem">ES256 PEM (private or public)</label>
      <textarea id="es256-pem" rows="6" placeholder="-----BEGIN PRIVATE KEY-----">${state.es256Pem}</textarea>
    `;
    fields.querySelector("#es256-pem")?.addEventListener("input", (e) => {
      state.es256Pem = (e.target as HTMLTextAreaElement).value;
      state.bootstrapBackedUp = false;
    });
  }
  section.querySelector("#bootstrap-alg")?.addEventListener("change", (e) => {
    state.bootstrapAlg = (e.target as HTMLSelectElement).value as BootstrapAlg;
    state.ks256PrivateKey = null;
    state.bootstrapBackedUp = false;
    renderBootstrap();
  });
  section
    .querySelector("#generate-bootstrap-btn")
    ?.addEventListener("click", () => {
      void generateBootstrap();
    });
  section
    .querySelector("#bootstrap-acked")
    ?.addEventListener("change", (e) => {
      state.bootstrapBackedUp = (e.target as HTMLInputElement).checked;
      renderDeploy();
    });
}

function renderDeploy(): void {
  const section = el("deploy-section");
  const ackRequired = bootstrapAckRequired({
    bootstrapAlg: state.bootstrapAlg,
    es256Pem: state.es256Pem,
    ks256PrivateKey: state.ks256PrivateKey,
  });
  const canDeploy =
    state.walletAddress &&
    state.manifestLoaded &&
    state.artifact &&
    !state.busy &&
    (!ackRequired || state.bootstrapBackedUp);
  const chainOptions = SUPPORTED_DEPLOY_CHAINS.map(
    (chain) =>
      `<option value="${chain.chainId}" ${state.chainId === chain.chainId ? "selected" : ""}>${chain.name} (${chain.chainId})</option>`,
  ).join("");
  section.innerHTML = `
    <h2>4. Deploy on chain</h2>
    <label for="chain-id">Network</label>
    <select id="chain-id">${chainOptions}</select>
    <label for="rpc-url">RPC URL (for receipt polling)</label>
    <input id="rpc-url" value="${state.rpcUrl}" />
    <div class="row">
      <button type="button" id="deploy-btn" ${canDeploy ? "" : "disabled"}>Deploy ImutableUnivocity</button>
    </div>
    ${state.deployError ? `<p class="error">${state.deployError}</p>` : ""}
  `;
  section.querySelector("#chain-id")?.addEventListener("change", (e) => {
    const chainId = Number((e.target as HTMLSelectElement).value);
    const chain = getSupportedDeployChain(chainId);
    if (!chain) {
      return;
    }
    state.chainId = chain.chainId;
    state.rpcUrl = chain.rpcUrl;
    renderDeploy();
  });
  section.querySelector("#rpc-url")?.addEventListener("input", (e) => {
    state.rpcUrl = (e.target as HTMLInputElement).value.trim();
  });
  section.querySelector("#deploy-btn")?.addEventListener("click", () => {
    void runDeploy();
  });
}

function renderResult(): void {
  const section = el("result-section");
  if (!state.deployResult) {
    section.innerHTML = "";
    return;
  }
  const { genesis } = state.deployResult;
  section.innerHTML = `
    <h2>5. Genesis binding</h2>
    <p class="ok">Deployed at ${genesis.univocityAddr}</p>
    <pre>${JSON.stringify(genesis, null, 2)}</pre>
    <button type="button" id="download-genesis-btn">Download genesis JSON</button>
    <p class="hint">Use this in <a href="https://github.com/forestrie/mandate/blob/main/FORKING.md" target="_blank" rel="noopener">FORKING Step 2</a> (onboard request).</p>
  `;
  section
    .querySelector("#download-genesis-btn")
    ?.addEventListener("click", () => {
      downloadGenesisJson(genesis);
    });
}

async function syncWalletChain(provider: EthereumProvider): Promise<void> {
  await ensureWalletChain(provider, state.chainId);
  state.walletChainId = await readWalletChainId(provider);
}

async function connectWallet(): Promise<void> {
  state.busy = true;
  render();
  try {
    if (state.walletMode === "privy") {
      let email: string | undefined;
      if (isE2ePrivyMock()) {
        email = "e2e@test.local";
      } else {
        email = window.prompt("Email for Privy login")?.trim();
      }
      if (!email?.trim()) {
        throw new Error("Email required for Privy login");
      }
      await loginWithPrivyEmail(email.trim());
      state.walletAddress = await getPrivyWalletAddress();
      const provider = await getPrivyEthereumProvider();
      if (provider) {
        await syncWalletChain(provider);
      }
    } else {
      const accounts = await requestInjectedAccounts();
      state.walletAddress = accounts[0] ?? null;
      const provider = getInjectedProvider();
      if (provider) {
        await syncWalletChain(provider);
      }
    }
  } catch (error) {
    state.deployError = (error as Error).message;
  } finally {
    state.busy = false;
    render();
  }
}

async function disconnectWallet(): Promise<void> {
  if (state.walletMode === "privy") {
    await logoutPrivy();
  }
  state.walletAddress = null;
  state.walletChainId = null;
  render();
}

async function loadManifestFromRelease(): Promise<void> {
  state.busy = true;
  state.manifestError = null;
  state.manifestLoaded = false;
  state.artifact = null;
  render();
  try {
    const tag =
      (
        document.getElementById("release-tag") as HTMLInputElement
      )?.value.trim() || state.releaseTag;
    state.releaseTag = tag;
    const verified = await fetchVerifiedManifest(tag);
    state.artifact = verified.artifact;
    state.manifestLoaded = true;
  } catch (error) {
    state.manifestError = (error as Error).message;
  } finally {
    state.busy = false;
    render();
  }
}

async function generateBootstrap(): Promise<void> {
  if (state.bootstrapAlg === "ks256") {
    const { address, privateKey } = generateKs256BootstrapKey();
    state.ks256Signer = address;
    state.ks256PrivateKey = privateKey;
  } else {
    const { pem } = await generateEs256BootstrapKey();
    state.es256Pem = pem;
    state.ks256PrivateKey = null;
  }
  state.bootstrapBackedUp = false;
  renderBootstrap();
  renderDeploy();
}

async function runDeploy(): Promise<void> {
  if (!state.artifact || !state.walletAddress) {
    return;
  }
  state.busy = true;
  state.deployError = null;
  render();
  try {
    const provider =
      state.walletMode === "privy"
        ? await getPrivyEthereumProvider()
        : getInjectedProvider();
    if (!provider) {
      throw new Error("wallet provider unavailable");
    }
    const bootstrap =
      state.bootstrapAlg === "ks256"
        ? {
            alg: "ks256" as const,
            signer: state.ks256Signer || state.walletAddress,
          }
        : { alg: "es256" as const, pem: state.es256Pem };
    state.deployResult = await deployImutableContract({
      provider,
      chainId: state.chainId,
      rpcUrl: state.rpcUrl,
      artifact: state.artifact,
      bootstrap,
    });
  } catch (error) {
    state.deployError = (error as Error).message;
  } finally {
    state.busy = false;
    render();
  }
}

export {
  buildDeploymentTxData,
  bootstrapAckRequired,
  state as appStateForTests,
};
