import { IncomingMessage, ServerResponse } from 'node:http';
import { LemonBusEnvelope } from '../types/bus-contract.types.js';

export interface SseSubscriber {
  id: string;
  req: IncomingMessage;
  res: ServerResponse;
  feedSlug?: string;
  streamSlug?: string;
  excludeDeviceId?: string;
}

export class SseManager {
  private subscribers = new Map<string, SseSubscriber>();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(pingIntervalMs = 15000) {
    this.startPing(pingIntervalMs);
  }

  add(subscriber: SseSubscriber): void {
    const { id, req, res } = subscriber;

    // Send initial SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`:connected id=${id}\n\n`);

    this.subscribers.set(id, subscriber);

    const cleanup = () => {
      this.remove(id);
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
    res.on('error', cleanup);
  }

  remove(id: string): void {
    const sub = this.subscribers.get(id);
    if (!sub) return;

    this.subscribers.delete(id);
    try {
      if (!sub.res.writableEnded) {
        sub.res.end();
      }
    } catch {
      // Ignore cleanup error
    }
  }

  broadcast(envelope: LemonBusEnvelope): void {
    const payloadStr = JSON.stringify(envelope);
    const sseMessage = `id: ${envelope.seq}\nevent: event\ndata: ${payloadStr}\n\n`;

    for (const [id, sub] of this.subscribers.entries()) {
      try {
        if (sub.excludeDeviceId && sub.excludeDeviceId === envelope.deviceId) {
          continue;
        }
        if (sub.feedSlug && sub.feedSlug !== envelope.feedSlug) {
          continue;
        }
        if (sub.streamSlug && sub.streamSlug !== envelope.streamSlug) {
          continue;
        }

        sub.res.write(sseMessage);
      } catch (err) {
        this.remove(id);
      }
    }
  }

  broadcastCustom(eventName: string, data: any, id?: string | number): void {
    const payloadStr = JSON.stringify(data);
    const idPrefix = id != null ? `id: ${id}\n` : '';
    const sseMessage = `${idPrefix}event: ${eventName}\ndata: ${payloadStr}\n\n`;

    for (const [subId, sub] of this.subscribers.entries()) {
      try {
        sub.res.write(sseMessage);
      } catch (err) {
        this.remove(subId);
      }
    }
  }

  broadcastModeration(data: any): void {
    this.broadcastCustom('moderation', data);
  }

  count(): number {
    return this.subscribers.size;
  }

  private startPing(ms: number): void {
    if (this.pingInterval) return;
    this.pingInterval = setInterval(() => {
      const ping = `:ping ${Date.now()}\n\n`;
      for (const [id, sub] of this.subscribers.entries()) {
        try {
          sub.res.write(ping);
        } catch {
          this.remove(id);
        }
      }
    }, ms);
    if (this.pingInterval.unref) {
      this.pingInterval.unref();
    }
  }

  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const id of Array.from(this.subscribers.keys())) {
      this.remove(id);
    }
  }
}
