export interface SupabaseRealtimeOptions {
  baseUrl: string;
  apiKey: string;
  eventsTable: string;
  onRecord: (record: any) => void;
  onConnectedChange?: (connected: boolean) => void;
  onCatchUp?: () => void;
}

/**
 * Lightweight Phoenix Channel WebSocket client for Supabase Realtime postgres_changes.
 */
export class SupabaseRealtimeClient {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private connected = false;
  private phxRef = 1;

  constructor(private readonly options: SupabaseRealtimeOptions) {}

  start(): void {
    this.running = true;
    this.connect();
  }

  stop(): void {
    this.running = false;
    this.connected = false;
    this.options.onConnectedChange?.(false);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore close errors
      }
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private connect(): void {
    if (!this.running) return;
    const wsBase = this.options.baseUrl.replace(/^http/i, 'ws');
    const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(this.options.apiKey)}&vsn=1.0.0`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.options.onConnectedChange?.(true);

      const joinMsg = {
        topic: `realtime:public:${this.options.eventsTable}`,
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { self: false },
            postgres_changes: [
              { event: 'INSERT', schema: 'public', table: this.options.eventsTable },
            ],
          },
        },
        ref: String(this.phxRef++),
      };
      this.ws?.send(JSON.stringify(joinMsg));

      // Trigger catch-up on connect/reconnect
      this.options.onCatchUp?.();

      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        if (this.ws && this.connected) {
          this.ws.send(
            JSON.stringify({
              topic: 'phoenix',
              event: 'heartbeat',
              payload: {},
              ref: String(this.phxRef++),
            }),
          );
        }
      }, 25_000);
    };

    this.ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(String(msg.data));
        const record = parsed?.payload?.data?.record || parsed?.payload?.record;
        if (record && record.event_id) {
          this.options.onRecord(record);
        }
      } catch {
        // ignore non-JSON frames
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.options.onConnectedChange?.(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.connected = false;
      this.options.onConnectedChange?.(false);
    };
  }

  private scheduleReconnect(): void {
    if (!this.running || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3_000);
  }
}
