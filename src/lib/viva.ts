import crypto from 'crypto';

interface FetchOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

/**
 * Minimal fetch wrapper that mimics the axios instance pattern used throughout
 * this file, but uses the Node.js / Next.js built-in fetch so we don't need
 * the axios package.
 */
class VivaApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
  }

  private async request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: options.method ?? 'GET',
      headers: { ...this.defaultHeaders, ...(options.headers ?? {}) },
      body: options.body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Viva API ${options.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }
}

export class VivaWalletClient {
  private api: VivaApiClient;
  private merchantId: string;
  private webhookSecret: string;

  constructor(merchantId: string, apiKey: string, webhookSecret: string) {
    this.merchantId = merchantId;
    this.webhookSecret = webhookSecret;
    this.api = new VivaApiClient(
      process.env.VIVA_BASE_URL || 'https://api.vivapayments.com',
      apiKey,
    );
  }

  async createOrder(
    tenantId: string,
    invoiceId: string,
    amount: number,
    description: string,
  ): Promise<string | null> {
    try {
      const data = await this.api.post<{ orderCode?: string }>('/checkout/create', {
        amount: Math.round(amount * 100), // cents
        merchantTrnRef: invoiceId,
        sourceCode: this.merchantId,
        disablePreAuth: false,
        preAuth: false,
        tokenLifetime: 0,
        allowRecurring: true,
        maxInstallments: 1,
        paymentTimeoutSecs: 600,
        merchantStatement: description,
        clientIp: '0.0.0.0',
        tags: { tenantId, invoiceId },
      });
      return data.orderCode ?? null;
    } catch (error) {
      console.error('Error creating Viva order:', error);
      return null;
    }
  }

  getCheckoutUrl(orderCode: string): string {
    return `https://www.vivapayments.com/web/checkout?ref=${orderCode}`;
  }

  verifyWebhookSignature(payload: Record<string, unknown>, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('base64') === signature;
  }

  async getTransactionDetails(transactionId: string): Promise<Record<string, unknown> | null> {
    try {
      return await this.api.get<Record<string, unknown>>(`/transactions/${transactionId}`);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      return null;
    }
  }

  async createRecurringOrder(
    tenantId: string,
    invoiceId: string,
    amount: number,
    recurringToken: string,
    description: string,
  ): Promise<boolean> {
    try {
      await this.api.post('/charge-recurring', {
        amount: Math.round(amount * 100),
        merchantTrnRef: invoiceId,
        sourceCode: this.merchantId,
        tokenId: recurringToken,
        merchantStatement: description,
        tags: { tenantId, invoiceId },
      });
      return true;
    } catch (error) {
      console.error('Error creating recurring charge:', error);
      return false;
    }
  }
}

export function createVivaWalletClient(): VivaWalletClient {
  return new VivaWalletClient(
    process.env.VIVA_MERCHANT_ID ?? '',
    process.env.VIVA_API_KEY ?? '',
    process.env.VIVA_WEBHOOK_SECRET ?? '',
  );
}
