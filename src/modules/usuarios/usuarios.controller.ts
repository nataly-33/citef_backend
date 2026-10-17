import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'CU1: Listar usuarios del sistema con filtros y roles',
  })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'busqueda', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  findAll(
    @Query('activo') activo?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;
    return this.usuariosService.findAll({ activo: activoBool, busqueda });
  }

  @Get(':id')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'CU1: Obtener detalle de usuario por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'CU1: Registrar nuevo usuario institucional con roles',
  })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  crear(
    @Body() dto: CrearUsuarioDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.usuariosService.crear(dto, ejecutor, ip);
  }

  @Put(':id')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'CU1: Modificar datos y roles de un usuario' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.usuariosService.actualizar(id, dto, ejecutor, ip);
  }

  @Patch(':id/estado')
  @Roles('ADMINISTRADOR')
  @ApiOperation({ summary: 'CU1: Activar o desactivar cuenta de usuario' })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body('activo') activo: boolean,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.usuariosService.cambiarEstado(id, activo, ejecutor, ip);
  }

  @Patch(':id/cambiar-password')
  @Roles('ADMINISTRADOR')
  @ApiOperation({
    summary: 'CU1: Restablecer contraseña de usuario por administrador',
  })
  cambiarPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarPasswordDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.usuariosService.cambiarPassword(id, dto, ejecutor, ip);
  }
}
