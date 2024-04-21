import { createClient } from '@supabase/supabase-js'
import { Server } from 'socket.io'
import eiows from 'eiows'
import { createServer } from 'http'
import Koa from 'koa'
import cors from '@koa/cors'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
)

const handleInserts = async (payload: any) => {
  try {
    const changesEnv = payload?.new?.activated
    const projectId = payload?.new?.project_id

    const { data } = await supabase
      .from('projects')
      .select('name,integration_key')
      .eq('id', projectId)
      .single()

    if (data?.integration_key) {
      io.emit(
        data?.integration_key,
        JSON.stringify({ name: payload?.new?.name, changesEnv })
      )
    }
  } catch (error) {
    console.log(error)
  }
}

supabase
  .channel('featureFlags')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'featureFlags' },
    handleInserts
  )
  .subscribe()

const app = new Koa()
app.use(cors())
const httpServer = createServer(app.callback())
const io = new Server(httpServer, {
  wsEngine: eiows.Server,
  cors: { origin: '*' }
})

io.on('connection', socket => {
  console.log(socket.id)
})

httpServer.listen(PORT)
