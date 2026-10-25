import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws/ocupacion',
})
export class OcupacionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OcupacionGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Cliente WebSocket conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente WebSocket desconectado: ${client.id}`);
  }

  @SubscribeMessage('suscribir_sala')
  handleSuscribirSala(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id_sala: number },
  ) {
    if (data && data.id_sala) {
      const room = `sala_${data.id_sala}`;
      client.join(room);
      this.logger.log(`Cliente ${client.id} suscrito a ${room}`);
      return { status: 'ok', room };
    }
  }

  @SubscribeMessage('desuscribir_sala')
  handleDesuscribirSala(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id_sala: number },
  ) {
    if (data && data.id_sala) {
      const room = `sala_${data.id_sala}`;
      client.leave(room);
      this.logger.log(`Cliente ${client.id} desuscrito de ${room}`);
      return { status: 'ok', room };
    }
  }

  /**
   * Emite una actualización en tiempo real de la sala a todos los observadores conectados
   */
  emitirActualizacionSala(id_sala: number, payload: any) {
    if (this.server) {
      const room = `sala_${id_sala}`;
      this.server.to(room).emit('estado_sala_actualizado', payload);
      this.server.emit('sala_resumen_actualizado', {
        id_sala,
        timestamp: new Date(),
      });
    }
  }
}
