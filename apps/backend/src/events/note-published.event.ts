export class NotePublishedEvent {
  constructor(
    public readonly noteId: string,
    public readonly title: string,
    public readonly folderPath?: string,
    public readonly status: string = 'PUBLISHED',
    public readonly publishAt?: Date | null,
    public readonly feedId?: string | null,
    public readonly isNew: boolean = true,
    public readonly payload?: any,
  ) {}
}
