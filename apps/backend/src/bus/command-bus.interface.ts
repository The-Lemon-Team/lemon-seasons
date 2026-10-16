import { BusCommand, CommandType } from '@lenta/shared';

export interface ICommandHandler<TPayload = any, TResult = any> {
  readonly commandType: CommandType;
  execute(payload: TPayload, command: BusCommand): Promise<TResult>;
}
