import { AvailableCommands } from './Commands';
import {
  IAccountBalanceRequest,
  IAccountBalanceResponse,
  IAccountSignRequest,
  EAccountDeletionResponse,
  IAccountSignResponse,
  IAccountDeletionRequest,
  IAccountDeletionResponse,
  IAccountImportRequest,
  IAccountImportResponse,
  EAccountImportResponse,
} from '../operations';
import {
  ICustomEventMessageRequest,
  IRegisterEvent,
  ICustomEventMessageResponse,
  IAccount,
} from '../interfaces';

const MASSA_WINDOW_OBJECT_PRAEFIX = 'massaWalletProvider';

type CallbackFunction = (evt: ICustomEventMessageRequest) => void;

// =========================================================

export abstract class ContentScriptProxyProvider {
  private providerName: string;
  private actionToCallback: Map<string, CallbackFunction>;

  public constructor(providerName: string) {
    this.providerName = providerName;
    this.actionToCallback = new Map<string, CallbackFunction>();

    this.attachCallbackHandler = this.attachCallbackHandler.bind(this);

    // ================================================================
    // and how the content script listen for commands
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${this.providerName}`
      ] as EventTarget
    ).addEventListener(AvailableCommands.AccountSign, (evt: CustomEvent) => {
      const payload: ICustomEventMessageRequest = evt.detail;
      this.actionToCallback.get(AvailableCommands.AccountSign)(payload);
    });

    // attach handlers for various methods
    this.attachCallbackHandler(
      AvailableCommands.AccountSign,
      (payload: ICustomEventMessageRequest) => {
        const accountSignPayload = payload.params as IAccountSignRequest;
        console.log('Account signing the payload', accountSignPayload);
        const respMessage = {
          result: {
            pubKey: '0x0000',
            signature: Uint8Array.from([1, 2, 3]),
          } as IAccountSignResponse,
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );

    // ================================================================
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${this.providerName}`
      ] as EventTarget
    ).addEventListener(AvailableCommands.AccountBalance, (evt: CustomEvent) => {
      const payload: ICustomEventMessageRequest = evt.detail;
      this.actionToCallback.get(AvailableCommands.AccountBalance)(payload);
    });

    this.attachCallbackHandler(
      AvailableCommands.AccountBalance,
      (payload: ICustomEventMessageRequest) => {
        const accountBalancePayload = payload.params as IAccountBalanceRequest;
        console.log(
          'Getting account balance using the payload',
          accountBalancePayload,
        );
        const respMessage = {
          result: { balance: '120' } as IAccountBalanceResponse,
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );
    // ================================================================
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${this.providerName}`
      ] as EventTarget
    ).addEventListener(
      AvailableCommands.ProviderDeleteAccount,
      (evt: CustomEvent) => {
        const payload: ICustomEventMessageRequest = evt.detail;
        this.actionToCallback.get(AvailableCommands.ProviderDeleteAccount)(
          payload,
        );
      },
    );

    this.attachCallbackHandler(
      AvailableCommands.ProviderDeleteAccount,
      (payload: ICustomEventMessageRequest) => {
        const accountDeletionPayload =
          payload.params as IAccountDeletionRequest;
        console.log(
          'Provider deleting account payload',
          accountDeletionPayload,
        );
        const respMessage = {
          result: {
            response: EAccountDeletionResponse.OK,
          } as IAccountDeletionResponse,
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );

    // ================================================================
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${this.providerName}`
      ] as EventTarget
    ).addEventListener(
      AvailableCommands.ProviderImportAccount,
      (evt: CustomEvent) => {
        const payload: ICustomEventMessageRequest = evt.detail;
        this.actionToCallback.get(AvailableCommands.ProviderImportAccount)(
          payload,
        );
      },
    );

    this.attachCallbackHandler(
      AvailableCommands.ProviderImportAccount,
      (payload: ICustomEventMessageRequest) => {
        const accountImportPayload = payload.params as IAccountImportRequest;
        console.log('Provider importing account payload', accountImportPayload);
        const respMessage = {
          result: {
            response: EAccountImportResponse.OK,
            message: 'Import was fine',
          } as IAccountImportResponse,
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );
    // ================================================================
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${this.providerName}`
      ] as EventTarget
    ).addEventListener(
      AvailableCommands.ProviderListAccounts,
      (evt: CustomEvent) => {
        const payload: ICustomEventMessageRequest = evt.detail;
        this.actionToCallback.get(AvailableCommands.ProviderListAccounts)(
          payload,
        );
      },
    );

    this.attachCallbackHandler(
      AvailableCommands.ProviderListAccounts,
      (payload: ICustomEventMessageRequest) => {
        const respMessage = {
          result: [{ name: 'my account', address: '0x0' } as IAccount],
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );
    // ================================================================
  }

  private attachCallbackHandler(
    methodName: string,
    callback: (payload: ICustomEventMessageRequest) => void,
  ): void {
    this.actionToCallback.set(methodName, callback);
  }

  public static registerAsMassaWalletProvider(
    providerName: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const registerProvider = () => {
        if (!window.massaWalletProvider) {
          return resolve(false);
        }

        // answer to the register target
        window.massaWalletProvider.dispatchEvent(
          new CustomEvent('register', {
            detail: {
              providerName: providerName,
              eventTarget: providerName,
            } as IRegisterEvent,
          }),
        );
        return resolve(true);
      };

      if (
        document.readyState === 'complete' ||
        document.readyState === 'interactive'
      ) {
        console.log('[PLUGIN_INJECTED] DOCUMENT READY!');
        registerProvider();
      } else {
        console.log('[PLUGIN_INJECTED] DOCUMENT READY EVENT LISTENER ATTACHED');
        document.addEventListener('DOMContentLoaded', registerProvider);
      }
    });
  }
}

export class MyWalletProvider extends ContentScriptProxyProvider {
  // ..other wallet-specific members for the wallets internal implementation

  constructor(providerName: string) {
    super(providerName);

    // ...other wallet-specific stuff
  }
}
