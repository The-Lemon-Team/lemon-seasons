import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@ApiTags('Folders')
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new folder or ensure folder hierarchy' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  create(@Body() createFolderDto: CreateFolderDto) {
    return this.foldersService.create(createFolderDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all folders (flat list)' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('includeDeleted') includeDeleted?: string,
    @Query('search') search?: string,
  ) {
    return this.foldersService.findAll(includeDeleted === 'true', search);
  }

  @Get('tree')
  @ApiOperation({
    summary: 'Get nested hierarchical folder tree for Obsidian-style file explorer',
  })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  getTree(@Query('includeDeleted') includeDeleted?: string) {
    return this.foldersService.getTree(includeDeleted === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single folder by ID or path with its notes' })
  findOne(@Param('id') id: string) {
    return this.foldersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update folder properties (name, path, icon, color)' })
  update(@Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto) {
    return this.foldersService.update(id, updateFolderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a folder and subfolders' })
  remove(@Param('id') id: string) {
    return this.foldersService.softDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted folder and subfolders' })
  restore(@Param('id') id: string) {
    return this.foldersService.restore(id);
  }
}
