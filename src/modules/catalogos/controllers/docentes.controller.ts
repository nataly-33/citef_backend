import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Ip,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocentesService } from '../services/docentes.service';
import { CrearDocenteDto } from '../dto/crear-docente.dto';
import { ActualizarDocenteDto } from '../dto/actualizar-docente.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permisos } from '../../auth/decorators/permisos.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Docentes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Permisos('CAT_IMPORTAR_DOCENTES')
@Controller('docentes')
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Get()
  @Permisos(
    'CAT_IMPORTAR_DOCENTES',
    'RESERVAS_SOLICITAR',
    'RESERVAS_CONSULTAR',
    'RESERVAS_GESTIONAR',
  )
  @ApiOperation({
    summary: 'CU7: Listar padrón docente con paginación de 15 filas y búsqueda',
  })
  @ApiQuery({ name: 'pagina', required: false, type: Number })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiQuery({ name: 'busqueda', required: false, type: String })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'todos', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Listado de docentes obtenido' })
  findAll(
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
    @Query('busqueda') busqueda?: string,
    @Query('activo') activo?: string,
    @Query('todos') todos?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;
    const todosBool = todos === 'true' || todos === '1';

    return this.docentesService.findAll({
      pagina: pagina ? Number(pagina) : 1,
      limite: limite ? Number(limite) : 15,
      busqueda,
      activo: activoBool,
      todos: todosBool,
    });
  }

  @Get('plantilla/excel')
  @ApiOperation({
    summary:
      'CU7: Descargar plantilla oficial en formato Excel (.xlsx) para importación',
  })
  descargarPlantilla(@Res() res: Response) {
    const buffer = this.docentesService.generarPlantillaExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_docentes_uagrm.xlsx"',
    );
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get('plantilla/estructura')
  @ApiOperation({
    summary:
      'CU7: Obtener estructura y columnas requeridas de la plantilla en JSON',
  })
  obtenerEstructuraPlantilla() {
    return this.docentesService.obtenerEstructuraPlantilla();
  }

  @Get(':codigo')
  @ApiOperation({ summary: 'CU7: Obtener detalle de docente por su código' })
  findOne(@Param('codigo') codigo: string) {
    return this.docentesService.findOne(codigo);
  }

  @Post()
  @ApiOperation({ summary: 'CU7: Registrar docente individual' })
  @ApiResponse({ status: 201, description: 'Docente registrado exitosamente' })
  crear(
    @Body() dto: CrearDocenteDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.docentesService.crear(dto, ejecutor, ip);
  }

  @Put(':codigo')
  @ApiOperation({ summary: 'CU7: Actualizar información de un docente' })
  actualizar(
    @Param('codigo') codigo: string,
    @Body() dto: ActualizarDocenteDto,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.docentesService.actualizar(codigo, dto, ejecutor, ip);
  }

  @Patch(':codigo/estado')
  @ApiOperation({
    summary: 'CU7: Cambiar estado activo/inactivo de un docente',
  })
  cambiarEstado(
    @Param('codigo') codigo: string,
    @Body('activo') activo: boolean,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.docentesService.cambiarEstado(codigo, activo, ejecutor, ip);
  }

  @Delete(':codigo')
  @ApiOperation({ summary: 'CU7: Desactivar docente del padrón' })
  eliminar(
    @Param('codigo') codigo: string,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    return this.docentesService.eliminar(codigo, ejecutor, ip);
  }

  @Post('importar-excel')
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiOperation({
    summary:
      'CU7: Carga masiva y atómica de padrón docente vía Excel (.xlsx, .xls) o CSV',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        archivo: {
          type: 'string',
          format: 'binary',
          description:
            'Libro de Excel (.xlsx, .xls) o archivo .csv con columnas: codigo, nombres, apellidos, correo',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Docentes importados exitosamente' })
  async importarExcel(
    @UploadedFile() archivo: Express.Multer.File,
    @CurrentUser() ejecutor: any,
    @Ip() ip: string,
  ) {
    if (!archivo) {
      throw new BadRequestException(
        'Debe seleccionar un archivo para importar (campo "archivo")',
      );
    }

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const originalNameLower = archivo.originalname.toLowerCase();
    const isValidExtension = validExtensions.some((ext) =>
      originalNameLower.endsWith(ext),
    );

    if (!isValidExtension) {
      throw new BadRequestException(
        'Solo se admiten libros de Excel (.xlsx, .xls) o archivos delimitados .csv',
      );
    }

    return this.docentesService.importarExcel(
      archivo.buffer,
      archivo.originalname,
      ejecutor,
      ip,
    );
  }
}
