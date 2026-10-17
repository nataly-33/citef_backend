import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CrearRolDto } from './dto/crear-rol.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Roles y Permisos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'CU3: Listar roles del sistema con sus permisos asignados',
  })
  @ApiResponse({ status: 200, description: 'Lista completa de roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permisos')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'CU3: Listar catálogo completo de permisos del sistema',
  })
  @ApiResponse({ status: 200, description: 'Catálogo de permisos por módulo' })
  findAllPermisos() {
    return this.rolesService.findAllPermisos();
  }

  @Get(':id')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'Obtener detalle de un rol por su ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'CU3: Crear un nuevo rol en el sistema' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  crear(
    @Body() dto: CrearRolDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.rolesService.crear(dto, user, ip);
  }

  @Put(':id/permisos')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'CU3: Actualizar la matriz de permisos de un rol' })
  actualizarPermisos(
    @Param('id', ParseIntPipe) id: number,
    @Body('permisos_ids') permisosIds: number[],
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.rolesService.actualizarPermisos(id, permisosIds, user, ip);
  }
}
