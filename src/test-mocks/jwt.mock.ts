export class JwtService {
  sign(payload: any, options?: any): string {
    return 'mocked_jwt_token';
  }
  verify(token: string): any {
    return { sub: 1, correo: 'admin@uagrm.edu.bo' };
  }
}
export class JwtModule {}
