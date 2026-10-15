import { config } from "../config";

type JsonRecord = Record<string, unknown>;

export class MpesaError extends Error {
  constructor(message: string, public readonly uncertain = false) {
    super(message);
    this.name = "MpesaError";
  }
}

let cachedToken: { value: string; expiresAt: number } | undefined;

const isHttpsPublicUrl = (value: string | undefined) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
};

export const isMpesaConfigured = () =>
  Boolean(
    config.mpesaConsumerKey &&
      config.mpesaConsumerSecret &&
      config.mpesaShortcode &&
      config.mpesaPasskey &&
      isHttpsPublicUrl(config.mpesaCallbackUrl) &&
      ["sandbox", "production"].includes(config.mpesaEnvironment) &&
      ["CustomerPayBillOnline", "CustomerBuyGoodsOnline"].includes(config.mpesaTransactionType)
  );

export const normalizeKenyanPhone = (value: unknown) => {
  if (typeof value !== "string") {
    throw new MpesaError("Enter a valid Kenyan M-Pesa phone number.");
  }
  const compact = value.trim().replace(/[\s()-]/g, "");
  const normalized = compact.startsWith("+")
    ? compact.slice(1)
    : compact.startsWith("0")
      ? `254${compact.slice(1)}`
      : compact;

  if (!/^254(?:7\d{8}|1\d{8})$/.test(normalized)) {
    throw new MpesaError("Enter a valid Kenyan mobile number, such as 0712345678.");
  }
  return normalized;
};

const baseUrl =
  config.mpesaEnvironment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const asRecord = (value: unknown): JsonRecord | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

const readJson = async (response: Response): Promise<JsonRecord> => {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new MpesaError("Safaricom returned an unreadable response.");
  }
  const record = asRecord(payload);
  if (!record) throw new MpesaError("Safaricom returned an invalid response.");
  return record;
};

const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const credentials = `${config.mpesaConsumerKey}:${config.mpesaConsumerSecret}`;
  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: { Authorization: `Basic ${Buffer.from(credentials).toString("base64")}` },
        signal: AbortSignal.timeout(15_000)
      }
    );
  } catch {
    throw new MpesaError("Unable to connect to Safaricom M-Pesa.");
  }

  const payload = await readJson(response);
  const token = payload.access_token;
  const expiresIn = Number(payload.expires_in);
  if (!response.ok || typeof token !== "string" || !token || !Number.isFinite(expiresIn)) {
    throw new MpesaError("Safaricom M-Pesa authentication failed.");
  }
  cachedToken = { value: token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
};

const getNairobiTimestamp = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}${part("month")}${part("day")}${part("hour")}${part("minute")}${part("second")}`;
};

export const initiateStkPush = async (input: {
  amount: number;
  orderId: string;
  phone: string;
}) => {
  if (!isMpesaConfigured()) {
    throw new MpesaError("M-Pesa payments are not configured yet.");
  }
  if (!Number.isSafeInteger(input.amount) || input.amount < 1) {
    throw new MpesaError("M-Pesa checkout requires an order total of at least KES 1 with no cents.");
  }

  const timestamp = getNairobiTimestamp();
  const password = Buffer.from(
    `${config.mpesaShortcode}${config.mpesaPasskey}${timestamp}`
  ).toString("base64");
  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        BusinessShortCode: config.mpesaShortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: config.mpesaTransactionType,
        Amount: input.amount,
        PartyA: input.phone,
        PartyB: config.mpesaShortcode,
        PhoneNumber: input.phone,
        CallBackURL: config.mpesaCallbackUrl,
        AccountReference: `WA${input.orderId.slice(-10)}`.toUpperCase(),
        TransactionDesc: config.mpesaTransactionDescription.slice(0, 13)
      })
    });
  } catch {
    throw new MpesaError(
      "Safaricom may have received the payment request, but the response could not be confirmed.",
      true
    );
  }

  const payload = await readJson(response);
  const responseCode = String(payload.ResponseCode ?? "");
  const checkoutRequestId = payload.CheckoutRequestID;
  const merchantRequestId = payload.MerchantRequestID;
  if (
    !response.ok ||
    responseCode !== "0" ||
    typeof checkoutRequestId !== "string" ||
    typeof merchantRequestId !== "string"
  ) {
    throw new MpesaError("Safaricom could not start the M-Pesa payment request.");
  }

  return {
    checkoutRequestId,
    merchantRequestId,
    customerMessage:
      typeof payload.CustomerMessage === "string"
        ? payload.CustomerMessage
        : "Check your phone and enter your M-Pesa PIN to approve the payment."
  };
};
