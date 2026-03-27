-- Índice compuesto para queries de mensajes por debate ordenados por fecha
CREATE INDEX IF NOT EXISTS idx_debate_messages_debate_created
ON debate_messages(debate_id, created_at ASC);

-- Índice compuesto para queries de mensajes de hilo ordenados por fecha
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created
ON thread_messages(thread_id, created_at ASC);
