export class FileDetectedEvent {
  constructor(
    public readonly filePath: string,
    public readonly fileName: string,
    public readonly folderPath: string,
    public readonly fileHash: string,
    public readonly eventType: 'ADD' | 'CHANGE',
    public readonly mtime: Date,
    public readonly size?: number,
  ) {}
}
