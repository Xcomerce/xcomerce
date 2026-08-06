import { z } from 'zod'
import { normalizeWhatsApp } from '../constants/support-contact'

export const supportContactSettingsSchema = z
  .object({
    email: z.string().trim(),
    whatsapp: z.string().trim(),
    horario: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    const email = data.email.length > 0 ? data.email : null
    if (email && !z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe um e-mail válido',
        path: ['email'],
      })
    }

    const whatsapp = normalizeWhatsApp(data.whatsapp)
    if (whatsapp && !/^\d{10,15}$/.test(whatsapp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe um WhatsApp válido (10 a 15 dígitos)',
        path: ['whatsapp'],
      })
    }

    if (data.horario.length > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Horário deve ter no máximo 200 caracteres',
        path: ['horario'],
      })
    }
  })
  .transform((data) => ({
    email: data.email.trim() || null,
    whatsapp: normalizeWhatsApp(data.whatsapp),
    horario: data.horario.trim() || null,
  }))

export type SupportContactSettingsInput = z.input<typeof supportContactSettingsSchema>
export type SupportContactSettingsParsed = z.output<typeof supportContactSettingsSchema>
