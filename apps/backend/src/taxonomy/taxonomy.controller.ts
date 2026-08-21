import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TaxonomyService } from './taxonomy.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';

@ApiTags('Taxonomy')
@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new taxonomy node' })
  @ApiResponse({ status: 201, description: 'Taxonomy node created successfully' })
  create(@Body() createTaxonomyDto: CreateTaxonomyDto) {
    return this.taxonomyService.create(createTaxonomyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all taxonomy nodes as a flat list' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('includeDeleted') includeDeleted?: string,
    @Query('search') search?: string,
  ) {
    const isDeleted = includeDeleted === 'true';
    return this.taxonomyService.findAll(isDeleted, search);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get all taxonomy nodes structured as a hierarchical tree' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  getTree(@Query('includeDeleted') includeDeleted?: string) {
    const isDeleted = includeDeleted === 'true';
    return this.taxonomyService.getTree(isDeleted);
  }

  @Get('suggest-folder')
  @ApiOperation({ summary: 'Suggest default virtual folder path from a taxonomy path' })
  @ApiQuery({ name: 'path', required: true, type: String })
  suggestFolder(@Query('path') path: string) {
    if (!path) {
      throw new BadRequestException('Path query parameter is required');
    }
    return this.taxonomyService.suggestFolderForTaxonomy(path);
  }

  @Get(':id/suggest-folder')
  @ApiOperation({ summary: 'Suggest default virtual folder path for a specific taxonomy node' })
  suggestFolderById(@Param('id') id: string) {
    return this.taxonomyService.suggestFolderForTaxonomy(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific taxonomy node by ID' })
  findOne(@Param('id') id: string) {
    return this.taxonomyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a taxonomy node' })
  update(@Param('id') id: string, @Body() updateTaxonomyDto: UpdateTaxonomyDto) {
    return this.taxonomyService.update(id, updateTaxonomyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a taxonomy node' })
  remove(@Param('id') id: string) {
    return this.taxonomyService.softDelete(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted taxonomy node' })
  restore(@Param('id') id: string) {
    return this.taxonomyService.restore(id);
  }
}
