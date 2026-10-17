import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'super_secret_citef_key_2026_uagrm_fcee_security',
    });
  }

  async validate(payload: { sub: number; correo: string; roles: string[] }) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id_usuario: payload.sub },
      relations: { roles: { permisos: true } },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(
        'Usuario no encontrado o su cuenta está inactiva',
      );
    }

    return {
      id_usuario: usuario.id_usuario,
      correo: usuario.correo_institucional,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      roles: usuario.roles.map((r) => r.nombre),
      permisos: Array.from(
        new Set(
          usuario.roles.flatMap((r) => (r.permisos || []).map((p) => p.codigo)),
        ),
      ),
    };
  }
}
