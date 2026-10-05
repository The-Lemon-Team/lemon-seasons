import { PartialType } from '@nestjs/swagger';
import { CreateCuratorDto } from './create-curator.dto';

export class UpdateCuratorDto extends PartialType(CreateCuratorDto) {}
