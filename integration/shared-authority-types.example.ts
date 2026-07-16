export type AuthorityPlayerInput = {
  slotId: string;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  actionHeld: boolean;
  actionSequence: number;
  inputSequence: number;
};

export type AuthoritySyncRequest = {
  roomId: string;
  afterStateSequence: number;
  input: AuthorityPlayerInput | null;
  forceFullWorld?: boolean;
};

export type AuthoritySyncResponse = {
  ok: true;
  stateSequence: number;
  acknowledgedInputSequence: number;
  inputAccepted: boolean;
  shouldBroadcast: boolean;
  snapshot: unknown;
};
