import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MacrosService } from './macros.service';
import { CreateQuickAddMacroDto, UpdateQuickAddMacroDto } from './dto/macro.dto';

@ApiTags('Macros')
@Controller('macros')
export class MacrosController {
  constructor(private readonly macrosService: MacrosService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все пресеты / макросы быстрого добавления' })
  @ApiResponse({ status: 200, description: 'Список макросов' })
  findAll() {
    return this.macrosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить макрос по ID' })
  findOne(@Param('id') id: string) {
    return this.macrosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый макрос' })
  create(@Body() dto: CreateQuickAddMacroDto) {
    return this.macrosService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить макрос' })
  update(@Param('id') id: string, @Body() dto: UpdateQuickAddMacroDto) {
    return this.macrosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить макрос' })
  remove(@Param('id') id: string) {
    return this.macrosService.remove(id);
  }
}
