export type SendPayload = {
  from: string
  fromName?: string
  to: string
  subject: string
  html: string
  text?: string
}

export type SendResult = { messageId: string }

export interface EmailProviderAdapter {
  slug: string
  send(input: SendPayload): Promise<SendResult>
}

function encodeBase64(s: string): string {
  return btoa(s)
}

/** Minimal SMTPS (implicit TLS on 465) AUTH LOGIN sender for Hostinger. */
export async function sendViaSmtp(opts: {
  host: string
  port: number
  user: string
  pass: string
  from: string
  fromName?: string
  to: string
  subject: string
  html: string
  text?: string
}): Promise<SendResult> {
  const conn = await Deno.connectTls({ hostname: opts.host, port: opts.port })
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''

  async function read(): Promise<string> {
    const buf = new Uint8Array(4096)
    const n = await conn.read(buf)
    if (n === null) throw new Error('SMTP connection closed')
    buffer += decoder.decode(buf.subarray(0, n))
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    return lines.join('\n')
  }

  async function expect(code: string) {
    const line = await read()
    if (!line.includes(code)) {
      throw new Error(`SMTP expected ${code}, got: ${line}`)
    }
    return line
  }

  async function cmd(line: string, code: string) {
    await conn.write(encoder.encode(line + '\r\n'))
    return expect(code)
  }

  try {
    await expect('220')
    await cmd(`EHLO xcomerce.com.br`, '250')
    await cmd('AUTH LOGIN', '334')
    await cmd(encodeBase64(opts.user), '334')
    await cmd(encodeBase64(opts.pass), '235')
    await cmd(`MAIL FROM:<${opts.from}>`, '250')
    await cmd(`RCPT TO:<${opts.to}>`, '250')
    await cmd('DATA', '354')

    const fromHeader = opts.fromName
      ? `"${opts.fromName.replace(/"/g, '')}" <${opts.from}>`
      : opts.from
    const boundary = `b${crypto.randomUUID().replace(/-/g, '')}`
    const text = opts.text ?? opts.html.replace(/<[^>]+>/g, ' ')
    const data = [
      `From: ${fromHeader}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      text,
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      opts.html,
      `--${boundary}--`,
      '.',
    ].join('\r\n')

    await conn.write(encoder.encode(data + '\r\n'))
    await expect('250')
    await cmd('QUIT', '221')
    return { messageId: `smtp-${crypto.randomUUID()}` }
  } finally {
    try {
      conn.close()
    } catch {
      /* ignore */
    }
  }
}

export function createHostingerAdapter(config: {
  host: string
  port: number
  from_email?: string
  from_name?: string
}): EmailProviderAdapter {
  return {
    slug: 'hostinger_smtp',
    async send(input) {
      const user = Deno.env.get('SMTP_USER')
      const pass = Deno.env.get('SMTP_PASS')
      if (!user || !pass) {
        throw new Error('SMTP_USER/SMTP_PASS não configurados')
      }
      const from = Deno.env.get('EMAIL_FROM') || config.from_email || input.from
      return sendViaSmtp({
        host: config.host || Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com',
        port: Number(config.port || Deno.env.get('SMTP_PORT') || 465),
        user,
        pass,
        from,
        fromName: config.from_name,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      })
    },
  }
}

export function createResendAdapter(): EmailProviderAdapter {
  return {
    slug: 'resend',
    async send(input) {
      const key = Deno.env.get('RESEND_API_KEY')
      if (!key) throw new Error('RESEND_API_KEY não configurada')
      const from = Deno.env.get('EMAIL_FROM') || input.from
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: input.fromName ? `${input.fromName} <${from}>` : from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      })
      if (!res.ok) {
        throw new Error(`Resend failed: ${await res.text()}`)
      }
      const data = await res.json()
      return { messageId: String(data.id ?? crypto.randomUUID()) }
    },
  }
}

export function createBrevoStub(): EmailProviderAdapter {
  return {
    slug: 'brevo',
    async send() {
      throw new Error('PROVIDER_NOT_IMPLEMENTED: Brevo será integrado na fase 2')
    },
  }
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

export function renderTemplateString(
  template: string,
  data: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const val = data[key]
    return val == null ? '' : String(val)
  })
}
