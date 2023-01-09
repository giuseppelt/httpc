
export type EmailRecipient = string | Readonly<{
    name?: string
    email: string
}>

export type SendEmailParams = {
    subject: string
    from?: EmailRecipient
    to: EmailRecipient | EmailRecipient[]
    cc?: EmailRecipient | EmailRecipient[]
    bcc?: EmailRecipient | EmailRecipient[]
    bodyHtml?: string
    bodyText?: string
}

export interface IEmailSender {
    send(params: SendEmailParams): Promise<void>
}
