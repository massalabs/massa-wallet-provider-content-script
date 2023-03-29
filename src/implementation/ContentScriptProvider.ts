import { AvailableCommands } from './Commands';
import {
  IAccountBalanceRequest,
  IAccountBalanceResponse,
  IAccountSignRequest,
  IAccountSignResponse,
  IAccountDeletionRequest,
  IAccountDeletionResponse,
  IAccountImportRequest,
  IAccountImportResponse,
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

export abstract class ContentScriptProvider {
  private static providerName: string;
  private actionToCallback: Map<string, CallbackFunction>;

  public abstract sign(payload: IAccountSignRequest): IAccountSignResponse;
  public abstract balance(
    payload: IAccountBalanceRequest,
  ): IAccountBalanceResponse;
  public abstract deleteAccount(
    payload: IAccountDeletionRequest,
  ): IAccountDeletionResponse;
  public abstract importAccount(
    payload: IAccountImportRequest,
  ): IAccountImportResponse;
  public abstract listAccounts(): IAccount[];

  public constructor() {
    this.actionToCallback = new Map<string, CallbackFunction>();

    this.attachCallbackHandler = this.attachCallbackHandler.bind(this);

    // ======================SIGN===============================
    // and how the content script listen for commands
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${ContentScriptProvider.providerName}`
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
        const respMessage = {
          result: this.sign(accountSignPayload),
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );

    // ===========================BALANCE============================
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${ContentScriptProvider.providerName}`
      ] as EventTarget
    ).addEventListener(AvailableCommands.AccountBalance, (evt: CustomEvent) => {
      const payload: ICustomEventMessageRequest = evt.detail;
      this.actionToCallback.get(AvailableCommands.AccountBalance)(payload);
    });

    this.attachCallbackHandler(
      AvailableCommands.AccountBalance,
      (payload: ICustomEventMessageRequest) => {
        const accountBalancePayload = payload.params as IAccountBalanceRequest;
        const respMessage = {
          result: this.balance(accountBalancePayload),
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );
    // ============================DELETE ACCOUNT============================
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${ContentScriptProvider.providerName}`
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
          result: this.deleteAccount(accountDeletionPayload),
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );

    // =============================IMPORT ACCOUNT===================================
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${ContentScriptProvider.providerName}`
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
        const respMessage = {
          result: this.importAccount(accountImportPayload),
          error: null,
          requestId: payload.requestId,
        } as ICustomEventMessageResponse;
        // answer to the message target
        (window.massaWalletProvider as EventTarget).dispatchEvent(
          new CustomEvent('message', { detail: respMessage }),
        );
      },
    );
    // ==============================LIST ACCOUNTS==================================
    (
      window[
        `${MASSA_WINDOW_OBJECT_PRAEFIX}-${ContentScriptProvider.providerName}`
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
          result: this.listAccounts(),
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
    ContentScriptProvider.providerName = providerName;
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
        registerProvider();
      } else {
        document.addEventListener('DOMContentLoaded', registerProvider);
      }
    });
  }
}
