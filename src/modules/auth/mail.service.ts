import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async enviarEnlaceRecuperacion(
    correoDestino: string,
    token: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const enlace = `${frontendUrl}/recuperar-password?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background-color: #002855; padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.05em; }
          .header p { margin: 4px 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.8); }
          .content { padding: 30px 24px; }
          .greeting { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
          .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #a81124; color: #ffffff !important; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 6px; display: inline-block; }
          .notice { background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #991b1b; margin-bottom: 24px; }
          .footer { background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CITEF · FCEE</h1>
            <p>Facultad de Ciencias Económicas y Empresariales · UAGRM</p>
          </div>
          <div class="content">
            <p class="greeting">Estimado(a) usuario(a),</p>
            <p class="text">
              Hemos recibido una solicitud para restablecer la contraseña de su cuenta en la plataforma del 
              <strong>Centro de Información y Tecnología (CITEF)</strong>.
            </p>
            <div class="btn-container">
              <a href="${enlace}" class="btn" target="_blank">Restablecer mi Contraseña</a>
            </div>
            <div class="notice">
              <strong>Importante:</strong> Este enlace tiene una validez estricta de <strong>15 minutos</strong>. Transcurrido dicho tiempo, el token expirará automáticamente por motivos de seguridad.
            </div>
            <p class="text" style="font-size: 12px; color: #94a3b8;">
              Si el botón superior no funciona, copie y pegue el siguiente enlace en su navegador:<br>
              <a href="${enlace}" style="color: #002855;">${enlace}</a>
            </p>
          </div>
          <div class="footer">
            Universidad Autónoma Gabriel René Moreno · Santa Cruz de la Sierra, Bolivia
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Servicio Principal: Brevo REST API (HTTPS sin dependencias SMTP ni Nodemailer)
    const brevoApiKey = (
      this.configService.get<string>('BREVO_API_KEY') || ''
    ).trim();
    const brevoSenderEmail = (
      this.configService.get<string>('BREVO_SENDER_EMAIL') ||
      this.configService.get<string>('MAIL_FROM') ||
      ''
    ).trim();
    const brevoSenderName = (
      this.configService.get<string>('BREVO_SENDER_NAME') || 'CITEF FCEE UAGRM'
    ).trim();

    if (brevoApiKey && brevoSenderEmail) {
      if (brevoApiKey.startsWith('xsmtpsib-')) {
        this.logger.warn(
          `[BREVO AVISO DE CLAVE] Ha configurado una clave SMTP (${brevoApiKey.substring(0, 15)}...). ` +
            `Para la API REST de Brevo debe usar una Clave API que comienza con "xkeysib-...". ` +
            `Genérela en https://app.brevo.com/settings/keys/api en la pestaña "API Keys" (no en la pestaña "SMTP").`,
        );
      }

      try {
        this.logger.log(
          `[BREVO API] Despachando correo de recuperación hacia: ${correoDestino}...`,
        );

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: brevoSenderName,
              email: brevoSenderEmail,
            },
            to: [
              {
                email: correoDestino,
              },
            ],
            subject: 'Recuperación de Contraseña - CITEF FCEE UAGRM',
            htmlContent: htmlContent,
          }),
        });

        if (response.ok) {
          const resData: any = await response.json();
          this.logger.log(
            `========================================================================\n` +
              `[BREVO ÉXITO] Correo entregado al servidor de Brevo.\n` +
              `Message ID           : ${resData.messageId}\n` +
              `Remitente            : ${brevoSenderName} <${brevoSenderEmail}>\n` +
              `Destinatario         : ${correoDestino}\n` +
              `Enlace de Recuperación: ${enlace}\n` +
              `========================================================================`,
          );
          return true;
        } else {
          const errorBody = await response.text();
          this.logger.error(
            `[BREVO ERROR] Brevo API respondió (${response.status}): ${errorBody}`,
          );
        }
      } catch (err: any) {
        this.logger.error(
          `[BREVO ERROR] Fallo al invocar Brevo REST API: ${err.message}`,
        );
      }
    }

    // 2. Modo Local / Fallback Seguro (Registro en Consola para pruebas de desarrollo)
    this.logger.log(
      '========================================================================',
    );
    this.logger.log(
      `[MODO LOCAL / CONSOLA - RECUPERACIÓN DE CONTRASEÑA CITEF]`,
    );
    this.logger.log(`Destinatario : ${correoDestino}`);
    this.logger.log(`Enlace       : ${enlace}`);
    this.logger.log(`Validez      : 15 minutos (Token criptográfico SHA-256)`);
    if (!brevoApiKey || !brevoSenderEmail) {
      this.logger.log(
        `Nota         : Configure BREVO_API_KEY y BREVO_SENDER_EMAIL en .env para despacho real.`,
      );
    }
    this.logger.log(
      '========================================================================',
    );

    return true;
  }
}
