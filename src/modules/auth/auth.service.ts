import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TokenRecuperacion } from '../usuarios/entities/token-recuperacion.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { LoginDto } from './dto/login.dto';
import { SolicitarRecuperacionDto } from './dto/solicitar-recuperacion.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(TokenRecuperacion)
    private readonly tokenRepo: Repository<TokenRecuperacion>,
    private readonly jwtService: JwtService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async login(loginDto: LoginDto, ipCliente?: string) {
    const { correo, password } = loginDto;

    const usuario = await this.usuarioRepo.findOne({
      where: { correo_institucional: correo.trim().toLowerCase() },
      relations: { roles: { permisos: true } },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException(
        'La cuenta de usuario se encuentra desactivada',
      );
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const rolesNombres = (usuario.roles || []).map((r) => r.nombre);
    const permisosSet = new Set<string>();
    (usuario.roles || []).forEach((r) => {
      (r.permisos || []).forEach((p) => permisosSet.add(p.codigo));
    });

    const payload = {
      sub: usuario.id_usuario,
      correo: usuario.correo_institucional,
      nombres: `${usuario.nombres} ${usuario.apellidos}`,
      roles: rolesNombres,
    };

    const accessToken = this.jwtService.sign(payload);

    // Registro en bitácora de auditoría
    await this.auditoriaService.registrar({
      id_usuario: usuario.id_usuario,
      correo_usuario: usuario.correo_institucional,
      accion: 'LOGIN',
      tabla_afectada: 'usuario',
      id_registro_afectado: String(usuario.id_usuario),
      valores_nuevos: { ip: ipCliente, roles: rolesNombres },
      ip_cliente: ipCliente,
    });

    return {
      access_token: accessToken,
      usuario: {
        id_usuario: usuario.id_usuario,
        correo_institucional: usuario.correo_institucional,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        roles: rolesNombres,
        permisos: Array.from(permisosSet),
      },
    };
  }

  async solicitarRecuperacion(dto: SolicitarRecuperacionDto, ipCliente?: string) {
    const correo = dto.correo.trim().toLowerCase();
    const usuario = await this.usuarioRepo.findOne({
      where: { correo_institucional: correo },
    });

    if (!usuario) {
      throw new NotFoundException(
        `No existe ningún usuario registrado con el correo ${correo}`,
      );
    }

    // Generar token criptográfico de 64 caracteres hex (32 bytes)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Validez de 15 minutos (requisito CU2)
    const expiraEn = new Date(Date.now() + 15 * 60 * 1000);

    const tokenEntity = this.tokenRepo.create({
      id_usuario: usuario.id_usuario,
      token_hash: tokenHash,
      expira_en: expiraEn,
      utilizado: false,
    });

    await this.tokenRepo.save(tokenEntity);

    // Auditoría
    await this.auditoriaService.registrar({
      id_usuario: usuario.id_usuario,
      correo_usuario: usuario.correo_institucional,
      accion: 'SOLICITUD_RECUPERACION_PASSWORD',
      tabla_afectada: 'token_recuperacion',
      id_registro_afectado: String(tokenEntity.id_token),
      valores_nuevos: { expira_en: expiraEn.toISOString() },
      ip_cliente: ipCliente,
    });

    return {
      mensaje:
        'Se ha generado el token de recuperación de contraseña con validez de 15 minutos.',
      correo: usuario.correo_institucional,
      token: rawToken, // En desarrollo/evaluación se expone directamente para pruebas rápidas
      expira_en: expiraEn,
    };
  }

  async resetPassword(dto: ResetPasswordDto, ipCliente?: string) {
    const { token, nueva_password } = dto;
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const tokenRecup = await this.tokenRepo.findOne({
      where: {
        token_hash: tokenHash,
        utilizado: false,
        expira_en: MoreThan(new Date()),
      },
      relations: { usuario: true },
    });

    if (!tokenRecup || !tokenRecup.usuario) {
      throw new BadRequestException(
        'El token de recuperación es inválido o ha expirado (límite de 15 minutos superado).',
      );
    }

    // Hashear nueva contraseña
    const nuevoHash = await bcrypt.hash(nueva_password, 10);
    const idUsuario = tokenRecup.usuario.id_usuario;

    await this.usuarioRepo.update(idUsuario, {
      password_hash: nuevoHash,
    });

    // Marcar token como utilizado
    tokenRecup.utilizado = true;
    await this.tokenRepo.save(tokenRecup);

    // Auditoría
    await this.auditoriaService.registrar({
      id_usuario: idUsuario,
      correo_usuario: tokenRecup.usuario.correo_institucional,
      accion: 'RESET_PASSWORD',
      tabla_afectada: 'usuario',
      id_registro_afectado: String(idUsuario),
      valores_nuevos: { password_actualizado: true },
      ip_cliente: ipCliente,
    });

    return {
      mensaje: 'Contraseña restablecida exitosamente. Ahora puede iniciar sesión.',
    };
  }
}
