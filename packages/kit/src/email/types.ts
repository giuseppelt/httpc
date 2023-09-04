
export type EmailRecipient = string | Readonly<{
    name?: string
    email: string
}>

export type EmailMessage = {
    from: EmailRecipient
    to: EmailRecipient | EmailRecipient[]
    cc?: EmailRecipient | EmailRecipient[]
    bcc?: EmailRecipient | EmailRecipient[]
    subject?: string
    bodyHtml?: string
    bodyText?: string
}

export interface IEmailSender {
    send(params: EmailMessage): Promise<void>
}
