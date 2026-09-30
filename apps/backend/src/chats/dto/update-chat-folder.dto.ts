import { PartialType } from '@nestjs/swagger';
import { CreateChatFolderDto } from './create-chat-folder.dto';

export class UpdateChatFolderDto extends PartialType(CreateChatFolderDto) {}
