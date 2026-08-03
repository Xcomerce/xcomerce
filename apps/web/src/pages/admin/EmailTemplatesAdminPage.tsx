import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Mail, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { useAuth } from '@/contexts/auth-context'
import {
  useEmailTemplates,
  useSendTemplateTest,
  useUpdateEmailTemplate,
} from '@/hooks/use-crm'
import type { EmailTemplateRow } from '@/services/crm'
import { translateSupabaseError } from '@/lib/errors'

export function EmailTemplatesAdminPage() {
  const { user } = useAuth()
  const templatesQ = useEmailTemplates()
  const updateTpl = useUpdateEmailTemplate()
  const sendTest = useSendTemplateTest()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [testTo, setTestTo] = useState(user?.email ?? '')

  const templates = templatesQ.data ?? []
  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0] ?? null,
    [templates, selectedId],
  )

  useEffect(() => {
    if (selected) {
      setSelectedId(selected.id)
      setSubject(selected.subject)
      setHtmlBody(selected.html_body)
      setIsActive(selected.is_active)
    }
  }, [selected?.id])

  useEffect(() => {
    if (user?.email && !testTo) setTestTo(user.email)
  }, [user?.email])

  function load(tpl: EmailTemplateRow) {
    setSelectedId(tpl.id)
    setSubject(tpl.subject)
    setHtmlBody(tpl.html_body)
    setIsActive(tpl.is_active)
  }

  async function save() {
    if (!selected) return
    try {
      await updateTpl.mutateAsync({
        id: selected.id,
        patch: { subject, html_body: htmlBody, is_active: isActive },
      })
      toast.success('Template salvo')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Erro'))
    }
  }

  async function sendTestEmail() {
    if (!selected || !testTo) return
    try {
      await sendTest.mutateAsync({ key: selected.key, to: testTo })
      toast.success('E-mail de teste enviado')
    } catch (err) {
      toast.error(translateSupabaseError(err instanceof Error ? err.message : 'Falha no teste'))
    }
  }

  if (templatesQ.isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-6">
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!templates.length) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-6">
        <EmptyState
          icon={Mail}
          title="Nenhum template"
          description="Rode a migration de e-mail para popular os templates."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 lg:p-6">
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 py-3">
            <CardTitle className="text-sm">Lista</CardTitle>
          </CardHeader>
          <CardContent className="scrollbar-custom min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => load(tpl)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selected?.id === tpl.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
              >
                <p className="font-medium">{tpl.name}</p>
                <p className="truncate text-xs text-muted-foreground">{tpl.key}</p>
                <div className="mt-1 flex gap-1">
                  <Badge className="text-[10px]">{tpl.category}</Badge>
                  {!tpl.is_active ? (
                    <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-800">
                      inativo
                    </Badge>
                  ) : null}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected ? (
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <CardHeader className="shrink-0 space-y-1">
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">{selected.key}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {(selected.variables ?? []).map((v) => (
                  <Badge key={v} className="cursor-default font-mono text-[10px]">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="scrollbar-custom flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">HTML</label>
                <textarea
                  className="min-h-[240px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                  value={htmlBody}
                  onChange={(e) => setHtmlBody(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Ativo
              </label>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
                <iframe
                  title="preview"
                  sandbox=""
                  className="h-48 w-full rounded border bg-white"
                  srcDoc={htmlBody}
                />
              </div>
            </CardContent>
            <div className="flex shrink-0 flex-wrap items-end gap-2 border-t px-6 py-4">
              <Button onClick={save} disabled={updateTpl.isPending}>
                <Save className="mr-1 h-4 w-4" />
                Salvar
              </Button>
              <div className="flex min-w-[200px] flex-1 flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Enviar teste para</label>
                  <Input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={sendTestEmail}
                  disabled={sendTest.isPending || !testTo}
                >
                  <Send className="mr-1 h-4 w-4" />
                  Testar
                </Button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
