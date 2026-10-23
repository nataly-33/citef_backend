import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws/reservas',
})
export class ReservasGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ReservasGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Cliente WebSocket Reservas conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente WebSocket Reservas desconectado: ${client.id}`);
  }

  /**
   * Emite señal en tiempo real a todos los clientes suscritos al calendario
   */
  emitirActualizacionReservas(data?: any) {
    try {
      if (this.server) {
        this.server.emit('reservas_actualizadas', data || { timestamp: new Date() });
        this.logger.log('Evento reservas_actualizadas emitido vía WebSocket');
      }
    } catch (err) {
      this.logger.warn(`No se pudo emitir evento WebSocket reservas: ${err}`);
    }
  }

  /**
   * Alias de emisión general
   */
  emitirActualizacion(data?: any) {
    this.emitirActualizacionReservas(data);
  }
}
