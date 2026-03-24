import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

interface MissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  step_index: number;
  completed_at: string;
}

// GET — Leer progreso de todas las misiones
export async function GET() {
  try {
    const data = await supabaseQuery<MissionProgress>('mission_progress', 'GET', {
      filter: 'user_id=eq.admin',
      order: 'mission_id.asc,step_index.asc',
    });
    // Agrupar por mission_id
    const grouped: Record<string, number[]> = {};
    for (const row of data) {
      if (!grouped[row.mission_id]) grouped[row.mission_id] = [];
      grouped[row.mission_id].push(row.step_index);
    }
    return Response.json(grouped);
  } catch {
    return Response.json({});
  }
}

// POST — Guardar o eliminar progreso de un paso
export async function POST(req: Request) {
  try {
    const { mission_id, step_index, completed } = await req.json();
    if (!mission_id || step_index === undefined) {
      return Response.json({ error: 'mission_id y step_index requeridos' }, { status: 400 });
    }

    if (completed) {
      await supabaseInsert('mission_progress', {
        user_id: 'admin',
        mission_id,
        step_index,
      });
    } else {
      // Eliminar progreso (desmarcar)
      await supabaseQuery('mission_progress', 'DELETE', {
        filter: `user_id=eq.admin&mission_id=eq.${mission_id}&step_index=eq.${step_index}`,
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
