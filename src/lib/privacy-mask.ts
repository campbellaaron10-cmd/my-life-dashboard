// Privacy masking for money values.
//
// Guest mode keeps every card/tile in place but replaces numeric values with a
// dot mask and hides charts entirely. The flag is module-level (set by
// <PrivacyModeProvider> during render) so the many existing `fmt()` helpers can
// mask without threading context through every call site.
let masked = false;

export const setMoneyMasked = (v: boolean) => {
  masked = v;
};

export const isMoneyMasked = () => masked;

export const MONEY_MASK = "••••••";

/** Wrap a formatted money string; returns the mask while in guest mode. */
export const maskMoney = (s: string) => (masked ? MONEY_MASK : s);
