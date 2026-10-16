import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  BusCommand,
  CommandType,
  EnqueueCommandInput,
  EnqueueCommandResponse,
  BusTasksFilter,
} from '@lenta/shared';
import { ICommandHandler } from './command-bus.interface';
import {
  CreateNoteHandler,
  UpdateContainerHandler,
  AddBookmarkHandler,
  AddLinkHandler,
  IngestAudioHandler,
  AddNotebookLmHandler,
} from './handlers';

@Injectable()
export class CommandBusService implements OnModuleInit {
  private readonly logger = new Logger(CommandBusService.name);
  private readonly queueFilePath = path.resolve(process.cwd(), 'uploads', 'command-bus-queue.json');

  // In-memory queue ring buffer
  private commands: BusCommand[] = [];
  private isProcessing = false;

  // Declarative handler map
  private readonly handlerMap: Record<CommandType, ICommandHandler>;

  constructor(
    private readonly createNoteHandler: CreateNoteHandler,
    private readonly updateContainerHandler: UpdateContainerHandler,
    private readonly addBookmarkHandler: AddBookmarkHandler,
    private readonly addLinkHandler: AddLinkHandler,
    private readonly ingestAudioHandler: IngestAudioHandler,
    private readonly addNotebookLmHandler: AddNotebookLmHandler,
  ) {
    this.handlerMap = {
      CREATE_NOTE: this.createNoteHandler,
      UPDATE_CONTAINER: this.updateContainerHandler,
      ADD_BOOKMARK: this.addBookmarkHandler,
      ADD_LINK: this.addLinkHandler,
      INGEST_AUDIO: this.ingestAudioHandler,
      ADD_NOTEBOOKLM: this.addNotebookLmHandler,
    };
  }

  onModuleInit() {
    this.loadPersistedQueue();
    // Auto-drain any pending items from previous runs
    this.drainQueue().catch((err) => {
      this.logger.error(`Initial queue drain error: ${err.message}`);
    });
  }

  /**
   * Enqueues a command into the bus.
   * If executeSync is true, executes immediately and returns the result.
   */
  async enqueue(input: EnqueueCommandInput): Promise<EnqueueCommandResponse> {
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const command: BusCommand = {
      id: commandId,
      type: input.type,
      payload: input.payload,
      status: 'PENDING',
      priority: input.priority || 'NORMAL',
      clientId: input.clientId || 'default',
      targetDate: input.targetDate,
      createdAt: now,
    };

    this.commands.unshift(command);
    if (this.commands.length > 500) {
      this.commands.pop(); // Keep last 500 tasks in history
    }
    this.savePersistedQueue();

    this.logger.log(`📥 Enqueued command [${command.type}] (id: ${command.id}, client: ${command.clientId})`);

    // Synchronous execution branch
    if (input.executeSync) {
      return this.executeCommand(command);
    }

    // Asynchronous background trigger
    setImmediate(() => {
      this.drainQueue().catch((err) => {
        this.logger.error(`Background drain error: ${err.message}`);
      });
    });

    return {
      success: true,
      commandId: command.id,
      type: command.type,
      status: 'PENDING',
      enqueuedAt: command.createdAt,
    };
  }

  /**
   * Retrieves a task by its unique ID.
   */
  getTask(id: string): BusCommand {
    const task = this.commands.find((c) => c.id === id);
    if (!task) {
      throw new NotFoundException(`Команда с ID ${id} не найдена в шине`);
    }
    return task;
  }

  /**
   * Lists tasks with optional filtering.
   */
  listTasks(filter?: BusTasksFilter): { total: number; tasks: BusCommand[] } {
    let list = [...this.commands];

    if (filter?.status) {
      list = list.filter((c) => c.status === filter.status);
    }
    if (filter?.type) {
      list = list.filter((c) => c.type === filter.type);
    }
    if (filter?.clientId) {
      list = list.filter((c) => c.clientId === filter.clientId);
    }

    const total = list.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;

    return {
      total,
      tasks: list.slice(offset, offset + limit),
    };
  }

  /**
   * Retries execution of a failed or pending command.
   */
  async retry(id: string): Promise<EnqueueCommandResponse> {
    const command = this.getTask(id);
    command.status = 'PENDING';
    command.error = null;
    this.savePersistedQueue();

    return this.executeCommand(command);
  }

  /**
   * Drains all pending tasks in FIFO order.
   */
  async drainQueue(): Promise<{ processedCount: number }> {
    if (this.isProcessing) return { processedCount: 0 };
    this.isProcessing = true;

    let processed = 0;
    try {
      // Process pending commands from oldest to newest
      const pending = this.commands.filter((c) => c.status === 'PENDING').reverse();
      for (const cmd of pending) {
        await this.executeCommand(cmd);
        processed++;
      }
    } finally {
      this.isProcessing = false;
      this.savePersistedQueue();
    }

    return { processedCount: processed };
  }

  private async executeCommand(command: BusCommand): Promise<EnqueueCommandResponse> {
    const handler = this.handlerMap[command.type];
    if (!handler) {
      const err = `Не найден обработчик для команды типа: ${command.type}`;
      this.logger.error(err);
      command.status = 'FAILED';
      command.error = err;
      command.completedAt = new Date().toISOString();
      this.savePersistedQueue();
      return {
        success: false,
        commandId: command.id,
        type: command.type,
        status: 'FAILED',
        enqueuedAt: command.createdAt,
        error: err,
      };
    }

    command.status = 'PROCESSING';
    command.startedAt = new Date().toISOString();
    this.savePersistedQueue();

    try {
      const result = await handler.execute(command.payload, command);
      command.status = 'COMPLETED';
      command.result = result;
      command.completedAt = new Date().toISOString();
      command.error = null;
      this.savePersistedQueue();

      this.logger.log(`✅ Completed command [${command.type}] (id: ${command.id})`);
      return {
        success: true,
        commandId: command.id,
        type: command.type,
        status: 'COMPLETED',
        enqueuedAt: command.createdAt,
        result,
      };
    } catch (err: any) {
      command.status = 'FAILED';
      command.error = err.message || String(err);
      command.completedAt = new Date().toISOString();
      this.savePersistedQueue();

      this.logger.error(`❌ Failed command [${command.type}] (id: ${command.id}): ${command.error}`);
      return {
        success: false,
        commandId: command.id,
        type: command.type,
        status: 'FAILED',
        enqueuedAt: command.createdAt,
        error: command.error || 'Unknown error',
      };
    }
  }

  private loadPersistedQueue() {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const raw = fs.readFileSync(this.queueFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.commands = parsed;
          this.logger.log(`Loaded ${this.commands.length} commands from persisted queue.`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load persisted queue: ${err.message}`);
    }
  }

  private savePersistedQueue() {
    try {
      const dir = path.dirname(this.queueFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.queueFilePath, JSON.stringify(this.commands, null, 2), 'utf8');
    } catch (err: any) {
      this.logger.warn(`Could not persist queue: ${err.message}`);
    }
  }
}
