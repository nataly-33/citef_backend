import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISOS_KEY } from '../decorators/permisos.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermisos = this.reflector.getAllAndOverride<string[]>(
      PERMISOS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no especifica ni roles ni permisos, permitir acceso
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermisos || requiredPermisos.length === 0)
    ) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Acceso denegado: Usuario no autenticado');
    }

    const roles: string[] = user.roles || [];
    const permisos: string[] = user.permisos || [];

    // El rol ADMINISTRADOR siempre tiene acceso irrestricto
    if (roles.includes('ADMINISTRADOR')) {
      return true;
    }

    // Verificar permisos específicos si están definidos
    if (requiredPermisos && requiredPermisos.length > 0) {
      const hasPermiso = requiredPermisos.some((p) => permisos.includes(p));
      if (hasPermiso) {
        return true;
      }
    }

    // Verificar roles específicos si están definidos
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = roles.some((role: string) =>
        requiredRoles.includes(role),
      );
      if (hasRole) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Acceso denegado: No cuenta con los permisos o roles necesarios para realizar esta acción',
    );
  }
}
