import { Inject } from '@nestjs/common';

export const getRepositoryToken = (entity: any) =>
  typeof entity === 'function'
    ? `${entity.name}Repository`
    : `${entity}Repository`;

export const InjectRepository = (entity: any) =>
  Inject(getRepositoryToken(entity));

export class TypeOrmModule {}
export class Repository<T> {}
export class MoreThan {}
