export interface Notification {
  type: 'TRADE_EXECUTION' | 'ALERT' | 'ERROR' | 'INFO';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

export class NotificationService {
  private discordWebhooks: Map<string, string> = new Map();

  constructor() {
    // Initialize webhooks from environment
    if (process.env.DISCORD_WEBHOOK_URL_TRADING) {
      this.discordWebhooks.set('trading', process.env.DISCORD_WEBHOOK_URL_TRADING);
    }
    if (process.env.DISCORD_WEBHOOK_URL_ALERTS) {
      this.discordWebhooks.set('alerts', process.env.DISCORD_WEBHOOK_URL_ALERTS);
    }
    if (process.env.DISCORD_WEBHOOK_URL_ERRORS) {
      this.discordWebhooks.set('errors', process.env.DISCORD_WEBHOOK_URL_ERRORS);
    }
  }

  async sendTradeExecution(tradeData: {
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    orderId: string;
    confidence: number;
  }): Promise<void> {
    const notification: Notification = {
      type: 'TRADE_EXECUTION',
      title: `Trade Executed: ${tradeData.symbol}`,
      message: `${tradeData.action} ${tradeData.quantity} shares of ${tradeData.symbol} at $${tradeData.price}`,
      timestamp: new Date(),
      data: tradeData
    };

    await this.sendToDiscord('trading', this.formatTradeMessage(notification));
  }

  async sendAlert(alertData: {
    symbol: string;
    type: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }): Promise<void> {
    const notification: Notification = {
      type: 'ALERT',
      title: `Alert: ${alertData.symbol} - ${alertData.type}`,
      message: alertData.message,
      timestamp: new Date(),
      data: alertData
    };

    await this.sendToDiscord('alerts', this.formatAlertMessage(notification));
  }

  async sendError(errorData: {
    context: string;
    error: string;
    symbol?: string;
  }): Promise<void> {
    const notification: Notification = {
      type: 'ERROR',
      title: `Error in ${errorData.context}`,
      message: errorData.error,
      timestamp: new Date(),
      data: errorData
    };

    await this.sendToDiscord('errors', this.formatErrorMessage(notification));
  }

  private async sendToDiscord(webhookType: string, message: any): Promise<void> {
    const webhookUrl = this.discordWebhooks.get(webhookType);
    
    if (!webhookUrl) {
      console.warn(`No Discord webhook configured for ${webhookType}`);
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(`Failed to send Discord notification: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending Discord notification:', error);
    }
  }

  private formatTradeMessage(notification: Notification): any {
    const tradeData = notification.data;
    const color = tradeData.action === 'BUY' ? 3066993 : 15158332; // Green for buy, red for sell

    return {
      embeds: [{
        title: notification.title,
        description: notification.message,
        color: color,
        fields: [
          {
            name: 'Order ID',
            value: tradeData.orderId,
            inline: true
          },
          {
            name: 'Confidence',
            value: `${(tradeData.confidence * 100).toFixed(1)}%`,
            inline: true
          },
          {
            name: 'Timestamp',
            value: notification.timestamp.toISOString(),
            inline: true
          }
        ],
        timestamp: notification.timestamp.toISOString()
      }]
    };
  }

  private formatAlertMessage(notification: Notification): any {
    const alertData = notification.data;
    const color = this.getSeverityColor(alertData.severity);

    return {
      embeds: [{
        title: notification.title,
        description: notification.message,
        color: color,
        timestamp: notification.timestamp.toISOString()
      }]
    };
  }

  private formatErrorMessage(notification: Notification): any {
    const errorData = notification.data;

    return {
      embeds: [{
        title: notification.title,
        description: notification.message,
        color: 15158332, // Red for errors
        fields: errorData.symbol ? [
          {
            name: 'Symbol',
            value: errorData.symbol,
            inline: true
          }
        ] : [],
        timestamp: notification.timestamp.toISOString()
      }]
    };
  }

  private getSeverityColor(severity: string): number {
    switch (severity) {
      case 'HIGH': return 15158332; // Red
      case 'MEDIUM': return 16776960; // Yellow
      case 'LOW': return 3447003; // Blue
      default: return 10181046; // Gray
    }
  }
}
