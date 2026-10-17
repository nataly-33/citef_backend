import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SolicitarRecuperacionDto } from './dto/solicitar-recuperacion.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Autenticación y Sesión')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión en la plataforma CITEF',
    description: 'Valida correo institucional y contraseña, genera JWT y audita el evento.',
  })
  @ApiResponse({ status: 200, description: 'Inicio de sesión exitoso, retorna token JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o cuenta inactiva' })
  async login(@Body() loginDto: LoginDto, @Ip() ip: string) {
    return this.authService.login(loginDto, ip);
  }

  @Post('recuperar-password')
  @ApiOperation({
    summary: 'CU2: Solicitar token para restablecer contraseña',
    description: 'Genera un token criptográfico seguro con validez de 15 minutos para recuperación.',
  })
  @ApiResponse({ status: 200, description: 'Token de recuperación generado' })
  @ApiResponse({ status: 404, description: 'Correo no registrado' })
  async solicitarRecuperacion(
    @Body() dto: SolicitarRecuperacionDto,
    @Ip() ip: string,
  ) {
    return this.authService.solicitarRecuperacion(dto, ip);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'CU2: Restablecer contraseña mediante token de 15 min',
    description: 'Verifica el token hash no expirado y actualiza la contraseña encriptada.',
  })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    return this.authService.resetPassword(dto, ip);
  }

  @Get('perfil')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtener información del usuario autenticado actual',
  })
  @ApiResponse({ status: 200, description: 'Perfil de usuario y roles decodificados del JWT' })
  async getPerfil(@CurrentUser() user: any) {
    return user;
  }
}
