type CoinBalanceDetail = {
  balance?: number;
};

const COIN_BALANCE_EVENT = 'coin-balance:update';

export function emitCoinBalanceUpdate(detail: CoinBalanceDetail = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<CoinBalanceDetail>(COIN_BALANCE_EVENT, { detail }));
}

export function subscribeToCoinBalanceUpdates(
  handler: (detail: CoinBalanceDetail) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const listener = (event: Event) => {
    handler((event as CustomEvent<CoinBalanceDetail>).detail ?? {});
  };

  window.addEventListener(COIN_BALANCE_EVENT, listener as EventListener);
  return () => window.removeEventListener(COIN_BALANCE_EVENT, listener as EventListener);
}



