type TwilioMessage = {
  sid: string;
  status: string;
};

type TwilioClient = {
  messages: {
    create(options: {
      body: string;
      from: string;
      to: string;
    }): Promise<TwilioMessage>;
  };
};

type VoiceGrantOptions = {
  outgoingApplicationSid: string;
  incomingAllow: boolean;
};

type VoiceGrantConstructor = new (
  options: VoiceGrantOptions,
) => object;

type AccessTokenConstructor = {
  new (
    accountSid: string,
    apiKeySid: string,
    apiKeySecret: string,
    options: { identity: string; ttl: number },
  ): {
    addGrant(grant: object): void;
    toJwt(): string;
  };
  VoiceGrant: VoiceGrantConstructor;
};

type TwilioSdk = {
  (accountSid: string, authToken: string): TwilioClient;
  validateRequest(
    authToken: string,
    signature: string,
    url: string,
    params: Record<string, string>,
  ): boolean;
  jwt: {
    AccessToken: AccessTokenConstructor;
  };
};

let sdk: TwilioSdk | undefined;
let client: TwilioClient | undefined;

function getTwilioSdk(): TwilioSdk {
  if (sdk) {
    return sdk;
  }

  const moduleValue: unknown = require("twilio");
  const jwt: unknown =
    typeof moduleValue === "function"
      ? Reflect.get(moduleValue, "jwt")
      : undefined;
  const accessToken: unknown =
    typeof jwt === "object" && jwt !== null
      ? Reflect.get(jwt, "AccessToken")
      : undefined;
  if (
    typeof moduleValue !== "function" ||
    typeof Reflect.get(moduleValue, "validateRequest") !== "function" ||
    typeof accessToken !== "function" ||
    typeof Reflect.get(accessToken, "VoiceGrant") !== "function"
  ) {
    throw new Error("No se pudo cargar el SDK de Twilio.");
  }

  sdk = moduleValue as TwilioSdk;
  return sdk;
}

export function getTwilioClient(): TwilioClient {
  if (client) {
    return client;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Faltan TWILIO_ACCOUNT_SID y/o TWILIO_AUTH_TOKEN en el entorno.",
    );
  }

  client = getTwilioSdk()(accountSid, authToken);
  return client;
}

export function validateTwilioRequest(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  return getTwilioSdk().validateRequest(authToken, signature, url, params);
}

export function createVoiceAccessToken(options: {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  identity: string;
  twimlAppSid: string;
}): string {
  const twilioSdk = getTwilioSdk();
  const accessToken = new twilioSdk.jwt.AccessToken(
    options.accountSid,
    options.apiKeySid,
    options.apiKeySecret,
    { identity: options.identity, ttl: 3600 },
  );
  accessToken.addGrant(
    new twilioSdk.jwt.AccessToken.VoiceGrant({
      outgoingApplicationSid: options.twimlAppSid,
      incomingAllow: true,
    }),
  );

  return accessToken.toJwt();
}
