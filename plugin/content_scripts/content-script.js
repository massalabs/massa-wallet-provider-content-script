const WALLET_PROVIDER_NAME = "SPACE_X";
(
  async function()
  {
    //Make sure script is loaded once
    if (window.hasRun)
        return;
    window.hasRun = true;
    
    let IS_CHROME = /Chrome/.test(navigator.userAgent);
    let mybrowser = IS_CHROME ? chrome : browser;


    // ==================== EXTENSION LOGIC =====================
    class WalletContentScriptProvider extends window.injected.ContentScriptProvider {
        // own members and functionalities for convenience
        constructor(providerName) {
            super(providerName);
        }

        async sign(payload) {
            return {
                pubKey: '0x0000',
                signature: Uint8Array.from([1, 2, 3]),
            }
        }
        async balance(payload) {
            return new Promise((resolve, reject) => {
                mybrowser.runtime.sendMessage({action: "getBalance", params: payload}, (response) => {
                    console.log("Got a response from background.js", response);
                    return resolve(response)
                });
            })
        }
        async deleteAccount(payload) {
            return {
                response: window.injected.EAccountDeletionResponse.OK,
            }
        }
        async importAccount(payload) {
            return {
                response: window.injected.EAccountImportResponse.OK,
                message: 'Import was fine',
            }
        }
        async listAccounts(payload) {
            return [{ name: 'my account', address: '0x0' }];
        }
    }

    // ==================== REGISTRATION =====================
    const isProviderRegistered = await window.injected.ContentScriptProvider.registerAsMassaWalletProvider(WALLET_PROVIDER_NAME);
    console.log("[CONTENT SCRIPT] Is provider registered ", isProviderRegistered);

    // create an instance of the extension for communication
    const walletExtension = new WalletContentScriptProvider(WALLET_PROVIDER_NAME);

  })();
  