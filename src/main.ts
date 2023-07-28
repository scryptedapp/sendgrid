import { MailService } from '@sendgrid/mail';
import { MailDataRequired } from "@sendgrid/helpers/classes/mail";
import { EmailData } from "@sendgrid/helpers/classes/email-address";

import { MediaObject, Notifier, NotifierOptions, Settings, ScryptedDeviceBase, Setting, SettingValue } from '@scrypted/sdk';
import sdk from '@scrypted/sdk';

const { mediaManager } = sdk;

class SendGridProvider extends ScryptedDeviceBase implements Notifier, Settings {
    sendgridClient: MailService | null

    constructor(nativeId?: string) {
        super(nativeId);
        this.initializeSendGrid();
    }

    to(): string | null {
        return this.storage.getItem('to')
    }

    from(): string | null {
        return this.storage.getItem('from')
    }

    apikey(): string | null {
        return this.storage.getItem('apikey')
    }

    initializeSendGrid(): void {
        const to = this.to();
        const from = this.from();
        const apikey = this.apikey();

        if (!to || !from || !apikey) {
            this.sendgridClient = null;
            return
        }

        this.sendgridClient = new MailService();
        this.sendgridClient.setApiKey(apikey);
        this.console.info('Initialized new SendGrid client')
    }

    async getSettings(): Promise<Setting[]> {
        return [
            {
                title: 'To',
                key: 'to',
                description: 'Recipient of emails created by this plugin.',
                value: this.storage.getItem('to')
            },
            {
                title: 'From',
                key: 'from',
                description: 'Sender address for of emails created by this plugin. Must be a verified sender in your Twilio SendGrid account.',
                value: this.storage.getItem('from')
            },
            {
                title: 'SendGrid API Key',
                key: 'apikey',
                value: this.storage.getItem('apikey'),
                type: 'password'
            }
        ]
    }

    async putSetting(key: string, value: SettingValue): Promise<void> {
        this.storage.setItem(key, '' + value);
        this.initializeSendGrid();
    }

    async sendNotification(title: string, options?: NotifierOptions, media?: string | MediaObject, icon?: string | MediaObject): Promise<void> {
        if (!this.sendgridClient) {
            this.console.warn('SendGrid client not initialized, cannot send notification');
            return;
        }

        this.console.info('Starting to send email');

        const body = options?.body || '';

        let attachments: any[] = [];
        if (typeof media === 'string') {
            media = await mediaManager.createMediaObjectFromUrl(media as string);
        }
        if (media) {
            let data: Buffer = await mediaManager.convertMediaObjectToBuffer(media as MediaObject, 'image/png');
            let b64PictureData: string = data.toString('base64');
            attachments = [
                {
                    content: b64PictureData,
                    filename: 'snapshot.png',
                    type: 'image/png',
                    disposition: 'attachment'
                }
            ]
        }

        let msg: MailDataRequired = {
            to: this.to() as EmailData,
            from: this.from() as EmailData,
            subject: title,
            html: body,
            attachments: attachments
        }

        await this.sendgridClient.send(msg);
        this.console.info(`Email sent to ${this.to()}`)
    }
};

const provider = new SendGridProvider();

export default provider;
