import { supabase } from './supabase';

const BUCKET = 'avsec-imagens';

export async function uploadImagem(file: File, pasta: string = 'ocorrencias'): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${pasta}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return publicUrl;
}
