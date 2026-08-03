import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { unsubscribeByToken } from '@/services/crm'

export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('Processando…')

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) {
        setStatus('error')
        setMessage('Link inválido: token ausente.')
        return
      }
      try {
        await unsubscribeByToken(token)
        if (!cancelled) {
          setStatus('ok')
          setMessage('Você não receberá mais e-mails comerciais da XCOMERCE.')
        }
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage('Não foi possível cancelar. O link pode estar inválido.')
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display">Cancelar e-mails</CardTitle>
          <CardDescription>
            {status === 'loading' ? 'Confirmando sua solicitação…' : message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'loading' ? (
            <Button asChild variant="outline">
              <Link to="/">Voltar ao início</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
